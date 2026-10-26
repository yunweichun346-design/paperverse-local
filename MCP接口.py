"""仅供认证MCP进程使用的工具白名单；写入只走现有笔记存储。"""
import json
from MCP认证 import authorized
import MCP资料工具 as papers
from 文件存储 import NotesConflict, StorageError, utc_now
from 全文存储 import read_body
from 全文检索 import search

READERS = {name: getattr(papers, name) for name in (
    "list_papers", "get_paper", "get_paper_text", "get_citation", "export_bibtex")}


def dispatch(server, tool, args):
    if tool in READERS:
        return READERS[tool](server.root, **args)
    if tool == "search_papers":
        return search(server.root, **args)
    if tool not in {"get_reading_state", "list_notes", "add_note", "update_note", "delete_note"}:
        raise ValueError("工具不在允许清单中")
    current = server.store.load()
    if tool == "list_notes":
        offset = papers.integer(args.get("offset", 0), 0, 100000)
        limit = papers.integer(args.get("limit", 20), 1, 50)
        keys = sorted(current["notes"])
        return {"revision": current["revision"], "total": len(keys), "notes": [
            {"paper_id": k, "preview": str(current["notes"][k].get("text", ""))[:500]} for k in keys[offset:offset + limit]],
            "next_offset": offset + limit if offset + limit < len(keys) else None}
    paper_id = args["paper_id"]
    papers.metadata(server.root, paper_id)
    note = current["notes"].get(paper_id)
    if tool == "get_reading_state":
        return {"revision": current["revision"], "paper_id": paper_id, "note": note}
    revision = args.get("revision")
    if type(revision) is not int or revision < 0:
        raise ValueError("写笔记必须提供读取时的revision")
    if revision != current["revision"]:
        raise NotesConflict(current)
    if tool == "add_note" and note is not None:
        raise ValueError("笔记已存在，请读取后使用update_note，不能覆盖新增")
    if tool != "add_note" and note is None:
        raise ValueError("笔记不存在")
    updated = dict(current["notes"])
    if tool == "delete_note":
        del updated[paper_id]
    else:
        patch = args["note"]
        if not isinstance(patch, dict) or not patch or set(patch) - {"text", "questions", "star", "read_status"}:
            raise ValueError("笔记字段只允许text/questions/star/read_status")
        updated[paper_id] = {**(note or {}), **patch, "updated_at": utc_now()}
    saved = server.store.save(revision, updated)
    return {"revision": saved["revision"], "paper_id": paper_id, "note": saved["notes"].get(paper_id)}


def handle_mcp(handler):
    if not authorized(handler):
        handler._json(401, {"error": "MCP认证失败，请检查本机config.json后重启MCP客户端"})
        return
    try:
        body = json.loads(read_body(handler, 128 * 1024, "application/json"))
        if not isinstance(body, dict) or not isinstance(body.get("tool"), str) or not isinstance(body.get("args"), dict):
            raise ValueError("工具请求格式无效")
        handler._json(200, dispatch(handler.server, body["tool"], body["args"]))
    except NotesConflict as exc:
        handler._json(409, {"error": "笔记版本冲突，未覆盖；请重新读取并人工核对", "revision": exc.current["revision"]})
    except (ValueError, TypeError, KeyError):
        handler._json(400, {"error": "参数无效、文献/笔记不存在或操作状态不符；未执行覆盖"})
    except (OSError, StorageError):
        handler._json(503, {"error": "资料暂不可用；请检查本机服务，原资料保留"})
