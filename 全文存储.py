"""按文献键与文件指纹保存不可变 PDF，批注独立版本控制。"""
import hashlib
import json
import math
from pathlib import Path
import re
from urllib.parse import unquote

from 文件存储 import NotesStore, NotesConflict, StorageError

MAX_PDF = 50 * 1024 * 1024
ROUTE = re.compile(r"/api/fulltext/([a-f0-9]{64})(?:/([a-f0-9]{64})/(pdf|annotations))?$")


def guarded_folder(root, *parts):
    current = Path(root)
    for part in ("全文与批注", *parts):
        current = current / part
        if current.is_symlink() or getattr(current, "is_junction", lambda: False)():
            raise StorageError("全文资料路径异常")
    if not current.resolve().is_relative_to(Path(root).resolve()):
        raise StorageError("全文资料超出工作台目录")
    current.mkdir(parents=True, exist_ok=True)
    return current


def document_store(root, key, fingerprint):
    combined = hashlib.sha256((key + fingerprint).encode("ascii")).hexdigest()
    folder = guarded_folder(root, "文档_" + combined)
    store = NotesStore(folder)
    store.path = folder / "原文批注.json"
    return store


def validate_annotations(notes):
    if not isinstance(notes, dict) or len(notes) > 5000:
        raise ValueError("批注须为对象，最多5000条")
    for key, note in notes.items():
        if not isinstance(key, str) or not re.fullmatch(r"[\w-]{1,100}", key):
            raise ValueError("批注标识无效")
        if not isinstance(note, dict) or set(note) - {"page", "quote", "text", "color", "rects", "created_at"}:
            raise ValueError("批注字段无效")
        if type(note.get("page")) is not int or not 1 <= note["page"] <= 10000:
            raise ValueError("批注页码无效")
        for field, maximum in (("quote", 20000), ("text", 10000), ("created_at", 60)):
            if not isinstance(note.get(field), str) or len(note[field]) > maximum:
                raise ValueError("批注文字无效或过长")
        if note.get("color") not in {"yellow", "green", "blue", "rose"}:
            raise ValueError("批注颜色无效")
        rects = note.get("rects")
        if not isinstance(rects, list) or not 1 <= len(rects) <= 300:
            raise ValueError("请选择一段原文，最多300个选区")
        for rect in rects:
            if (not isinstance(rect, list) or len(rect) != 4
                    or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in rect)
                    or rect[2] <= 0 or rect[3] <= 0
                    or rect[0] + rect[2] > 1.001 or rect[1] + rect[3] > 1.001):
                raise ValueError("批注位置超出页面")
    return notes


def read_body(handler, limit, content_type):
    if handler.headers.get_content_type() != content_type:
        raise ValueError("请求类型不匹配")
    length = handler.headers.get("Content-Length", "")
    if handler.headers.get("Transfer-Encoding") or not re.fullmatch(r"\d+", length):
        raise ValueError("请求缺少有效内容长度")
    if not 0 < int(length) <= limit:
        raise ValueError("文件或批注超过大小限制")
    raw = handler.rfile.read(int(length))
    if len(raw) != int(length):
        raise ValueError("请求内容不完整")
    return raw


def handle_fulltext(handler):
    if (handler.server.root / "标准存储启用.json").exists():
        from 标准全文 import handle_standard_fulltext
        return handle_standard_fulltext(handler)
    match = ROUTE.fullmatch(handler._path())
    if not match:
        handler._json(404, {"error": "全文接口不存在"})
        return
    key, fingerprint, kind = match.groups()
    try:
        folder = guarded_folder(handler.server.root, key)
        index = folder / "关联全文.json"
        lock = NotesStore(folder)
        if index.is_symlink():
            raise StorageError("全文索引路径异常")
        if fingerprint:
            store = document_store(handler.server.root, key, fingerprint)
            pdf = store.directory / "论文原文.pdf"
            if pdf.is_symlink() or not pdf.is_file():
                handler._json(404, {"error": "未找到这份全文"})
                return
            if kind == "pdf" and handler.command in {"GET", "HEAD"}:
                handler._send_file(pdf, store.directory)
            elif kind == "annotations" and handler.command in {"GET", "HEAD"}:
                handler._json(200, store.load())
            elif kind == "annotations" and handler.command == "PUT":
                data = json.loads(read_body(handler, 5 * 1024 * 1024, "application/json"))
                if not isinstance(data, dict):
                    raise ValueError("请求须为对象")
                notes = validate_annotations(data.get("notes"))
                handler._json(200, store.save(data.get("revision"), notes))
            else:
                handler._json(405, {"error": "不支持该操作"})
        elif handler.command in {"GET", "HEAD"}:
            with lock._locked():
                handler._json(200, json.loads(index.read_text(encoding="utf-8")) if index.exists() else {})
        elif handler.command == "POST":
            raw = read_body(handler, MAX_PDF, "application/pdf")
            if not raw.startswith(b"%PDF-"):
                raise ValueError("文件不是有效的PDF，请选择论文原文件")
            fingerprint = hashlib.sha256(raw).hexdigest()
            store = document_store(handler.server.root, key, fingerprint)
            filename = unquote(handler.headers.get("X-File-Name", "论文原文.pdf"))
            if not filename or len(filename) > 240 or any(ord(c) < 32 for c in filename):
                raise ValueError("文件名无效")
            data = {"fingerprint": fingerprint, "name": filename, "size": len(raw),
                    "url": f"/api/fulltext/{key}/{fingerprint}/pdf"}
            with lock._locked():
                pdf = store.directory / "论文原文.pdf"
                if not pdf.exists():
                    store._atomic_write(pdf, raw)
                lock._atomic_write(index, json.dumps(data, ensure_ascii=False).encode("utf-8"))
            handler._json(200, data)
        else:
            handler._json(405, {"error": "不支持该操作"})
    except NotesConflict as exc:
        handler._json(409, {"error": "批注已在其他窗口更新；已载入最新记录，请核对保留的草稿后再保存", "current": exc.current})
    except (ValueError, UnicodeError) as exc:
        handler._json(400, {"error": str(exc)})
    except (OSError, StorageError):
        handler._json(500, {"error": "全文或批注读写失败，原文件已保留"})
