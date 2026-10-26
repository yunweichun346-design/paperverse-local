"""可重建的SQLite目录索引；全文索引由全文检索模块维护。"""
import json
import sqlite3

from 安全落盘 import safe


def connect(root):
    path = safe(root, "library.db")
    for suffix in ("-wal", "-shm", "-journal"):
        safe(root, "library.db" + suffix)
    db = sqlite3.connect(path, timeout=10)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=FULL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS papers (
          id TEXT PRIMARY KEY, stable_id TEXT UNIQUE NOT NULL, meta_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS notes (key TEXT PRIMARY KEY, file TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    """)
    return db


def refresh_notes(root, notes, revision):
    from 安全落盘 import digest
    db = connect(root)
    try:
        with db:
            db.execute("DELETE FROM notes")
            db.executemany("INSERT INTO notes VALUES (?,?)", [
                (key, "notes/" + digest(key.encode("utf-8")) + ".md") for key in notes])
            db.execute("INSERT OR REPLACE INTO state VALUES ('notes_revision',?)", (revision,))
    finally:
        db.close()


def rebuild(root):
    directory = json.loads(safe(root, "资料目录.json").read_text(encoding="utf-8"))
    db = connect(root)
    try:
        with db:
            db.execute("DELETE FROM papers")
            for item in directory["papers"]:
                meta = json.loads(safe(root, f'papers/{item["folder"]}/meta.json').read_text(encoding="utf-8"))
                db.execute("INSERT INTO papers VALUES (?,?,?)", (item["folder"], meta["stable_id"], json.dumps(meta, ensure_ascii=False)))
        from 标准笔记 import MarkdownNotesStore
        notes = MarkdownNotesStore(root).load()
        refresh_notes(root, notes["notes"], notes["revision"])
    finally:
        db.close()
