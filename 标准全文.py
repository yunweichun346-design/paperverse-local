"""沿用全文HTTP接口，PDF与文字层保存到标准文献目录。"""
import json
import re
from urllib.parse import unquote

from 安全落盘 import safe, digest, encoded, commit, recover
from 文件存储 import NotesStore, NotesConflict, StorageError
from 全文存储 import ROUTE, MAX_PDF, read_body, validate_annotations
from 文本提取 import extract


def location(root, key):
    directory = json.loads(safe(root, "资料目录.json").read_text("utf-8"))
    folder = directory["routes"].get(key)
    if folder is None:
        return None
    if not re.fullmatch(r"[a-f0-9]{64}", folder):
        raise StorageError("文献目录标识异常")
    return "papers/" + folder


def upload(root, base, key, raw, name):
    if not name or len(name) > 240 or any(ord(c) < 32 for c in name):
        raise ValueError("文件名无效")
    fingerprint = digest(raw)
    lock = NotesStore(root)
    with lock._locked():
        recover(root)
        meta = json.loads(safe(root, base + "/meta.json").read_text("utf-8"))
        if meta["pdf"] and meta["pdf"]["fingerprint"] == fingerprint:
            if digest(safe(root, base + "/paper.pdf").read_bytes()) != fingerprint:
                raise StorageError("原PDF校验失败，停止覆盖")
            return meta["pdf"]
    # 耗时解析不占用笔记锁，提交前重新读取最新状态。
    text, extraction = extract(raw)
    with lock._locked():
        recover(root)
        meta = json.loads(safe(root, base + "/meta.json").read_text("utf-8"))
        writes = {}
        if meta["pdf"] and meta["pdf"]["fingerprint"] == fingerprint:
            return meta["pdf"]
        if meta["pdf"]:
            old = meta["pdf"]["fingerprint"]
            for name_part in ("paper.pdf", "text.md", "批注.json"):
                source = safe(root, base + "/" + name_part)
                if source.exists():
                    writes[f"{base}/历史全文/{old}/{name_part}"] = source.read_bytes()
        link = {"fingerprint": fingerprint, "name": name, "size": len(raw),
                "url": f"/api/fulltext/{key}/{fingerprint}/pdf"}
        previous = safe(root, f"{base}/历史全文/{fingerprint}/批注.json")
        annotations = previous.read_bytes() if previous.exists() else encoded({"revision": 0, "notes": {}})
        meta.update(pdf=link, extraction=extraction)
        writes.update({base + "/paper.pdf": raw, base + "/text.md": text.encode("utf-8"),
                       base + "/批注.json": annotations, base + "/meta.json": encoded(meta)})
        commit(root, writes)
        from 资料索引 import connect
        db = connect(root)
        try:
            with db:
                db.execute("UPDATE papers SET meta_json=? WHERE id=?", (json.dumps(meta, ensure_ascii=False), base.split("/")[1]))
        finally:
            db.close()
        return link


def handle_standard_fulltext(handler):
    match = ROUTE.fullmatch(handler._path())
    if not match:
        handler._json(404, {"error": "全文接口不存在"})
        return
    key, fingerprint, kind = match.groups()
    root = handler.server.root
    try:
        base = location(root, key)
        if base is None:
            handler._json(404, {"error": "文献标识不存在"})
            return
        if not fingerprint and handler.command == "POST":
            raw = read_body(handler, MAX_PDF, "application/pdf")
            name = unquote(handler.headers.get("X-File-Name", "论文原文.pdf"))
            handler._json(200, upload(root, base, key, raw, name))
            return
        with NotesStore(root)._locked():
            recover(root)
            meta = json.loads(safe(root, base + "/meta.json").read_text("utf-8"))
            if not fingerprint and handler.command in {"GET", "HEAD"}:
                handler._json(200, meta["pdf"] or {})
                return
            if fingerprint:
                current = meta["pdf"] and fingerprint == meta["pdf"]["fingerprint"]
                relative = base if current else base + "/历史全文/" + fingerprint
                pdf = safe(root, relative + "/paper.pdf")
                if not pdf.is_file():
                    handler._json(404, {"error": "未找到这份全文"})
                    return
                if kind == "pdf" and handler.command in {"GET", "HEAD"}:
                    handler._send_file(pdf, pdf.parent)
                    return
                path = safe(root, relative + "/批注.json")
                snapshot = json.loads(path.read_text("utf-8")) if path.exists() else {"revision": 0, "notes": {}}
                if kind == "annotations" and handler.command in {"GET", "HEAD"}:
                    handler._json(200, snapshot)
                    return
                if kind == "annotations" and handler.command == "PUT":
                    data = json.loads(read_body(handler, 5 * 1024 * 1024, "application/json"))
                    if not isinstance(data, dict) or type(data.get("revision")) is not int:
                        raise ValueError("批注快照格式无效")
                    notes = validate_annotations(data.get("notes"))
                    if data["revision"] != snapshot["revision"]:
                        raise NotesConflict(snapshot)
                    updated = {"revision": snapshot["revision"] + 1, "notes": notes}
                    import uuid
                    history = f"notes/.history/批注_{uuid.uuid4().hex}.json"
                    commit(root, {history: encoded(snapshot), relative + "/批注.json": encoded(updated)})
                    handler._json(200, updated)
                    return
            handler._json(405, {"error": "不支持该操作"})
    except NotesConflict as exc:
        handler._json(409, {"error": "批注已更新，请核对保留的草稿", "current": exc.current})
    except (ValueError, UnicodeError):
        handler._json(400, {"error": "请求或PDF无效，未覆盖现有资料"})
    except (OSError, StorageError, KeyError):
        handler._json(500, {"error": "全文读写失败，原资料已保留"})
