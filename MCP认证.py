"""本机MCP桥接认证；凭据只写数据目录config.json。"""
import json
import re
import secrets
from 安全落盘 import safe, atomic, encoded


def read_config(root):
    data = json.loads(safe(root, "config.json").read_text("utf-8"))
    if type(data.get("port")) is not int or not 1 <= data["port"] <= 65535:
        raise ValueError("端口配置无效")
    if not isinstance(data.get("token"), str) or not re.fullmatch(r"[a-f0-9]{64}", data["token"]):
        raise ValueError("认证配置无效")
    return data


def configure(root, port):
    path = safe(root, "config.json")
    data = read_config(root) if path.exists() else {"token": secrets.token_hex(32)}
    data["port"] = port
    atomic(path, encoded(data))
    return data["token"]


def authorized(handler):
    supplied = handler.headers.get("Authorization", "")
    expected = getattr(handler.server, "mcp_token", None)
    return bool(expected) and secrets.compare_digest(supplied.encode(), ("Bearer " + expected).encode())
