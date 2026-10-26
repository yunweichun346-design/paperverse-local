"""系统 Python 启动器；只托管现有服务，不构建网页、不转换数据。"""
import argparse
import errno
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
APP_ID = "paperverse-local-release-v1"


class FileLock:
    def __init__(self, path):
        self.path, self.handle = path, None

    def acquire(self, timeout=0):
        import msvcrt
        self.path.parent.mkdir(exist_ok=True)
        self.handle = self.path.open("a+b")
        if self.handle.seek(0, 2) == 0:
            self.handle.write(b"0")
            self.handle.flush()
        deadline = time.monotonic() + timeout
        while True:
            self.handle.seek(0)
            try:
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
                return True
            except OSError:
                if time.monotonic() >= deadline:
                    self.handle.close()
                    self.handle = None
                    return False
                time.sleep(.1)

    def release(self):
        if self.handle:
            import msvcrt
            self.handle.seek(0)
            msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
            self.handle.close()
            self.handle = None


def read_state(root):
    try:
        data = json.loads((root / ".运行状态" / "服务状态.json").read_text(encoding="utf-8"))
        if (isinstance(data, dict) and type(data.get("port")) is int
                and 1 <= data["port"] <= 65535 and type(data.get("pid")) is int
                and data["pid"] > 0):
            return data
    except (OSError, ValueError):
        pass
    return None


def existing_instance(root):
    # 服务终身持锁；崩溃遗留状态不能把另一个同名服务误认成当前副本。
    lock = FileLock(root / ".运行状态" / "服务锁")
    if lock.acquire():
        lock.release()
        return None
    state = read_state(root)
    if state:
        try:
            opener = build_opener(ProxyHandler({}))
            with opener.open(f'http://127.0.0.1:{state["port"]}/api/health', timeout=1) as response:
                health = json.load(response)
            if health.get("app_id") == APP_ID and health.get("ready") is True:
                return state
        except (OSError, ValueError):
            pass
    return None


def check_runtime(root):
    if sys.version_info < (3, 10):
        raise RuntimeError("需要 Python 3.10 或更高版本：https://www.python.org/downloads/windows/")
    if os.name != "nt":
        raise RuntimeError("本节仅交付 Windows 启动入口，macOS 尚未验收。")
    if not (root / "网页应用" / "dist" / "index.html").is_file():
        raise RuntimeError("缺少网页构建产物：网页应用/dist/index.html。请使用完整副本；启动器不会安装 Node 或运行构建。")
    try:
        importlib.import_module("pypdf")
        importlib.import_module("窗口操作")
        return importlib.import_module("服务与笔记")
    except ModuleNotFoundError as error:
        raise RuntimeError(f"缺少启动依赖或模块：{error.name}。请使用本项目 .venv，并按运行依赖.txt 安装依赖；启动不会自动安装。") from error
    except (ImportError, SyntaxError) as error:
        raise RuntimeError(f"启动模块无法加载：{error}。请检查文件完整性与 Python 版本。") from error


def bind_server(module, root, port):
    try:
        return module.WorkbenchServer(root, port)
    except OSError as error:
        if error.errno not in {errno.EADDRINUSE, errno.EACCES} and getattr(error, "winerror", 0) not in {10048, 10013}:
            raise
        # 直接让系统绑定可用端口，避免先探测后绑定的竞争窗口。
        return module.WorkbenchServer(root, 0)


def serve(root, port):
    module = check_runtime(root)
    lock = FileLock(root / ".运行状态" / "服务锁")
    if not lock.acquire():
        raise RuntimeError("本副本已有服务进程，请重新打开 start.bat。")
    try:
        with bind_server(module, root, port) as server:
            # 独立副本的资料入口不能回读原工作区或任意父目录。
            server.source_root = root
            server.source_root.mkdir(exist_ok=True)
            state = {"port": server.server_port, "pid": os.getpid(), "python": sys.executable}
            path = root / ".运行状态" / "服务状态.json"
            temporary = path.with_suffix(".tmp")
            temporary.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
            os.replace(temporary, path)
            print(f'本地服务已就绪：http://127.0.0.1:{server.server_port}', flush=True)
            server.serve_forever()
    finally:
        lock.release()


def spawn_worker(root, port):
    runtime = root / ".运行状态"
    command = [sys.executable, "-I", "-B", "-X", "utf8", "-u", str(root / "启动工作台.py"),
               "--serve", "--port", str(port)]
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    with (runtime / "服务日志.txt").open("ab") as log:
        options = dict(cwd=root, stdin=subprocess.DEVNULL, stdout=log, stderr=log, close_fds=True)
        try:
            return subprocess.Popen(command, creationflags=flags | subprocess.CREATE_BREAKAWAY_FROM_JOB, **options)
        except OSError as error:
            if error.winerror != 5:
                raise
            print("提示：当前宿主限制脱离作业；已使用独立后台进程。关闭 AI 工具后的双击验收仍需单独进行。", file=sys.stderr)
            return subprocess.Popen(command, creationflags=flags, **options)


def start(root, port, no_browser):
    check_runtime(root)
    runtime = root / ".运行状态"
    runtime.mkdir(exist_ok=True)
    lock = FileLock(runtime / "启动锁")
    if not lock.acquire(timeout=20):
        raise RuntimeError("另一个启动器尚未结束，请稍后重试；不会结束其他程序。")
    try:
        state = existing_instance(root)
        reused = bool(state)
        if not state:
            process = spawn_worker(root, port)
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                state = existing_instance(root)
                if state:
                    break
                if process.poll() is not None:
                    raise RuntimeError("服务未启动，请查看 .运行状态/服务日志.txt。原资料未改动。")
                time.sleep(.15)
            if not state:
                raise RuntimeError("服务启动超时，请查看 .运行状态/服务日志.txt。")
        url = f'http://127.0.0.1:{state["port"]}/?view=1&tab=library'
        print(("复用已有实例：" if reused else "已启动独立服务：") + url)
        if not no_browser:
            from 窗口操作 import open_window
            open_window(root, url)
        return state
    finally:
        lock.release()


def main():
    parser = argparse.ArgumentParser(description="独立启动现有 Python 文献工作台")
    parser.add_argument("--serve", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--no-browser", action="store_true", help="仅启动服务，用于诊断")
    parser.add_argument("--port", type=int, default=8767)
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("端口须为0至65535，0表示自动分配")
    try:
        if args.serve:
            serve(ROOT, args.port)
        else:
            start(ROOT, args.port, args.no_browser)
    except (OSError, RuntimeError) as error:
        print(f"无法打开工作台：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
