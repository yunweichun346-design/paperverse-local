"""手工确认元数据后入库；不联网、不猜测PDF书目信息。"""
import json
import re
import unicodedata
from 安全落盘 import safe, digest, encoded, commit, recover
from 文件存储 import NotesStore, StorageError
from 全文存储 import read_body

FIELDS = {'title': 2000, 'authors': 2000, 'journal': 500, 'doi': 500}


def normalize(data):
    if not isinstance(data, dict) or set(data) - (set(FIELDS) | {'year'}):
        raise ValueError('仅支持题目、作者、期刊、年份和DOI')
    row = {}
    for key, limit in FIELDS.items():
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 for c in value):
            raise ValueError('文字字段无效或过长')
        row[key] = value.strip()
    if not row['title']:
        raise ValueError('请填写论文题目')
    year = data.get('year', '')
    if type(year) not in (str, int) or (year != '' and not re.fullmatch(r'\d{4}', str(year))):
        raise ValueError('年份请填四位数字或留空')
    row['year'] = int(year) if year != '' else None
    doi = re.sub(r'^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)', '', row['doi'], flags=re.I).lower()
    if doi and not re.fullmatch(r'10\.\d{4,9}/[^\s<>"\\]+', doi):
        raise ValueError('DOI格式无效；不确定时请留空')
    row['doi'] = doi
    return row


def add_paper(root, data):
    record = normalize(data)
    identity = '|'.join(unicodedata.normalize('NFKC', str(record[k] or '')).casefold() for k in ('title', 'authors', 'year'))
    stable_id = 'doi:' + record['doi'] if record['doi'] else 'local:' + digest(identity.encode('utf-8'))
    folder = digest(stable_id.encode('utf-8'))
    with NotesStore(root)._locked():
        recover(root)
        directory = json.loads(safe(root, '资料目录.json').read_text('utf-8'))
        for item in directory['papers']:
            if item['stable_id'] == stable_id:
                meta = json.loads(safe(root, f'papers/{item["folder"]}/meta.json').read_text('utf-8'))
                return {'created': False, 'paper': meta['source_record'], 'route': item['folder']}
        record.update(stable_id=stable_id, id=stable_id, aliases=[], source_url=('https://doi.org/'+record['doi']) if record['doi'] else '',
                      ai_status='未核读', reading_depth='用户手工录入元数据，未核读正文', region_scope='待核')
        meta = {**record, 'source_record': record, 'pdf': None, 'extraction': {'status': 'no_pdf', 'ocr': False}}
        directory['papers'].append({'stable_id': stable_id, 'folder': folder})
        directory['routes'][folder] = folder
        commit(root, {f'papers/{folder}/meta.json': encoded(meta), '资料目录.json': encoded(directory)})
        return {'created': True, 'paper': record, 'route': folder}


def handle_import(handler):
    try:
        data = json.loads(read_body(handler, 16 * 1024, 'application/json'))
        result = add_paper(handler.server.root, data)
        handler._json(201 if result['created'] else 200, result)
    except (ValueError, UnicodeError) as exc:
        handler._json(400, {'error': str(exc)})
    except (OSError, StorageError):
        handler._json(500, {'error': '入库未确认，请重试；相同DOI或题目/作者/年份不会重复创建'})
