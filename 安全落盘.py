"""路径约束、原子写与可重放文件事务。调用者持有同一资料锁。"""
import base64
import hashlib
import json
import os
from pathlib import Path
import tempfile

from 文件存储 import StorageError


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")


def safe(root, relative):
    root = Path(root).absolute()
    relative = Path(relative)
    if relative.is_absolute() or any(p in {"..", "."} or ":" in p for p in relative.parts):
        raise StorageError("资料路径无效")
    path = root
    for part in relative.parts:
        path = path / part
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise StorageError("资料路径包含链接，已停止操作")
    if not path.resolve().is_relative_to(root.resolve()):
        raise StorageError("资料路径超出允许目录")
    return path


def atomic(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=".写入_", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(raw)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def checksum(path):
    return digest(path.read_bytes()) if path.exists() else None


def recover(root, after_operation=None):
    pending = safe(root, ".事务/待提交.json")
    if not pending.exists():
        return
    transaction = json.loads(pending.read_text(encoding="utf-8"))
    for i, item in enumerate(transaction["operations"]):
        target = safe(root, item["path"])
        if item["kind"] == "write":
            raw = base64.b64decode(item["data"], validate=True)
            current = checksum(target)
            if current != digest(raw):
                if current != item["before"]:
                    raise StorageError("事务目标有外部修改，已停止覆盖，请检查恢复记录")
                atomic(target, raw)
        elif item["kind"] == "move":
            source = safe(root, item["source"])
            if source.exists():
                if checksum(source) != item["before"] or target.exists():
                    raise StorageError("回收目标冲突，原资料已保留")
                target.parent.mkdir(parents=True, exist_ok=True)
                os.replace(source, target)
            elif checksum(target) != item["before"]:
                raise StorageError("回收文件未能核实，停止恢复")
        else:
            raise StorageError("事务格式不受支持")
        if after_operation:
            after_operation(i)
    os.replace(pending, safe(root, ".事务/上次提交.json"))


def commit(root, writes, moves=(), after_operation=None):
    recover(root)
    operations = []
    for source, destination in moves:
        old, new = safe(root, source), safe(root, destination)
        if not old.is_file() or new.exists():
            raise StorageError("待回收文件或目标状态异常")
        operations.append({"kind": "move", "source": source, "path": destination, "before": checksum(old)})
    for relative, raw in writes.items():
        target = safe(root, relative)
        operations.append({"kind": "write", "path": relative, "before": checksum(target),
                           "data": base64.b64encode(raw).decode("ascii")})
    atomic(safe(root, ".事务/待提交.json"), encoded({"version": 1, "operations": operations}))
    recover(root, after_operation)
