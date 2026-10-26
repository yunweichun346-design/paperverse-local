"""仅在全新发行目录初始化空库；已有资料绝不重置。"""
import json
from 安全落盘 import safe, atomic, encoded


def initialize(root):
    if safe(root, "标准存储启用.json").exists():
        return
    if any(safe(root, name).exists() for name in ("papers", "notes", "文献主数据.json", "资料目录.json")):
        raise RuntimeError("发现已有资料但缺少启用标记，停止初始化；请先核对备份")
    safe(root, "papers").mkdir()
    atomic(safe(root, "notes/索引.json"), encoded({"version": 1, "revision": 0, "entries": {}}))
    atomic(safe(root, "资料目录.json"), encoded({"version": 1, "papers": [], "routes": {}}))
    atomic(safe(root, "标准存储启用.json"), encoded({"version": 1}))


def library(root):
    from 文件存储 import NotesStore
    from 安全落盘 import recover
    with NotesStore(root)._locked():
        recover(root)
        directory = json.loads(safe(root, "资料目录.json").read_text("utf-8"))
        papers = [json.loads(safe(root, "papers/" + p["folder"] + "/meta.json").read_text("utf-8"))["source_record"] for p in directory["papers"]]
    return {"papers": papers, "datasets": [], "updates": []}
