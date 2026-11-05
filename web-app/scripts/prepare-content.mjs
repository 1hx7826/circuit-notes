import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export function parseCourse(source) {
  const chapterMatches = [...source.matchAll(/^# 第([一二三四五六七八]+)章｜(.+)$/gm)];
  const end = source.indexOf('# 附录 A');
  if (chapterMatches.length !== 8 || end < 0) throw new Error('Expected 8 course chapters and appendices.');
  const lessonMatches = [...source.matchAll(/^<!-- lesson_id: (L\d{3}); status: (learned|planned) -->\r?\n## 第 (\d{2}) 课｜(.+)$/gm)];
  if (lessonMatches.length !== 78) throw new Error('Expected 78 lessons.');
  const chapters = chapterMatches.map((m, i) => ({ id: 'C' + (i + 1), number: i + 1, title: m[2].trim(), label: '第' + m[1] + '章', goal: source.slice(m.index + m[0].length, lessonMatches.find(l => l.index > m.index)?.index).match(/> 阶段目标：(.+)/)?.[1] || '', lessonIds: [] }));
  const lessons = lessonMatches.map((m, i) => {
    if (m[1] !== 'L' + String(i + 1).padStart(3, '0') || Number(m[3]) !== i + 1 || m[2] !== (i < 5 ? 'learned' : 'planned')) throw new Error('Invalid lesson sequence or initial state at ' + m[1]);
    const chapterIndex = chapterMatches.findLastIndex(c => c.index < m.index);
    const chapter = chapters[chapterIndex];
    chapter.lessonIds.push(m[1]);
    const stop = Math.min(lessonMatches[i + 1]?.index ?? end, chapterMatches[chapterIndex + 1]?.index ?? end, end);
    const markdown = source.slice(m.index + m[0].length, stop).trim().replace(/\n---\s*$/, '').trim();
    const sections = [...markdown.matchAll(/^### (.+)$/gm)].map(s => s[1].trim());
    if (!['本课要点', '易错点', '自检'].every(s => sections.includes(s)) || markdown.length < 180) throw new Error('Incomplete lesson ' + m[1]);
    return { id: m[1], number: i + 1, title: m[4].trim(), chapterId: chapter.id, initialStatus: m[2], metadata: m[0].split('\n')[0], markdown, sections };
  });
  const appendixMatches = [...source.matchAll(/^# 附录 ([A-E])｜(.+)$/gm)];
  if (appendixMatches.length !== 5) throw new Error('Expected appendices A–E.');
  const tools = appendixMatches.slice(0, 4).map((m, i) => ({ id: m[1], title: m[2].trim(), markdown: source.slice(m.index + m[0].length, appendixMatches[i + 1].index).trim() }));
  const intro = source.slice(source.indexOf('# STM32'), source.indexOf('## 学习目录')).trim();
  return { chapters, lessons, tools, intro };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const source = readFileSync(resolve(root, 'content/course.md'), 'utf8');
  const parsed = parseCourse(source);
  const dest = resolve(root, 'web-app/src/generated');
  mkdirSync(resolve(dest, 'lessons'), { recursive: true });
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const catalog = {
    version: '1.0.0', sourceHash, updated: '2026-11-05', chapters: parsed.chapters,
    lessons: parsed.lessons.map(({ markdown, metadata, ...rest }) => ({ ...rest, searchText: markdown.replace(/[*$#\x60]/g, '') })),
    tools: parsed.tools.map(({ markdown, ...rest }) => rest)
  };
  writeFileSync(resolve(dest, 'catalog.json'), JSON.stringify(catalog));
  for (const lesson of parsed.lessons) writeFileSync(resolve(dest, 'lessons', lesson.id + '.json'), JSON.stringify(lesson));
  writeFileSync(resolve(dest, 'tools.json'), JSON.stringify({ tools: parsed.tools, intro: parsed.intro }));
  mkdirSync(resolve(root, 'docs'), { recursive: true });
  writeFileSync(resolve(root, 'docs/CONTENT_INVENTORY.md'), '# 内容解析核对\n\n8 个知识章节，78 节课，工具箱收录附录 A—D；开发说明 E 不进入阅读菜单。\n\n正文源：content/course.md。SHA-256：' + sourceHash + '\n\n' + parsed.chapters.map(c => '## ' + c.label + '｜' + c.title + '\n\n' + parsed.lessons.filter(l => l.chapterId === c.id).map(l => '- ' + l.id + '　第 ' + String(l.number).padStart(2, '0') + ' 课｜' + l.title + '（' + (l.initialStatus === 'learned' ? '已掌握' : '未开始') + '）').join('\n')).join('\n\n') + '\n');
  console.log('Content verified: 8 chapters, 78 complete lessons, 4 reading appendices. Initial progress: 5 learned, 73 planned.');
}
