"""UTF-8 阅读记录、原子写入与版本冲突检查。"""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
import threading

MAX_BYTES = 5 * 1024 * 1024
BACKUP_LIMIT = 5
STATUSES = {"待读", "在读", "已读"}


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class StorageError(Exception):
    pass


class NotesConflict(Exception):
    def __init__(self, current):
        self.current = current
        super().__init__("阅读记录已在其他窗口更新")


def validate_notes(notes):
    if not isinstance(notes, dict):
        raise ValueError("notes 必须是以文献标识为键的对象")
    for key, note in notes.items():
        if not isinstance(key, str) or not key or not isinstance(note, dict):
            raise ValueError("每条阅读记录须有非空文献标识和对象内容")
        if "read_status" in note and (not isinstance(note["read_status"], str)
                                     or note["read_status"] not in STATUSES):
            raise ValueError("阅读状态只能为待读、在读或已读")
        if "star" in note and not isinstance(note["star"], bool):
            raise ValueError("收藏状态须为布尔值")
        for field in ("text", "questions", "updated_at"):
            if field in note and not isinstance(note[field], str):
                raise ValueError(f"{field} 须为文字")
    try:
        encoded = json.dumps(notes, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise ValueError("阅读记录含有无法保存的内容") from exc
    if len(encoded.encode("utf-8")) > MAX_BYTES:
        raise ValueError("阅读记录超过 5 MB 上限")
    return json.loads(encoded)


class NotesStore:
    def __init__(self, directory):
        self.directory = Path(directory).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "我的阅读记录.json"
        self.backups = self.directory / "自动备份"
        self.lock_path = self.directory / "阅读记录锁"
        self.thread_lock = threading.RLock()

    def _guard(self, path):
        if path.is_symlink() or not path.resolve().is_relative_to(self.directory):
            raise StorageError("阅读记录路径异常，已停止写入")

    @contextmanager
    def _locked(self):
        with self.thread_lock:
            self._guard(self.lock_path)
            with self.lock_path.open("a+b") as handle:
                if handle.seek(0, os.SEEK_END) == 0:
                    handle.write(b"0")
                    handle.flush()
                handle.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
                else:
                    import fcntl
                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    handle.seek(0)
                    if os.name == "nt":
                        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def _load(self):
        self._guard(self.path)
        if not self.path.exists():
            return {"revision": 0, "notes": {}}
        try:
            if self.path.stat().st_size > MAX_BYTES:
                raise ValueError("文件超过 5 MB")
            data = json.loads(self.path.read_text(encoding="utf-8-sig"))
            revision = data.get("revision")
            if type(revision) is not int or revision < 0:
                raise ValueError("缺少有效版本号")
            notes = validate_notes(data.get("notes"))
            return {"revision": revision, "notes": notes}
        except (OSError, ValueError, AttributeError, TypeError) as exc:
            raise StorageError(
                "我的阅读记录.json 无法读取；原文件已保留，请先检查或从自动备份恢复"
            ) from exc

    def load(self):
        with self._locked():
            return self._load()

    def _atomic_write(self, path, raw):
        self._guard(path)
        descriptor, temp_name = tempfile.mkstemp(
            prefix="阅读记录暂存_", suffix=".json", dir=path.parent
        )
        temp_path = Path(temp_name)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(raw)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, path)
            if os.name != "nt":
                folder_fd = os.open(path.parent, os.O_RDONLY)
                try:
                    os.fsync(folder_fd)
                finally:
                    os.close(folder_fd)
        finally:
            if temp_path.exists():
                temp_path.unlink()

    def _backup(self, revision):
        self._guard(self.backups)
        self.backups.mkdir(exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        target = self.backups / f"阅读记录备份_{revision:08d}_{stamp}.json"
        self._atomic_write(target, self.path.read_bytes())

    def _prune(self):
        if not self.backups.exists():
            return
        candidates = sorted(self.backups.glob("阅读记录备份_*.json"),
                            key=lambda path: path.name.split("_", 2)[-1], reverse=True)
        for path in candidates[BACKUP_LIMIT:]:
            try:
                self._guard(path)
                if path.is_file():
                    path.unlink()
            except (OSError, StorageError):
                print("旧自动备份暂时无法清理，将在下次保存时重试", file=sys.stderr)

    def save(self, revision, notes):
        if type(revision) is not int or revision < 0:
            raise ValueError("revision 须为非负整数")
        validated = validate_notes(notes)
        with self._locked():
            current = self._load()
            if revision != current["revision"]:
                raise NotesConflict(current)
            result = {"revision": revision + 1, "notes": validated}
            stored = {"version": 1, "saved_at": utc_now(), **result}
            raw = (json.dumps(stored, ensure_ascii=False, allow_nan=False,
                              indent=2) + "\n").encode("utf-8")
            if len(raw) > MAX_BYTES:
                raise ValueError("阅读记录保存后超过 5 MB 上限")
            if self.path.exists():
                self._backup(current["revision"])
            try:
                self._atomic_write(self.path, raw)
            finally:
                self._prune()
            return result

    def export(self):
        return {"version": 1, "exported_at": utc_now(), **self.load()}
