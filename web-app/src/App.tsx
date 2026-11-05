import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { chapters, lessons, catalog, chapterById, lessonById, lessonHref, searchLessons, snippet, statusLabel, type StudyData, type Lesson } from './model';
import { loadData, saveData, parseBackup, serializeBackup, withReading, validateData } from './storage';
import Dialog from './Dialog';
import { Icon } from './Icons';
const Reader = lazy(() => import('./Reader').then(m => ({ default: m.Reader })));
const Toolbox = lazy(() => import('./Reader').then(m => ({ default: m.Toolbox })));
type Route = { kind: string; id: string; section: string | null };
function routeFromHash(): Route {
  const [path, search = ''] = location.hash.replace(/^#/, '').split('?');
  const [, kind = '', id = ''] = path.split('/');
  return { kind, id, section: new URLSearchParams(search).get('section') };
}
function Mark({ text, query }: { text: string; query: string }) {
  const term = query.trim().split(/\s+/)[0] || '';
  const start = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  return start < 0 ? <>{text}</> : <>{text.slice(0, start)}<mark>{text.slice(start, start + term.length)}</mark>{text.slice(start + term.length)}</>;
}
function CircuitDrawing() {
  return <svg className="circuit-drawing" viewBox="0 0 330 155" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 48h50v-8h26v16H72v-8m26 0h40v50h32m56 0h80V48h-38M22 48v70h44m18 0h54m0-20v20M66 110v16m7-21v26m7-21v16"/>
      <rect x="170" y="70" width="56" height="56" rx="4"/><path d="M180 70V60m12 10V60m12 10V60m12 10V60m-36 66v10m12-10v10m12-10v10m12-10v10M170 80h-10m10 12h-10m10 12h-10m10 12h-10m66-36h10m-10 12h10m-10 12h10m-10 12h10M198 60V30h70v18"/>
      <circle cx="22" cy="48" r="4" fill="var(--paper)"/><circle cx="138" cy="98" r="3" fill="currentColor"/><path d="M256 48h24m-20-6v12m16-12v12"/>
    </g><text x="187" y="102" fill="currentColor" fontSize="10" fontFamily="Bahnschrift, sans-serif">MCU</text><text x="70" y="28" fill="currentColor" fontSize="10" fontFamily="Bahnschrift, sans-serif">R1</text><text x="44" y="145" fill="currentColor" fontSize="10" fontFamily="Bahnschrift, sans-serif">3.3 V</text>
  </svg>;
}
export default function App() {
  const initial = useRef<ReturnType<typeof loadData> | null>(null);
  if (!initial.current) initial.current = loadData();
  const [data, setData] = useState(initial.current.data);
  const dataRef = useRef(data);
  const [storageError, setStorageError] = useState(initial.current.error);
  const blockedStorage = useRef(!!initial.current.error);
  const [route, setRoute] = useState(routeFromHash);
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(['C2']);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingImport, setPendingImport] = useState<StudyData | null>(null);
  const [importError, setImportError] = useState('');
  const [undo, setUndo] = useState<StudyData | null>(null);
  const [toast, setToast] = useState('');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lesson = route.kind === 'lesson' ? lessonById(route.id) : undefined;

  const commit = useCallback((next: StudyData, force = false) => {
    dataRef.current = next; setData(next);
    if (force) blockedStorage.current = false;
    if (!blockedStorage.current) setStorageError(saveData(next));
  }, []);
  useEffect(() => {
    const change = () => { setRoute(routeFromHash()); setDrawer(false); };
    addEventListener('hashchange', change);
    const keyboard = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(s => !s); } };
    addEventListener('keydown', keyboard);
    const sync = (e: StorageEvent) => {
      if (e.key === 'circuit-notes.study.v1' && e.newValue) {
        try { const incoming = validateData(JSON.parse(e.newValue)); dataRef.current = incoming; setData(incoming); setStorageError(''); blockedStorage.current = false; }
        catch { setStorageError('其他标签页的进度无法读取，请先导出当前进度。'); }
      }
    };
    addEventListener('storage', sync);
    return () => { removeEventListener('hashchange', change); removeEventListener('keydown', keyboard); removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const resolved = data.theme === 'system' ? (media.matches ? 'dark' : 'light') : data.theme; setResolvedTheme(resolved); document.documentElement.dataset.theme = resolved; document.documentElement.dataset.font = data.font_size; };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [data.theme, data.font_size]);
  useEffect(() => {
    if (lesson) commit(withReading(dataRef.current, lesson.id));
  }, [lesson?.id, commit]);
  useEffect(() => {
    if (lesson) setExpanded(s => s.includes(lesson.chapterId) ? s : [...s, lesson.chapterId]);
    const title = lesson?.title || (route.kind === 'chapter' ? chapterById(route.id)?.title : undefined) || ({ bookmarks: '我的收藏', recent: '最近阅读', settings: '数据与设置', tools: '工具箱' }[route.kind] || '课程总览');
    document.title = title + ' · 电路手记';
    if (!route.section) { scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true }); }
  }, [route.kind, route.id]);
  useEffect(() => { if (search) setTimeout(() => searchRef.current?.focus(), 30); }, [search]);
  useEffect(() => {
    if (!drawerRef.current) return;
    if (drawer) drawerRef.current.showModal(); else drawerRef.current.close();
    return () => { if (drawerRef.current?.open) drawerRef.current.close(); };
  }, [drawer]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  const learned = lessons.filter(l => data.statuses[l.id] === 'learned').length;
  const learning = lessons.filter(l => data.statuses[l.id] === 'learning').length;
  const nextLesson = (data.last_read && lessonById(data.last_read.lesson_id)) || lessons.find(l => data.statuses[l.id] !== 'learned') || lessons[0];
  function bookmark(id: string) {
    const saved = dataRef.current.bookmarks.includes(id);
    commit({ ...dataRef.current, bookmarks: saved ? dataRef.current.bookmarks.filter(v => v !== id) : [...dataRef.current.bookmarks, id] });
    setToast(saved ? '已取消收藏' : '已加入我的收藏');
  }
  function exportData() {
    const raw = serializeBackup(dataRef.current);
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'circuit-notes-progress-' + new Date().toISOString().slice(0, 10) + '.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('已导出进度备份');
  }
  const nav = <>
    <a href="#/" className="brand"><span className="brand-symbol"><Icon name="circuit" size={25}/></span><span><strong>电路手记</strong><small>STM32 硬件与 PCB</small></span></a>
    <div className="sidebar-links">
      {[['', 'home', '课程总览'], ['bookmarks', 'bookmark', '我的收藏'], ['recent', 'clock', '最近阅读']].map(([path, icon, title]) => <a key={path} className={route.kind === path ? 'active' : ''} aria-current={route.kind === path ? 'page' : undefined} href={'#/' + path}><Icon name={icon} size={18}/>{title}{path === 'bookmarks' && <span className="nav-count">{data.bookmarks.length}</span>}</a>)}
    </div>
    <div className="directory-title"><span>课程目录</span><span>78 课</span></div>
    <nav className="chapter-directory" aria-label="章节目录">{chapters.map(c => {
      const open = expanded.includes(c.id);
      const done = c.lessonIds.filter(id => data.statuses[id] === 'learned').length;
      return <div className={'directory-chapter' + (lesson?.chapterId === c.id || route.id === c.id ? ' current-chapter' : '')} key={c.id}>
        <div className="directory-row"><button className="chapter-toggle" aria-label={(open ? '折叠' : '展开') + c.label} aria-expanded={open} onClick={() => setExpanded(s => open ? s.filter(id => id !== c.id) : [...s, c.id])}><Icon name="chevron" size={14}/></button><a href={'#/chapter/' + c.id}><span>{c.label}</span><strong>{c.title}</strong></a><small>{done}/{c.lessonIds.length}</small></div>
        {open && <div className="directory-lessons">{c.lessonIds.map(id => { const l = lessonById(id)!; return <a key={id} href={lessonHref(id)} className={lesson?.id === id ? 'active' : ''} aria-current={lesson?.id === id ? 'page' : undefined}><span className={'lesson-dot ' + data.statuses[id]}>{data.statuses[id] === 'learned' ? <Icon name="check" size={10}/> : null}</span><span><small>{String(l.number).padStart(2, '0')}</small>{l.title}</span></a>; })}</div>}
      </div>;
    })}</nav>
    <div className="sidebar-bottom"><a href="#/tools/A" className={route.kind === 'tools' ? 'active' : ''}><Icon name="tool" size={18}/>工具箱</a><a href="#/settings" className={route.kind === 'settings' ? 'active' : ''}><Icon name="settings" size={18}/>数据与设置</a><p><i/>阅读记录仅保存在当前浏览器</p></div>
  </>;
  const lessonRows = (rows: Lesson[], recent = false) => <div className="lesson-list">{rows.map(l => <a key={l.id} className="lesson-row" href={lessonHref(l.id)}><span className="row-number">{String(l.number).padStart(2, '0')}</span><span className="row-content"><strong>{l.title}</strong><small>{chapterById(l.chapterId)?.label}{recent && '　' + new Date(data.recent.find(r => r.lesson_id === l.id)!.read_at).toLocaleDateString('zh-CN')}</small></span><span className={'status ' + data.statuses[l.id]}><i/>{statusLabel[data.statuses[l.id]]}</span><Icon name="chevron" size={15}/></a>)}</div>;
  let page;
  if (lesson) {
    page = <Reader lesson={lesson} data={data} section={route.section} changeStatus={s => commit({ ...dataRef.current, statuses: { ...dataRef.current.statuses, [lesson.id]: s } })} bookmark={() => bookmark(lesson.id)} />;
  } else if (route.kind === 'chapter' && chapterById(route.id)) {
    const c = chapterById(route.id)!;
    const done = c.lessonIds.filter(id => data.statuses[id] === 'learned').length;
    page = <div className="content-page"><nav className="breadcrumb"><a href="#/">课程总览</a><Icon name="chevron" size={13}/><span>{c.label}</span></nav><span className="chapter-page-label">{c.label} / 共 {c.lessonIds.length} 课</span><h1>{c.title}</h1><p className="page-description">{c.goal}</p><div className="chapter-summary"><span>{done} 课已掌握</span><div className="progress-track"><i style={{ width: done / c.lessonIds.length * 100 + '%' }}/></div><span>{c.lessonIds.length - done} 课待学习</span></div>{lessonRows(lessons.filter(l => l.chapterId === c.id))}<nav className="chapter-bottom">{c.number > 1 && <a href={'#/chapter/C' + (c.number - 1)}>上一章</a>}{c.number < 8 && <a href={'#/chapter/C' + (c.number + 1)}>下一章<Icon name="arrow" size={17}/></a>}</nav></div>;
  } else if (route.kind === 'tools') {
    page = <Toolbox id={route.id} />;
  } else if (route.kind === 'bookmarks' || route.kind === 'recent') {
    const isRecent = route.kind === 'recent';
    const rows = isRecent ? data.recent.map(r => lessonById(r.lesson_id)!) : lessons.filter(l => data.bookmarks.includes(l.id));
    page = <div className="content-page"><div className="page-symbol"><Icon name={isRecent ? 'clock' : 'bookmark'} size={27}/></div><h1>{isRecent ? '最近阅读' : '我的收藏'}</h1><p className="page-description">{isRecent ? '保留最近打开的 20 节课，随时接着读。' : '把常翻的章节放在这里，下次更快找到。'}</p>{rows.length ? lessonRows(rows, isRecent) : <div className="empty-state"><Icon name={isRecent ? 'clock' : 'bookmark'} size={35}/><h2>{isRecent ? '还没有阅读记录' : '还没有收藏的笔记'}</h2><p>{isRecent ? '打开任意一课，这里就会留下阅读记录。' : '在单课页点“收藏本课”，就能在这里找到。'}</p><a className="button primary" href="#/">去翻翻课程</a></div>}</div>;
  } else if (route.kind === 'settings') {
    page = <div className="content-page settings-page"><h1>数据与设置</h1><p className="page-description">调到舒服的阅读方式，也把自己的进度好好留住。</p><section className="settings-section"><h2>阅读偏好</h2><div className="preference-row"><div><strong>外观主题</strong><p>可以跟随设备的明暗设置。</p></div><select aria-label="外观主题" value={data.theme} onChange={e => commit({ ...dataRef.current, theme: e.target.value as StudyData['theme'] })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></div><div className="preference-row"><div><strong>正文字号</strong><p>大字号也适用于手机阅读。</p></div><select aria-label="正文字号" value={data.font_size} onChange={e => commit({ ...dataRef.current, font_size: e.target.value as StudyData['font_size'] })}><option value="normal">标准</option><option value="large">大字号</option></select></div></section>
      <section className="settings-section"><h2>备份与迁移</h2><div className="storage-explanation"><Icon name="info"/><div><strong>进度只保存在当前浏览器，不会自动跨设备同步。</strong><p>手机和电脑、不同浏览器以及本地预览与线上网站的记录各自独立。迁移时，先导出 JSON，再在另一设备导入。清理网站数据后，本机记录会丢失；保留的 JSON 可以恢复进度。</p></div></div><p className="backup-summary">当前记录：{learned} 课已掌握，{learning} 课学习中，{data.bookmarks.length} 个收藏。</p><div className="backup-actions"><button className="button primary" onClick={exportData}><Icon name="download" size={17}/>导出进度 JSON</button><label className="button file-button"><Icon name="upload" size={17}/>导入进度 JSON<input type="file" accept=".json,application/json" aria-label="导入进度 JSON" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setImportError(''); try { if (file.size > 1024 * 1024) throw new Error('请选择小于 1 MB 的进度 JSON 文件。'); setPendingImport(parseBackup(await file.text())); } catch (err) { setImportError(err instanceof SyntaxError ? 'JSON 文件无法解析，请重新选择电路手记导出的备份。' : String((err as Error).message)); } }}/></label></div>{importError && <p className="error-message" role="alert">{importError}</p>}{undo && <button className="text-button" onClick={() => { commit(undo, true); setUndo(null); setToast('已撤销本次导入'); }}>撤销本次导入</button>}</section>
      <section className="settings-section"><h2>关于这本笔记</h2><p>8 个知识章节，78 节完整讲义，内容更新于 {catalog.updated}。初始仅第 01—05 课已完成过阶段考核，第 06—78 课为待学习讲义。阅读不会自动标记掌握。</p><p>正文来自原始 Markdown，公式、缩写、检查流程和权威资料收录在工具箱中。无需账号即可阅读。</p><a className="text-link" href="#/tools/D">查看官方参考资料<Icon name="external" size={15}/></a></section></div>;
  } else if (!route.kind) {
    page = <div className="home-page"><header className="home-intro"><div><div className="home-caption"><span className="caption-line"/>一本随时能翻的硬件笔记</div><h1>从一条回路，<br/>读懂一块电路板。</h1><p>从电路基础到 STM32 最小系统，再到双层 PCB。<br className="desktop-break"/>按章节慢慢理解，遇到问题随时回来查。</p></div><CircuitDrawing/></header>
      <section className="reading-summary" aria-label="学习概况"><div className="summary-progress"><span className="progress-ring" style={{ '--progress': learned / lessons.length * 100 + '%' } as React.CSSProperties}><strong>{learned}</strong></span><div><strong>{learned} 课已掌握 <span>/ 78 课</span></strong><p>{learning > 0 ? learning + ' 课学习中，' : ''}{78 - learned - learning} 课未开始，按自己的节奏来。</p></div></div><div className="summary-note"><Icon name="book" size={19}/><span>8 章完整笔记<br/><small>不赶进度，理解后再标记</small></span></div></section>
      <a className="continue-reading" href={lessonHref(nextLesson.id)}><div className="continue-icon"><Icon name="book" size={25}/></div><div><small>{data.last_read ? '接着上次读' : '从这里继续'}</small><strong><span>第 {String(nextLesson.number).padStart(2, '0')} 课</span>{nextLesson.title}</strong></div><span className="continue-button">{data.last_read ? '继续阅读' : '打开笔记'}<Icon name="arrow" size={17}/></span></a>
      <section className="course-section"><div className="section-heading"><h2>课程目录</h2><span>从基础，到一块自己的板子</span></div><div className="chapter-grid">{chapters.map(c => { const done = c.lessonIds.filter(id => data.statuses[id] === 'learned').length; return <a className="chapter-card" key={c.id} href={'#/chapter/' + c.id}><span className={'chapter-index' + (done === c.lessonIds.length ? ' completed' : '')}>{done === c.lessonIds.length ? <Icon name="check" size={20}/> : String(c.number).padStart(2, '0')}</span><div><div className="chapter-card-meta"><span>{c.label}</span><span>第 {String(lessonById(c.lessonIds[0])!.number).padStart(2, '0')}—{String(lessonById(c.lessonIds.at(-1)!)!.number).padStart(2, '0')} 课</span></div><h3>{c.title}</h3><p>{c.goal}</p><div className="chapter-card-progress"><div className="progress-track"><i style={{ width: done / c.lessonIds.length * 100 + '%' }}/></div><small>{done}/{c.lessonIds.length}</small></div></div><Icon name="chevron" size={17}/></a>; })}</div></section>
      <section className="toolbox-strip"><div><Icon name="tool" size={21}/><h2>工具箱</h2><span>常用的，放手边</span></div><nav>{[['A', '公式速查'], ['B', '缩写词典'], ['C', '检查清单'], ['D', '官方资料']].map(([id, name]) => <a href={'#/tools/' + id} key={id}>{name}<Icon name="chevron" size={14}/></a>)}</nav></section>
      <footer className="home-footer"><Icon name="info" size={15}/><p>第 01—05 课已有阶段考核记录，其余讲义待学习。学习状态可随时调整。</p><a href="#/settings">本地进度与备份</a></footer></div>;
  } else {
    page = <div className="content-page empty-state"><Icon name="book" size={35}/><h1>没有找到这页笔记</h1><p>请从课程目录重新选择一课。</p><a className="button primary" href="#/">返回课程总览</a></div>;
  }
  const results = searchLessons(query);
  return <>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); mainRef.current?.focus(); }}>跳到正文</a>
    <aside className="desktop-sidebar">{nav}</aside>
    <dialog className="mobile-drawer" ref={drawerRef} aria-label="移动端课程目录" onCancel={e => { e.preventDefault(); setDrawer(false); }} onClick={e => { if (e.target === e.currentTarget) setDrawer(false); }}><button className="drawer-close icon-button" aria-label="关闭目录" onClick={() => setDrawer(false)}><Icon name="close"/></button>{nav}</dialog>
    <div className="app-shell"><header className="topbar"><div className="topbar-location"><button className="icon-button mobile-menu" aria-label="打开课程目录" onClick={() => setDrawer(true)}><Icon name="menu"/></button><span>{lesson ? chapterById(lesson.chapterId)?.label : ({ chapter: chapterById(route.id)?.label, tools: '工具箱', settings: '数据与设置', bookmarks: '我的收藏', recent: '最近阅读' }[route.kind] || '课程总览')}</span></div><div className="topbar-tools"><button className="search-trigger" aria-label="搜索全部笔记" onClick={() => setSearch(true)}><Icon name="search" size={17}/><span>搜索笔记、元件、公式…</span><kbd>Ctrl K</kbd></button><span className="topbar-divider"/><button className="icon-button theme-toggle" aria-label={resolvedTheme === 'dark' ? '切换浅色主题' : '切换深色主题'} onClick={() => commit({ ...dataRef.current, theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}><Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={19}/></button></div></header>
    {storageError && <div className="storage-warning" role="alert">{storageError} <a href="#/settings">管理备份</a></div>}
    <main id="main-content" ref={mainRef} tabIndex={-1}><Suspense fallback={<p className="loading" role="status">正在打开笔记…</p>}>{page}</Suspense></main></div>
    {search && <Dialog title="搜索全部笔记" wide close={() => setSearch(false)}><div className="search-field"><Icon name="search"/><input ref={searchRef} type="search" placeholder="试试“上拉”“MOSFET”“SWD”" value={query} onChange={e => setQuery(e.target.value)} aria-label="搜索关键词"/></div><div className="search-results" aria-live="polite">{!query.trim() ? <div className="search-hints"><p>检索全部 78 课的标题和正文</p>{['上拉', 'MOSFET', 'SWD', 'PCB'].map(term => <button key={term} onClick={() => setQuery(term)}>{term}</button>)}<p><small>多个关键词用空格分开；结果需同时包含这些词。</small></p></div> : <><p className="result-count">找到 {results.length} 节相关笔记</p>{results.length ? results.map(l => <a href={lessonHref(l.id)} className="search-result" key={l.id} onClick={() => { setSearch(false); if (lesson?.id === l.id) scrollTo(0, 0); }}><small>{chapterById(l.chapterId)?.label} / 第 {String(l.number).padStart(2, '0')} 课</small><strong><Mark text={l.title} query={query}/></strong><p><Mark text={snippet(l, query)} query={query}/></p></a>) : <div className="empty-state"><p>换个关键词试试，例如元件名称或课次标题。</p></div>}</>}</div></Dialog>}
    {pendingImport && <Dialog title="核对导入的进度" close={() => setPendingImport(null)}><div className="import-preview"><p>这份备份包含全部 78 课：</p><div className="import-counts"><span><strong>{Object.values(pendingImport.statuses).filter(s => s === 'learned').length}</strong>已掌握</span><span><strong>{Object.values(pendingImport.statuses).filter(s => s === 'learning').length}</strong>学习中</span><span><strong>{pendingImport.bookmarks.length}</strong>收藏</span></div><p>确认后将替换当前浏览器的进度、收藏、最近阅读及阅读偏好。导入前会自动下载一份当前记录备份；本次打开期间也可撤销。</p><div className="dialog-actions"><button className="button" onClick={() => setPendingImport(null)}>取消</button><button className="button primary" onClick={() => { exportData(); setUndo(dataRef.current); commit(pendingImport, true); setPendingImport(null); setToast('进度已导入，可在设置中撤销'); }}>备份当前并导入</button></div></div></Dialog>}
    {toast && <div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </>;
}
