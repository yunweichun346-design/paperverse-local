# MCP 配置

本包使用官方 Python mcp==2.3.0，stdio 传输。先完成 README 的依赖安装并运行 start.bat，在数据目录自动生成 config.json。token 不应写入客户端配置、命令行、日志或备份包。后台未启动时工具会提示“请先启动 PaperVerse”。

将下列 <软件目录> 替换为你实际解压的路径（三处都要改）。Claude Desktop 使用 `%APPDATA%/Claude/claude_desktop_config.json`；Cursor 使用 `~/.cursor/mcp.json` 或项目 `.cursor/mcp.json`。合并既有 mcpServers，不覆盖其他服务器：

```json
{
  "mcpServers": {
    "paperverse": {
      "command": "<软件目录>/.venv/Scripts/python.exe",
      "args": [
        "-I",
        "-B",
        "-X",
        "utf8",
        "<软件目录>/MCP服务.py",
        "--data-dir",
        "<软件目录>"
      ]
    }
  }
}
```

重启客户端连接后可发现 11 个工具：list_papers、get_paper、get_paper_text、search_papers、get_reading_state、list_notes、add_note、update_note、delete_note、get_citation、export_bibtex。空库没有论文可读是正常状态。

get_paper_text 必须指定字符 offset，默认 2000、最大4000字符，依 next_offset 分页；不返回整篇全文，不做OCR。写操作仅限笔记，必须先读取revision；冲突后不覆盖。delete_note 软删除整条阅读记录（含收藏、阅读状态），应保留客户端确认。

MCP桥接只访问127.0.0.1，禁用代理和重定向。用户主动接入云AI后，客户端可能将工具返回内容发送给其模型服务；本机程序不替客户端保证数据不外传。token保护MCP桥接接口，原网页接口仍使用本机Host/Origin边界，不能公开代理为公网服务。

配置文件缺失时先启动网页；端口或token改变后重启MCP连接。本阶段通过SDK stdio与本机HTTP服务验收，不等同于Claude Desktop或Cursor图形界面配置已完成。

参考：[官方SDK](https://github.com/modelcontextprotocol/python-sdk)、[Claude Desktop接入](https://modelcontextprotocol.io/docs/develop/connect-local-servers)、[Cursor MCP](https://prod.cursor.com/docs/mcp)。
