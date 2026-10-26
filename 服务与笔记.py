"""只在本机提供工作台、固定资料入口与个人阅读记录。"""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import sys
from urllib.parse import quote, unquote, urlsplit
from 文件存储 import MAX_BYTES, NotesConflict, NotesStore, StorageError
from 全文存储 import handle_fulltext
APP_ID = "paperverse-local-release-v1"
FILE_SPECS = ()

class WorkbenchServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, directory, port=8767):
        self.root = Path(directory).resolve()
        from 空库初始化 import initialize
        initialize(self.root)
        self.dist = self.root / "网页应用" / "dist"
        self.store = NotesStore(self.root)
        if (self.root / "标准存储启用.json").exists():
            from 标准笔记 import MarkdownNotesStore
            self.store = MarkdownNotesStore(self.root)
            from 安全落盘 import recover
            with self.store._locked():
                recover(self.root)
            from 资料索引 import rebuild
            rebuild(self.root)
        self.source_root = self.root.parent.resolve()
        self.files = {}
        super().__init__(("127.0.0.1", port), WorkbenchHandler)
        if (self.root / "标准存储启用.json").exists():
            from MCP认证 import configure
            self.mcp_token = configure(self.root, self.server_port)
    def register_files(self):
        return {}

    def safe_source(self, path):
        if not path.resolve().is_relative_to(self.source_root) or not path.is_file():
            return False
        current = path
        while current != self.source_root:
            if current.is_symlink() or getattr(current, "is_junction", lambda: False)():
                return False
            current = current.parent
        return True

class WorkbenchHandler(BaseHTTPRequestHandler):
    server_version = "ReadingWorkbench/1"
    timeout = 15

    def log_message(self, fmt, *args):
        stamp = datetime.now().isoformat(timespec="seconds")
        print(f"{stamp} 本地请求已处理", file=sys.stderr)

    def _headers(self, status, content_type, length, disposition=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        if disposition:
            self.send_header("Content-Disposition", disposition)
        self.end_headers()

    def _json(self, status, data, download=False):
        raw = json.dumps(data, ensure_ascii=False, allow_nan=False).encode("utf-8")
        disposition = None
        if download:
            filename = quote("我的阅读记录导出.json")
            disposition = f"attachment; filename*=UTF-8''{filename}"
        self._headers(status, "application/json; charset=utf-8", len(raw), disposition)
        if self.command != "HEAD":
            self.wfile.write(raw)

    def _local_request(self, writing=False):
        port = self.server.server_port
        allowed = {f"127.0.0.1:{port}", f"localhost:{port}"}
        if self.headers.get("Host", "") not in allowed:
            self._json(403, {"error": "仅支持本机工作台地址"})
            return False
        origin = self.headers.get("Origin")
        if writing and origin and origin not in {f"http://{host}" for host in allowed}:
            self._json(403, {"error": "请从本机工作台保存阅读记录"})
            return False
        return True

    def _path(self):
        path = unquote(urlsplit(self.path).path)
        if "\x00" in path or "\\" in path or "%" in path:
            raise ValueError("路径无效")
        if any(part in {".", ".."} for part in path.split("/")):
            raise ValueError("路径无效")
        return path

    def _send_file(self, path, allowed_root, download=False):
        resolved = path.resolve()
        if path.is_symlink() or not resolved.is_relative_to(allowed_root.resolve()):
            self._json(403, {"error": "此文件不在允许访问的资料中"})
            return
        if not resolved.is_file():
            self._json(404, {"error": "文件尚未准备好"})
            return
        content_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or resolved.suffix in {".js", ".json"}:
            content_type += "; charset=utf-8"
        disposition = None
        if download:
            disposition = f"attachment; filename*=UTF-8''{quote(resolved.name)}"
        self._headers(200, content_type, resolved.stat().st_size, disposition)
        if self.command != "HEAD":
            with resolved.open("rb") as handle:
                while chunk := handle.read(128 * 1024):
                    self.wfile.write(chunk)

    def _file_list(self):
        files = []
        for key, (path, label, kind) in self.server.register_files().items():
            if not self.server.safe_source(path):
                continue
            stat = path.stat()
            files.append({"id": key, "name": path.name, "label": label,
                          "kind": kind, "url": f"/文件/{key}", "size": stat.st_size,
                          "modified_at": datetime.fromtimestamp(
                              stat.st_mtime, timezone.utc).isoformat(timespec="seconds")})
        return {"files": files}

    def _get(self):
        if not self._local_request():
            return
        try:
            path = self._path()
            if path == "/api/health":
                self._json(200, {"app_id": APP_ID, "status": "ok",
                                 "ready": (self.server.dist / "index.html").is_file()})
            elif path == "/api/library":
                from 空库初始化 import library
                self._json(200, library(self.server.root))
            elif path == "/api/search":
                from 全文检索 import handle_search
                handle_search(self)
            elif path == "/api/notes":
                self._json(200, self.server.store.load())
            elif path == "/api/backup":
                self._json(200, self.server.store.export(), download=True)
            elif path == "/api/files":
                self._json(200, self._file_list())
            elif path.startswith("/api/fulltext/"):
                handle_fulltext(self)
            elif path.startswith("/文件/"):
                key = path[len("/文件/"):]
                item = self.server.register_files().get(key)
                if item and self.server.safe_source(item[0]):
                    self._send_file(item[0], self.server.source_root,
                                    download=item[0].suffix != ".html")
                else:
                    self._json(404, {"error": "此资料未列入可打开文件"})
            elif path == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
            elif path.startswith("/api/"):
                self._json(404, {"error": "接口不存在"})
            else:
                self._static(path)
        except ValueError:
            self._json(400, {"error": "路径或数据格式无效"})
        except StorageError as exc:
            self._json(500, {"error": str(exc)})
        except OSError:
            self._json(500, {"error": "文件暂时无法访问，请检查服务错误日志"})

    def _static(self, path):
        if (self.server.dist.is_symlink() or self.server.dist.parent.is_symlink()
                or not self.server.dist.resolve().is_relative_to(self.server.root)):
            self._json(403, {"error": "网页应用路径异常"})
            return
        if not (self.server.dist / "index.html").is_file():
            self._json(503, {"error": "网页应用尚未构建，请先完成工作台构建"})
            return
        candidate = self.server.dist / path.lstrip("/")
        if not candidate.resolve().is_relative_to(self.server.dist.resolve()):
            self._json(403, {"error": "此路径不允许访问"})
            return
        if any(part.startswith(".") for part in path.split("/") if part):
            self._json(404, {"error": "文件不存在"})
            return
        if candidate.is_file():
            self._send_file(candidate, self.server.dist)
        elif Path(path).suffix or path.startswith("/assets/"):
            self._json(404, {"error": "文件不存在"})
        else:
            self._send_file(self.server.dist / "index.html", self.server.dist)

    def do_GET(self):
        self._get()

    def do_HEAD(self):
        self._get()

    def do_PUT(self):
        if not self._local_request(writing=True):
            return
        try:
            if self._path().startswith("/api/fulltext/"):
                handle_fulltext(self)
                return
            if self._path() != "/api/notes":
                self._json(404, {"error": "接口不存在"})
                return
            if self.headers.get_content_type() != "application/json":
                self._json(415, {"error": "请使用 JSON 保存阅读记录"})
                return
            if self.headers.get("Transfer-Encoding"):
                self._json(400, {"error": "请按明确长度提交阅读记录"})
                return
            length_text = self.headers.get("Content-Length", "")
            if not re.fullmatch(r"\d+", length_text):
                self._json(411, {"error": "缺少有效内容长度"})
                return
            length = int(length_text)
            if length > MAX_BYTES:
                self._json(413, {"error": "阅读记录超过 5 MB 上限"})
                return
            raw = self.rfile.read(length)
            if len(raw) != length:
                raise ValueError("请求内容不完整")
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("请求须为 JSON 对象")
            self._json(200, self.server.store.save(data.get("revision"), data.get("notes")))
        except NotesConflict as exc:
            self._json(409, {"error": str(exc), "current": exc.current})
        except (ValueError, UnicodeError) as exc:
            self._json(400, {"error": str(exc) or "阅读记录格式无效"})
        except StorageError as exc:
            self._json(500, {"error": str(exc)})
        except OSError:
            self._json(500, {"error": "保存未成功，请检查目录权限或服务错误日志"})

    def do_POST(self):
        if self._local_request(writing=True):
            try:
                if self._path() == "/api/papers":
                    from 文献导入 import handle_import
                    return handle_import(self)
                if self._path() == "/api/mcp":
                    from MCP接口 import handle_mcp
                    return handle_mcp(self)
                handle_fulltext(self)
            except ValueError:
                self._json(400, {"error": "路径无效"})

def main():
    parser = argparse.ArgumentParser(description="启动本机文献阅读工作台")
    parser.add_argument("--port", type=int, default=8767)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("端口须在 1 至 65535 之间")
    try:
        with WorkbenchServer(Path(__file__).parent, args.port) as server:
            print(f"文献阅读工作台已启动：http://127.0.0.1:{args.port}", flush=True)
            server.serve_forever()
    except OSError as exc:
        print(f"工作台启动失败：{exc}。请查看端口占用或服务日志。", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
