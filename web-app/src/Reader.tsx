import { useEffect, useState } from 'react';
import Markdown from './Markdown';
import { catalog, chapters, lessons, lessonHref, statusLabel, type Lesson, type LessonBody, type StudyData, type Status } from './model';
import { Icon } from './Icons';
const bodies = import.meta.glob<{ default: LessonBody }>('./generated/lessons/*.json');
export function Reader({ lesson, data, changeStatus, bookmark, section }: { lesson: Lesson; data: StudyData; changeStatus: (s: Status) => void; bookmark: () => void; section: string | null }) {
  const [body, setBody] = useState<LessonBody | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setBody(null); setFailed(false);
    const load = bodies['./generated/lessons/' + lesson.id + '.json'];
    if (!load) { setFailed(true); return; }
    load().then(m => { if (active) setBody(m.default); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [lesson.id]);
  useEffect(() => {
    if (body && section) requestAnimationFrame(() => document.getElementById('section-' + section)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }, [body, section]);
  const chapter = chapters.find(c => c.id === lesson.chapterId)!;
  const saved = data.bookmarks.includes(lesson.id);
  return <div className="reader-layout">
    <article className="reader">
      <nav className="breadcrumb" aria-label="面包屑"><a href="#/">课程总览</a><Icon name="chevron" size={13} /><a href={'#/chapter/' + chapter.id}>{chapter.label}</a></nav>
      <div className="lesson-kicker"><span>第 {String(lesson.number).padStart(2, '0')} 课</span><span className={'status ' + data.statuses[lesson.id]}><i />{statusLabel[data.statuses[lesson.id]]}</span></div>
      <h1>{lesson.title}</h1>
      <p className="lesson-chapter">{chapter.title}</p>
      <div className="reader-actions">
        <label>学习状态<select aria-label="学习状态" value={data.statuses[lesson.id]} onChange={e => changeStatus(e.target.value as Status)}>{Object.entries(statusLabel).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
        <button className={'button subtle bookmark-button' + (saved ? ' is-saved' : '')} aria-pressed={saved} onClick={bookmark}><Icon name="bookmark" size={17} />{saved ? '已收藏' : '收藏本课'}</button>
      </div>
      <nav className="quick-review" aria-label="快速复习"><span>快速复习</span>{['本课要点', '易错点', '自检'].map(title => <a key={title} href={lessonHref(lesson.id) + '?section=' + (lesson.sections.indexOf(title) + 1)}>{title}</a>)}</nav>
      {failed ? <div className="notice"><p>本课内容暂时加载失败，请检查网络后重试。</p><button className="button" onClick={() => location.reload()}>重新载入</button></div> : body ? <Markdown text={body.markdown} sections={body.sections} /> : <p className="loading" role="status">正在打开笔记…</p>}
      <div className="reading-end"><Icon name="check" size={18} /><span>读完后，试着用自己的话解释本课要点。学习状态由你手动设置。</span></div>
      <nav className="lesson-pagination" aria-label="课程翻页">{lesson.number > 1 ? <a href={lessonHref(lessons[lesson.number - 2].id)}><small>上一课</small><span>{lessons[lesson.number - 2].title}</span></a> : <a href="#/"><small>返回</small><span>课程总览</span></a>}{lesson.number < lessons.length ? <a className="next" href={lessonHref(lessons[lesson.number].id)}><small>下一课</small><span>{lessons[lesson.number].title}<Icon name="arrow" size={16}/></span></a> : <a className="next" href="#/"><small>已到最后一课</small><span>返回课程总览<Icon name="arrow" size={16}/></span></a>}</nav>
    </article>
    <aside className="page-toc" aria-label="本课目录"><div>本课目录</div>{lesson.sections.map((s, i) => <a className={section === String(i + 1) ? 'active' : ''} key={s} href={lessonHref(lesson.id) + '?section=' + (i + 1)}>{s}</a>)}<p>内容更新于 {catalog.updated}<br/>阅读不会自动改变掌握状态。</p></aside>
  </div>;
}

const toolNames: Record<string, string> = { A: '公式速查', B: '缩写词典', C: '检查清单', D: '官方资料' };
export function Toolbox({ id }: { id: string }) {
  const [content, setContent] = useState<{ tools: { id: string; markdown: string; title: string }[]; intro: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { import('./generated/tools.json').then(m => setContent(m.default)).catch(() => setError(true)); }, []);
  const active = catalog.tools.find(t => t.id === id) || catalog.tools[0];
  return <article className="toolbox-page">
    <nav className="breadcrumb" aria-label="面包屑"><a href="#/">课程总览</a><Icon name="chevron" size={13} /><span>工具箱</span></nav>
    <h1>手边的工具箱</h1><p className="page-description">计算、查词、检查电路时，随手翻一翻。</p>
    <nav className="tool-tabs" aria-label="工具分类">{catalog.tools.map(t => <a key={t.id} className={active.id === t.id ? 'active' : ''} aria-current={active.id === t.id ? 'page' : undefined} href={'#/tools/' + t.id}>{toolNames[t.id]}</a>)}</nav>
    <h2>{active.title}</h2>
    {error ? <p role="alert">工具内容加载失败，请重新载入后重试。</p> : !content ? <p role="status">正在加载工具…</p> : <Markdown text={content.tools.find(t => t.id === active.id)?.markdown || ''} />}
    {active.id === 'D' && <div className="official-supplement"><h3>嘉立创 EDA 专业版</h3><p>课程使用专业版。查阅<a href="https://prodocs.lceda.cn/cn/quick-start.html" target="_blank" rel="noopener noreferrer">官方快速入门指南 <Icon name="external" size={14}/></a>，原笔记中的资料入口也完整保留在上方。</p></div>}
    <details className="usage-guide"><summary>笔记的使用方式与知识边界</summary>{content && <Markdown text={content.intro} />}</details>
  </article>;
}
