"""仅提取PDF文字层；不执行OCR、不推断引用元数据。"""
import io
import json
from pathlib import Path
import subprocess
import sys
from pypdf import PdfReader, overwrite_configuration

MAX_PDF = 50 * 1024 * 1024


def _extract(raw):
    if not raw.startswith(b"%PDF-") or len(raw) > MAX_PDF:
        raise ValueError("PDF无效或超过50MB")
    try:
        reader = PdfReader(io.BytesIO(raw), strict=False)
        if reader.is_encrypted:
            raise ValueError("PDF已加密，请先提供可读取的副本")
        if len(reader.pages) > 10000:
            raise ValueError("PDF超过10000页")
        blocks, empty, limited = [], [], []
        for number, page in enumerate(reader.pages, 1):
            contents = page.get_contents()
            if contents and len(contents.get_data()) > 20 * 1024 * 1024:
                limited.append(number)
                blocks.append(f"## 第 {number} 页\n\n此页内容流超过提取限额；请阅读原PDF。")
                continue
            text = page.extract_text() or ""
            if not text.strip():
                empty.append(number)
            blocks.append(f"## 第 {number} 页\n\n" + (text if text.strip() else "未提取到文字层；可能为扫描页或空白页，未执行OCR。"))
        status = "partial" if limited or (empty and len(empty) < len(reader.pages)) else "no_text_layer" if empty else "extracted"
        intro = "# PDF文字层提取\n\n仅供检索与辅助阅读，公式、表格及阅读顺序请核对原PDF；未执行OCR。\n\n"
        return intro + "\n\n".join(blocks), {"status": status, "pages": len(reader.pages),
            "empty_pages": empty, "limited_pages": limited, "engine": "pypdf 6.21.2", "ocr": False}
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("PDF无法解析，未修改原文件；请检查文件是否损坏") from exc


def extract(raw):
    if not raw.startswith(b"%PDF-") or len(raw) > MAX_PDF:
        raise ValueError("PDF无效或超过50MB")
    try:
        result = subprocess.run([sys.executable, "-I", "-B", str(Path(__file__).resolve())],
            input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    except subprocess.TimeoutExpired as exc:
        raise ValueError("PDF文字层提取超时，未覆盖原资料") from exc
    if result.returncode:
        raise ValueError("PDF无法安全提取，请检查加密、损坏或过大内容流；未覆盖原资料")
    return json.loads(result.stdout)


if __name__ == "__main__":
    try:
        overwrite_configuration(zlib_maximum_output_length=20_000_000,
            array_based_stream_maximum_output_length=20_000_000,
            lzw_maximum_output_length=20_000_000, run_length_maximum_output_length=20_000_000)
        output = _extract(sys.stdin.buffer.read(MAX_PDF + 1))
        sys.stdout.buffer.write(json.dumps(output, ensure_ascii=False).encode("utf-8"))
    except Exception:
        sys.exit(2)
