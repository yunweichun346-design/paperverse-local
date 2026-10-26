"""MCP只通过本机受认证接口操作；不直接读写论文或笔记文件。"""
import json
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from MCP认证 import read_config
from 文件存储 import StorageError
from mcp.server.mcpserver.exceptions import ToolError


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Bridge:
    def __init__(self, root):
        self.error = None
        try:
            self.config = read_config(root)
        except (OSError, ValueError, KeyError, StorageError):
            self.error = "请先启动 PaperVerse；config.json缺失或无效"
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def call(self, tool, **args):
        if self.error:
            raise ToolError(self.error)
        origin = f'http://127.0.0.1:{self.config["port"]}'
        request = Request(origin + "/api/mcp", data=json.dumps({"tool": tool, "args": args}, ensure_ascii=False).encode(),
                          headers={"Authorization": "Bearer " + self.config["token"], "Origin": origin,
                                   "Content-Type": "application/json"}, method="POST")
        try:
            with self.opener.open(request, timeout=15) as response:
                return json.load(response)
        except HTTPError as exc:
            try:
                message = json.load(exc).get("error", "本机服务拒绝请求")
            except (ValueError, AttributeError):
                message = "请先启动 PaperVerse；目标端口不是可用的MCP服务"
            finally:
                exc.close()
            raise ToolError(f"HTTP {exc.code}: {message}") from None
        except (OSError, URLError, ValueError):
            raise ToolError("请先启动 PaperVerse；无法连接已配置的本机后端") from None
