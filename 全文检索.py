"""从标准文件重建FTS5 trigram索引；中文短词使用转义LIKE。"""
import argparse
import json
from pathlib import Path
import sqlite3
from urllib.parse import parse_qs, urlsplit

from 安全落盘 import safe, digest, encoded
from 标准笔记 import MarkdownNotesStore
from 资料索引 import connect
from 文件存储 import StorageError


def strings(value):
    if isinstance(value, dict):
        return " ".join(strings(v) for v in value.values())
    if isinstance(value, list):
        return " ".join(strings(v) for v in value)
    return "" if value is None else str(value)


def documents(root, notes):
    directory = json.loads(safe(root, "资料目录.json").read_text("utf-8"))
    records, owners = [], {}
    for item in directory["papers"]:
        base = "papers/" + item["folder"]
        meta = json.loads(safe(root, base + "/meta.json").read_text("utf-8"))
        source = meta["source_record"]
        record = {"stable_id": meta["stable_id"], "title": source.get("title_zh") or source.get("title") or meta["stable_id"],
                  "kind": "paper", "metadata": strings(source), "fulltext": "", "notes": ""}
        text = safe(root, base + "/text.md")
        if text.exists():
            record["fulltext"] = text.read_text("utf-8")
        records.append(record)
        for key in [meta["stable_id"], source.get("id"), source.get("doi"), source.get("source_url"),
                    source.get("fulltext_url"), *(source.get("aliases") or [])]:
            if key:
                owners.setdefault(key, set()).add(len(records) - 1)
    for key, note in notes.items():
        targets = owners.get(key, set())
        content = strings({k: note.get(k) for k in ("text", "questions")})
        if len(targets) == 1:
            records[next(iter(targets))]["notes"] += "\n" + content
        else:
            records.append({"stable_id": key, "title": "未关联笔记", "kind": "note",
                            "metadata": "", "fulltext": "", "notes": content})
    return records


def rebuild_search(root, force=False):
    if force:
        from 资料索引 import rebuild
        rebuild(root)
    # 当前本地资料量小，读取标准文件核对签名；只在变化时重建，避免过期索引。
    store = MarkdownNotesStore(root)
    with store._locked():
        records = documents(root, store._load()["notes"])
        signature = digest(encoded(records))
        db = connect(root)
        try:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS search_state (signature TEXT NOT NULL);
                CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
                  stable_id UNINDEXED, title UNINDEXED, kind UNINDEXED,
                  metadata, fulltext, notes, tokenize='trigram');
            """)
            previous = db.execute("SELECT signature FROM search_state").fetchone()
            if force or previous != (signature,):
                with db:
                    db.execute("DELETE FROM search_fts")
                    db.executemany("INSERT INTO search_fts VALUES (?,?,?,?,?,?)", [
                        tuple(r[k] for k in ("stable_id", "title", "kind", "metadata", "fulltext", "notes")) for r in records])
                    db.execute("DELETE FROM search_state")
                    db.execute("INSERT INTO search_state VALUES (?)", (signature,))
            return {"documents": len(records), "changed": force or previous != (signature,), "tokenizer": "trigram"}
        finally:
            db.close()


def snippet(row, terms):
    for field, label in (("notes", "笔记"), ("fulltext", "PDF文字层"), ("metadata", "文献记录")):
        value = row[field]
        positions = [value.lower().find(term.lower()) for term in terms]
        found = [p for p in positions if p >= 0]
        if found:
            start = max(0, min(found) - 45)
            return {"source": label, "snippet": ("…" if start else "") + value[start:start + 220] + ("…" if start + 220 < len(value) else "")}
    return {"source": "文献记录", "snippet": ""}


def search(root, query, limit=200, offset=0):
    if not isinstance(query, str) or len(query) > 200 or "\x00" in query:
        raise ValueError("关键词最长200字符，不能包含空字符")
    terms = query.strip().split()
    if len(terms) > 12 or not 1 <= limit <= 1000 or not 0 <= offset <= 100000:
        raise ValueError("检索参数超出限制")
    if not terms:
        return {"results": [], "total": 0, "query": query, "limit": limit, "offset": offset}
    rebuild_search(root)
    clauses, params = [], []
    long_terms = [term for term in terms if len(term) >= 3]
    if long_terms:
        clauses.append("search_fts MATCH ?")
        params.append(" AND ".join('"' + t.replace('"', '""') + '"' for t in long_terms))
    for term in terms:
        if len(term) < 3:
            clauses.append("(metadata || char(10) || fulltext || char(10) || notes) LIKE ? ESCAPE '\\'")
            params.append("%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%")
    db = connect(root)
    db.row_factory = sqlite3.Row
    try:
        where = " AND ".join(clauses)
        with db:
            db.execute("BEGIN")
            count = db.execute("SELECT count(*) FROM search_fts WHERE " + where, params).fetchone()[0]
            rows = db.execute("SELECT * FROM search_fts WHERE " + where + " ORDER BY stable_id LIMIT ? OFFSET ?", [*params, limit, offset]).fetchall()
        results = [{"stable_id": r["stable_id"], "title": r["title"], "kind": r["kind"], **snippet(r, terms)} for r in rows]
        return {"query": query, "total": count, "results": results, "limit": limit, "offset": offset}
    finally:
        db.close()


def handle_search(handler):
    try:
        if not safe(handler.server.root, "标准存储启用.json").exists():
            handler._json(503, {"error": "标准存储尚未启用，全文检索不可用"})
            return
        query = parse_qs(urlsplit(handler.path).query)
        result = search(handler.server.root, query.get("q", [""])[0],
                        int(query.get("limit", ["200"])[0]), int(query.get("offset", ["0"])[0]))
        handler._json(200, result)
    except (ValueError, UnicodeError):
        handler._json(400, {"error": "检索参数无效；最多200字符、12个空格分隔关键词"})
    except (OSError, StorageError, sqlite3.Error, KeyError):
        handler._json(503, {"error": "检索索引暂不可用；原始文献与笔记未修改，请重建索引"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--query")
    args = parser.parse_args()
    print(json.dumps(search(args.root, args.query) if args.query is not None else rebuild_search(args.root, force=args.rebuild), ensure_ascii=False))
