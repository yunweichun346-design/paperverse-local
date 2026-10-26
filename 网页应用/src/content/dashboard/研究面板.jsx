import React from "react";
import { DataComponent } from "../../本机组件.jsx";


const missing = "当前整理记录未提供";
const text = value => Array.isArray(value) ? value.join("；") : value == null || value === "" ? missing : String(value);
const paperKey = paper => paper.stable_id || paper.id || paper.doi || paper.title;
const beijingTime = value => {
  if (!value) return "日期待核";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
};

function safeLink(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("/文件/") && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function Link({ href, children, className = "" }) {
  const clean = safeLink(href);
  if (!clean) return <span className={className}>{children}</span>;
  const remote = /^https?:/i.test(clean);
  return <a className={className} href={clean} target={remote ? "_blank" : undefined} rel={remote ? "noopener noreferrer" : undefined}>{children}</a>;
}

function Evidence({ paper }) {
  const entries = Array.isArray(paper.evidence) ? paper.evidence : [];
  if (!entries.length) return <div className="rp-missing">当前记录没有分节证据定位。<br /><Link href={paper.fulltext_url || paper.source_url}>查看论文入口</Link></div>;
  return <ul className="rp-evidence">{entries.map((item, index) => <li key={`${item.section || item.kind}-${index}`}>
    <Link href={item.url || paper.source_url}>{item.section || item.kind || `证据 ${index + 1}`}</Link>
    {item.claim && <span>{item.claim}</span>}
  </li>)}</ul>;
}

const dimensions = [
  ["研究目标", "objective"],
  ["目标变量与单位（原口径）", "target"],
  ["研究区与对象", "region"],
  ["遥感数据", "sensors"],
  ["样本与实测数据", "sample"],
  ["空间分辨率与分析尺度", "resolution"],
  ["方法与模型结构", "model"],
  ["验证方式", "validation"],
  ["评价指标与结果", "results"],
  ["论文主要结论", "conclusion"],
  ["论文明确的局限", "limitations_author"],
  ["整理者分析／推断", "limitations_inferred"],
  ["与树木密度研究的关系", "relevance"],
  ["待验证的研究设想", "innovation_hypothesis"],
  ["数据与代码可得性", "data_code"],
];

export function ComparisonPanel({ papers = [], onRemove }) {
  const chosen = papers.slice(0, 4);
  return <section className="rp-panel rp-comparison">
    <div className="rp-intro">


      <p>先看估算的是地面株数、可见树冠数量还是其他森林参数，再判断方法能否借鉴。不同目标、单位、样本和验证口径的精度不能直接排名。</p>
    </div>
    <DataComponent id="literature-comparison" title="所选论文对照" queryId="papers" kind="table" variant="plain" displayRows={chosen} sourceRows={chosen}>
      {chosen.length === 0 ? <div className="rp-empty"><span aria-hidden="true">↔</span><h3>从文献库选择 2–4 篇论文</h3><p>勾选文献卡片上的“加入对比”，再回到这里查看。</p></div> : <>
        <p className="rp-selection-note">{chosen.length < 2 ? "已选择 1 篇；再加入一篇即可并排比较。" : `当前对比 ${chosen.length} 篇。横向滚动可查看所有列。`}{papers.length > 4 && " 此处最多展示前 4 篇。"}</p>
        <div className="rp-table-scroll" tabIndex={0} aria-label="论文对照表，可横向滚动">
          <table className="rp-compare-table" data-reviewed-rows>
            <caption className="rp-visually-hidden">所选论文的研究目标、数据、方法、验证与局限对比</caption>
            <thead><tr><th scope="col">比较项</th>{chosen.map(paper => <th key={paperKey(paper)} scope="col">
              <div className="rp-paper-meta">{paper.year || "年份待核"} · {paper.id || "原模板文献"}</div>
              <Link href={paper.source_url || (paper.doi && `https://doi.org/${paper.doi}`)}>{paper.title || paper.title_zh || "题名待核"}</Link>
              {paper.title_zh && paper.title_zh !== paper.title && <p className="rp-translation">{paper.title_zh}</p>}
              <div className="rp-paper-meta">{paper.relevance_tier || paper.category || "相关性待核"} · AI {paper.ai_status || paper.reading_depth || "证据范围待核"}</div>
              {paper.doi && <div className="rp-doi">DOI：{paper.doi}</div>}
              {onRemove && <button className="rp-small-button" type="button" onClick={() => onRemove(paperKey(paper))}>移出对比</button>}
            </th>)}</tr></thead>
            <tbody>{dimensions.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{chosen.map(paper => <td key={paperKey(paper)}>{text(paper[key])}</td>)}</tr>)}
              <tr><th scope="row">原文证据与定位</th>{chosen.map(paper => <td key={paperKey(paper)}><Evidence paper={paper} /></td>)}</tr>
            </tbody>
          </table>
        </div>
      </>}
    </DataComponent>
  </section>;
}

function DatasetCard({ dataset }) {
  return <article className="rp-dataset" data-reviewed-rows>
    <div className="rp-dataset-heading"><span className="rp-entry-code">{dataset.id || "数据入口"}</span><h3>{dataset.name || "数据源名称待核"}</h3></div>
    <p className="rp-role">{text(dataset.role)}</p>
    <dl className="rp-definition-list">
      <div><dt>变量</dt><dd>{text(dataset.variables)}</dd></div>
      <div><dt>尺度</dt><dd>{text(dataset.scale)}</dd></div>
      <div><dt>覆盖范围</dt><dd>{text(dataset.coverage)}</dd></div>
      <div><dt>株数标签</dt><dd>{text(dataset.density_label)}</dd></div>
      <div><dt>获取条件</dt><dd>{text(dataset.access)}</dd></div>
    </dl>
    {dataset.caution && <p className="rp-caution">使用前核对：{dataset.caution}</p>}
    <div className="rp-dataset-footer"><span>{dataset.local_status || "下载状态待核"}</span><div><Link href={dataset.url}>官方入口 ↗</Link>{dataset.documentation && dataset.documentation !== dataset.url && <Link href={dataset.documentation}>文档 ↗</Link>}</div></div>
  </article>;
}

function UpdateCard({ update, files }) {
  const declared = Array.isArray(update.files) ? update.files : [];
  const linked = declared.map(item => typeof item === "object" ? item : files.find(file => file.id === item || file.name === item)).filter(Boolean);
  const filename = String(update.path || "").split(/[\\/]/).pop();
  const relatedFile = filename && files.find(file => file.name === filename);
  if (relatedFile && !linked.some(file => file.id === relatedFile.id)) linked.push(relatedFile);
  return <article className="rp-update" data-reviewed-rows>
    <div className="rp-update-date">{update.date || update.updated_at || "日期待核"}</div>
    <h3>{update.title || update.name || "研究整理记录"}</h3>
    <p>{update.summary || update.description || update.content || "当前记录没有内容摘要，请打开整理文件核对。"}</p>
    {(update.status || update.kind) && <span className="rp-status">{update.status || update.kind}</span>}
    {update.url && <Link href={update.url}>查看依据 ↗</Link>}
    {linked.map(file => <Link key={file.id || file.name} href={file.url}>{file.label || file.name}</Link>)}
  </article>;
}

export function ResourcesPanel({ datasets = [], updates = [], files = [], meta = {} }) {
  const list = Array.isArray(files) ? files : files?.files || [];
  const directionFiles = list.filter(file => /候选方向|研究方向|三个.*方向/.test(`${file.label || ""} ${file.name || ""}`));
  const otherFiles = list.filter(file => !directionFiles.includes(file));
  return <section className="rp-panel rp-resources">
    <div className="rp-intro">


      <p>青藏高原优先。这里记录可查的数据、已有整理产出和证据状态；AI 核读范围与“我的阅读”中的个人进度分别保存。</p>
    </div>
    <div className="rp-weekend-banner"><div><strong>每周六 09:00 · 北京时间</strong><p>按照已设置的周六任务继续补齐研究证据。新结果写入整理文件后，刷新文献数据查看；当前页面只展示已存在的记录。</p></div>{meta.source_updated_at && <span>文献源文件更新：{beijingTime(meta.source_updated_at)}</span>}</div>
    <DataComponent id="research-dataset-entries" title="可用的数据入口" queryId="datasets" kind="custom" variant="plain" displayRows={datasets} sourceRows={datasets} description="官方数据入口不代表已下载。实验开始前还需核对样地坐标、面积、调查日期、胸径门槛和实测株数。">
      <p className="rp-section-note">入口登记与下载完成是两个状态。地面株密度真值还需要样地坐标、面积、调查日期、胸径门槛和实测株数。</p>
      {datasets.length ? <div className="rp-dataset-grid">{datasets.map(dataset => <DatasetCard key={dataset.id || dataset.name} dataset={dataset} />)}</div> : <p className="rp-missing">当前没有已核对的数据入口记录。</p>}
    </DataComponent>
    <DataComponent id="research-weekend-updates" title="已有研究整理" queryId="updates" kind="custom" variant="plain" displayRows={updates} sourceRows={updates}>
      {updates.length ? <div className="rp-update-grid">{updates.map((update, index) => <UpdateCard key={update.id || `${update.title}-${index}`} update={update} files={list} />)}</div> : <p className="rp-missing">当前统一数据中还没有周末整理记录。已存在的研究文件可从下方打开。</p>}
    </DataComponent>
    <section className="rp-source-files" aria-labelledby="rp-files-title">
      <div><p className="rp-kicker">保留原表，继续积累</p><h2 id="rp-files-title">研究文件</h2><p>下载链接对应已有文件；网页中的阅读笔记请在“我的阅读”中另行备份。</p></div>
      {directionFiles.length > 0 && <div className="rp-directions"><h3>三个候选研究方向</h3><p>先核对能否获得影像和真值，再选择可实施的方向。</p>{directionFiles.map(file => <Link className="rp-file-link" key={file.id || file.name} href={file.url}>{file.label || file.name} ↗</Link>)}</div>}
      <div className="rp-file-grid">{otherFiles.map(file => <Link key={file.id || file.name} className="rp-file-link" href={file.url}><span>{file.label || file.name}</span><small>{String(file.kind || "整理文件").toUpperCase()} · {beijingTime(file.modified_at)}（北京时间）</small></Link>)}</div>
      {!list.length && <p className="rp-missing">研究文件入口正在加载，或当前未连接本地服务。</p>}
    </section>
  </section>;
}
