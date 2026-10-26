"""有界的论文读取、文字分页和引用导出；不执行文件写入。"""
import json
import hashlib
from 安全落盘 import safe


def integer(value, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError("分页参数超出限制")
    return value


def metadata(root, paper_id):
    if not isinstance(paper_id, str) or not paper_id or len(paper_id) > 1000:
        raise ValueError("文献标识无效")
    directory = json.loads(safe(root, "资料目录.json").read_text("utf-8"))
    item = next((p for p in directory["papers"] if p["stable_id"] == paper_id), None)
    if item is None:
        raise ValueError("未找到stable_id对应的文献；请先list_papers")
    base = "papers/" + item["folder"]
    return json.loads(safe(root, base + "/meta.json").read_text("utf-8")), base


def list_papers(root, offset=0, limit=20):
    integer(offset, 0, 100000); integer(limit, 1, 50)
    directory = json.loads(safe(root, "资料目录.json").read_text("utf-8"))["papers"]
    rows = []
    for item in directory[offset:offset + limit]:
        meta, _ = metadata(root, item["stable_id"])
        rows.append({k: meta.get(k) for k in ("stable_id", "title", "title_zh", "year", "journal", "doi")})
    return {"papers": rows, "total": len(directory), "next_offset": offset + limit if offset + limit < len(directory) else None}


def get_paper(root, paper_id):
    meta, _ = metadata(root, paper_id)
    source = meta["source_record"]
    fields = ("stable_id", "title", "title_zh", "authors", "year", "journal", "doi", "aliases",
              "objective", "region", "target", "sensors", "resolution", "sample", "model", "validation",
              "results", "conclusion", "limitations_author", "limitations_inferred", "source_url")
    result, truncated = {}, []
    for key in fields:
        value = source.get(key)
        if isinstance(value, str) and len(value) > 2000:
            value = value[:2000]; truncated.append(key)
        result[key] = value
    return {"paper": result, "extraction": meta.get("extraction"), "truncated_fields": truncated}


def get_paper_text(root, paper_id, offset, limit=2000):
    integer(offset, 0, 100000000); integer(limit, 1, 4000)
    meta, base = metadata(root, paper_id)
    path = safe(root, base + "/text.md")
    if not path.exists():
        return {"text": "", "status": "no_text", "message": "没有已提取文字层；未执行OCR", "next_offset": None}
    text = path.read_text("utf-8")
    if len(text) <= 1:
        return {"text": "", "status": "too_short", "next_offset": None}
    size = min(limit, (len(text) + 1) // 2)
    end = min(offset + size, len(text))
    return {"stable_id": paper_id, "offset": offset, "text": text[offset:end], "total_chars": len(text),
            "returned_chars": len(text[offset:end]), "next_offset": end if end < len(text) else None,
            "extraction": meta.get("extraction"), "notice": "仅文字层；公式、表格和顺序以原PDF为准。"}


def get_citation(root, paper_id):
    meta, _ = metadata(root, paper_id)
    fields = {k: meta.get(k) for k in ("title", "authors", "year", "journal", "doi", "volume", "issue", "pages", "source_url")}
    return {"stable_id": paper_id, "fields": fields, "missing_fields": [k for k, v in fields.items() if not v],
            "notice": "仅导出现有元数据，未补造缺失字段；请与原论文核对。"}


def export_bibtex(root, paper_id):
    citation = get_citation(root, paper_id)
    def escape(value):
        replacements = {"\\": r"\textbackslash{}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}", "\n": " ", "\r": " "}
        replacements.update({c: "\\" + c for c in "{}%&#_$"})
        return "".join(replacements.get(c, c) for c in str(value))
    names = {"title": "title", "authors": "author", "year": "year", "journal": "journal", "doi": "doi", "volume": "volume", "issue": "number", "pages": "pages", "source_url": "url"}
    fields = []
    for key, name in names.items():
        value = citation["fields"][key]
        if value:
            if key == "authors": value = " and ".join(str(value).split(";"))
            fields.append(f"  {name} = {{{escape(value)}}}")
    key = "paper_" + hashlib.sha256(paper_id.encode()).hexdigest()[:12]
    return {"bibtex": "@misc{" + key + ",\n" + ",\n".join(fields) + "\n}", "missing_fields": citation["missing_fields"],
            "notice": "使用中性misc类型，未推断出版类型；作者按既有分号分隔。"}
