"""Markdown为正文，索引保存revision；原HTTP快照与冲突语义不变。"""
import json
from pathlib import Path
import uuid

from 文件存储 import NotesStore, NotesConflict, StorageError, validate_notes, utc_now
from 安全落盘 import safe, digest, encoded, commit, recover


def note_bytes(key, note):
    fields = {k: v for k, v in note.items() if k != "text"}
    meta = {"format": 1, "key": key, "has_text": "text" in note, "fields": fields}
    return ("---\n" + json.dumps(meta, ensure_ascii=False, allow_nan=False) + "\n---\n"
            + note.get("text", "")).encode("utf-8")


def parse_note(raw):
    text = raw.decode("utf-8")
    if not text.startswith("---\n"):
        raise StorageError("笔记元数据缺失，原文已保留")
    header, body = text[4:].split("\n---\n", 1)
    meta = json.loads(header)
    if meta.get("format") != 1 or not isinstance(meta.get("key"), str):
        raise StorageError("笔记版本或标识无效")
    note = meta["fields"]
    if meta["has_text"]:
        note["text"] = body
    validate_notes({meta["key"]: note})
    return meta["key"], note


def note_plan(notes, revision):
    writes, entries = {}, {}
    for key, note in notes.items():
        name = digest(key.encode("utf-8")) + ".md"
        raw = note_bytes(key, note)
        writes["notes/" + name] = raw
        entries[key] = {"file": name, "sha256": digest(raw)}
    writes["notes/索引.json"] = encoded({"version": 1, "revision": revision, "entries": entries})
    return writes


class MarkdownNotesStore(NotesStore):
    def __init__(self, directory):
        super().__init__(directory)
        self.index = safe(self.directory, "notes/索引.json")

    def _load(self):
        recover(self.directory)
        try:
            index = json.loads(self.index.read_text(encoding="utf-8"))
            revision = index["revision"]
            if type(revision) is not int or revision < 0:
                raise ValueError("revision无效")
            notes = {}
            for key, item in index["entries"].items():
                expected = digest(key.encode("utf-8")) + ".md"
                if item["file"] != expected:
                    raise ValueError("笔记文件标识不一致")
                raw = safe(self.directory, "notes/" + expected).read_bytes()
                if digest(raw) != item["sha256"]:
                    raise StorageError("Markdown笔记被外部修改，已保留修改；请先保全该文件并核对历史快照，未自动覆盖")
                actual_key, note = parse_note(raw)
                if actual_key != key:
                    raise ValueError("笔记键不一致")
                notes[key] = note
            return {"revision": revision, "notes": validate_notes(notes)}
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise StorageError("标准笔记无法完整读取；已保留文件，请检查索引和历史") from exc

    def save(self, revision, notes):
        if type(revision) is not int or revision < 0:
            raise ValueError("revision须为非负整数")
        validated = validate_notes(notes)
        with self._locked():
            current = self._load()
            if revision != current["revision"]:
                raise NotesConflict(current)
            writes = note_plan(validated, revision + 1)
            batch = f"{revision:08d}_{uuid.uuid4().hex}"
            writes[f"notes/.history/{batch}/快照.json"] = encoded(current)
            moves = []
            for key, note in current["notes"].items():
                name = digest(key.encode("utf-8")) + ".md"
                if key not in validated:
                    moves.append(("notes/" + name, f".trash/笔记_{batch}/" + name))
                elif validated[key] != note:
                    writes[f"notes/.history/{batch}/" + name] = note_bytes(key, note)
            # 索引最后提交；任何中断由日志重放，不留下可见的半份快照。
            index = writes.pop("notes/索引.json")
            writes["notes/索引.json"] = index
            commit(self.directory, writes, moves)
            from 资料索引 import refresh_notes
            refresh_notes(self.directory, validated, revision + 1)
            return {"revision": revision + 1, "notes": validated}
