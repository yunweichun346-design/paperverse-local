"""Windows 本地浏览器窗口复用；不访问或清理用户原有浏览器档案。"""
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import time


def windows():
    found = set()
    user = ctypes.windll.user32
    user.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user.IsWindowVisible.argtypes = [wintypes.HWND]
    callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    @callback_type
    def visit(handle, _):
        title = ctypes.create_unicode_buffer(512)
        user.GetWindowTextW(handle, title, 512)
        if user.IsWindowVisible(handle) and "文献阅读工作台" in title.value:
            found.add(handle)
        return True

    user.EnumWindows(visit, 0)
    return found


def open_window(root, url):
    runtime = root / ".运行状态"
    saved = runtime / "窗口状态.json"
    user = ctypes.windll.user32
    user.GetPropW.argtypes = [wintypes.HWND, wintypes.LPCWSTR]
    user.GetPropW.restype = wintypes.HANDLE
    user.SetPropW.argtypes = [wintypes.HWND, wintypes.LPCWSTR, wintypes.HANDLE]
    user.SetForegroundWindow.argtypes = [wintypes.HWND]
    user.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
    user.IsIconic.argtypes = [wintypes.HWND]
    marker = "PaperVerse:" + str(root)
    try:
        state = json.loads(saved.read_text(encoding="utf-8"))
        handle = state["handle"]
        if (state["url"] == url and handle in windows()
                and user.GetPropW(handle, marker)):
            if user.IsIconic(handle):
                user.ShowWindow(handle, 9)
            if user.SetForegroundWindow(handle):
                print("已聚焦原工作台窗口，保留当前页面与草稿。")
            else:
                print("原工作台窗口仍在；Windows 限制前台切换，请点击任务栏中的工作台。未刷新页面或另开窗口。")
            return
    except (OSError, ValueError, KeyError, TypeError):
        pass
    edge = next((Path(os.environ.get(variable, "")) / "Microsoft/Edge/Application/msedge.exe"
                 for variable in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA")
                 if (Path(os.environ.get(variable, "")) / "Microsoft/Edge/Application/msedge.exe").is_file()), None)
    if not edge:
        os.startfile(url)
        print("已用默认浏览器打开。未检测到 Edge，窗口复用由默认浏览器决定。")
        return
    before = windows()
    # 独立且持久的档案避免误聚焦原站点；不修改用户默认浏览器的存储。
    subprocess.Popen([str(edge), "--app=" + url, "--no-first-run", "--no-default-browser-check",
                      "--user-data-dir=" + str(runtime / "浏览器会话")],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    for _ in range(40):
        new = windows() - before
        if new:
            handle = next(iter(new))
            user.SetPropW(handle, marker, 1)
            saved.write_text(json.dumps({"url": url, "handle": handle}), encoding="utf-8")
            return
        time.sleep(.15)
    print("浏览器已请求打开；若系统阻止前台切换，请点击任务栏中的工作台窗口。")
