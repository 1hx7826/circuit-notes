import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseCourse } from '../scripts/prepare-content.mjs';
import { catalog, lessons, defaultData, searchLessons, STORAGE_KEY } from '../src/model';
import { parseBackup, serializeBackup, validateData, withReading, loadData, saveData } from '../src/storage';
import Markdown from '../src/Markdown';

const source = readFileSync(resolve('../content/course.md'), 'utf8');
const parsed = parseCourse(source);
afterEach(() => vi.unstubAllGlobals());
describe('Markdown content boundaries and fidelity', () => {
  it('has exactly eight chapters and 78 continuous stable IDs', () => {
    expect(parsed.chapters).toHaveLength(8);
    expect(parsed.lessons.map(l => l.id)).toEqual(Array.from({ length: 78 }, (_, i) => 'L' + String(i + 1).padStart(3, '0')));
    expect(parsed.chapters.flatMap(c => c.lessonIds)).toEqual(parsed.lessons.map(l => l.id));
    expect(parsed.chapters.map(c => c.lessonIds.length)).toEqual([5, 13, 11, 10, 9, 9, 12, 9]);
  });
  it('separates appendices A–D and excludes developer instructions from public data', () => {
    expect(parsed.tools.map(t => t.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(JSON.stringify(catalog)).not.toContain('给 Codex');
    expect(parsed.tools.every(t => !t.markdown.includes('# 附录 E'))).toBe(true);
    expect(parsed.intro).toContain('实践安全');
    expect(parsed.intro).toContain('如何使用');
  });
  it('retains exact lesson text from source, including metadata and all formulas', () => {
    for (const lesson of parsed.lessons) {
      const generated = JSON.parse(readFileSync(resolve('src/generated/lessons', lesson.id + '.json'), 'utf8'));
      expect(generated).toEqual(lesson);
      expect(source).toContain(lesson.markdown);
      expect(lesson.metadata).toContain('lesson_id: ' + lesson.id);
      expect(lesson.sections).toContain('自检');
    }
  });
  it('rejects missing lessons and false initial mastery', () => {
    expect(() => parseCourse(source.replace('lesson_id: L078', 'lesson_id: L077'))).toThrow();
    expect(() => parseCourse(source.replace('L006; status: planned', 'L006; status: learned'))).toThrow();
  });
  it('renders every lesson with no invalid formulas or missing final self-check', () => {
    let formulaCount = 0;
    for (const l of parsed.lessons) {
      const html = renderToStaticMarkup(createElement(Markdown, { text: l.markdown, sections: l.sections }));
      expect(html).toContain('自检');
      expect(html).toContain('本课要点');
      expect(html).not.toContain('katex-error');
      expect(html).not.toContain('**');
      formulaCount += (html.match(/class="katex"/g) || []).length;
    }
    expect(formulaCount).toBeGreaterThan(40);
  });
  it('renders appendix formulas, tables, links and fenced code without raw HTML execution', () => {
    const appendix = renderToStaticMarkup(createElement(Markdown, { text: parsed.tools[0].markdown }));
    expect(appendix).toContain('table-scroll');
    expect(appendix).toContain('class="katex"');
    expect(appendix).not.toContain('katex-error');
    const sample = renderToStaticMarkup(createElement(Markdown, { text: '中文\n\n~~~c\nconst voltage = 3.3;\n~~~\n\n[资料](https://www.st.com)\n\n<script>alert(1)</script>' }));
    expect(sample).toContain('<pre><code class="language-c">');
    expect(sample).toContain('rel="noopener noreferrer"');
    expect(sample).not.toContain('<script>');
  });
});
describe('Real progress and backup boundaries', () => {
  it('starts with only L001–L005 learned and no fake reading history', () => {
    const data = defaultData();
    expect(Object.values(data.statuses).filter(s => s === 'learned')).toHaveLength(5);
    expect(Object.values(data.statuses).filter(s => s === 'planned')).toHaveLength(73);
    expect(data.last_read).toBeNull();
    expect(data.recent).toEqual([]);
  });
  it('reading updates recent history without changing mastery', () => {
    const data = defaultData();
    const read = withReading(data, 'L006', '2026-11-05T08:00:00Z');
    expect(read.statuses).toEqual(data.statuses);
    expect(read.last_read?.lesson_id).toBe('L006');
    expect(read.statuses.L006).toBe('planned');
  });
  it('keeps recent lessons distinct and bounded at 20', () => {
    let data = defaultData();
    for (const l of lessons) data = withReading(data, l.id);
    data = withReading(data, 'L078');
    expect(data.recent).toHaveLength(20);
    expect(new Set(data.recent.map(r => r.lesson_id)).size).toBe(20);
    expect(withReading(data, 'L999')).toBe(data);
  });
  it('round-trips every progress field and manual state', () => {
    const data = withReading(defaultData(), 'L006');
    data.statuses.L006 = 'learning'; data.bookmarks = ['L006', 'L078']; data.theme = 'dark'; data.font_size = 'large';
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it.each(['schema_version', 'statuses', 'bookmarks', 'recent', 'last_read', 'theme', 'font_size'])('rejects a backup missing %s', field => {
    const data = JSON.parse(serializeBackup(defaultData())); delete data[field];
    expect(() => parseBackup(JSON.stringify(data))).toThrow();
  });
  it('rejects unknown lessons, unsupported states and prototype keys', () => {
    const a = defaultData(); a.statuses.L999 = 'learned';
    expect(() => validateData(a)).toThrow();
    const b = defaultData(); b.statuses.L006 = 'fake' as never;
    expect(() => validateData(b)).toThrow();
    expect(() => parseBackup('{"app":"other","schema_version":1}')).toThrow();
    expect(() => parseBackup('x'.repeat(1024 * 1024 + 1))).toThrow();
    expect(() => validateData(JSON.parse(JSON.stringify(defaultData()).replace('"L006"', '"__proto__"')))).toThrow();
  });
  it('rejects invalid recent timestamps and bookmark IDs', () => {
    const data = defaultData(); data.bookmarks = ['L999'];
    expect(() => validateData(data)).toThrow();
    const data2 = defaultData(); data2.last_read = { lesson_id: 'L006', read_at: 'invalid' };
    expect(() => validateData(data2)).toThrow();
  });
  it('does not mutate current data while validating malformed imports', () => {
    const data = defaultData(); const before = JSON.stringify(data);
    expect(() => parseBackup('{"app":"circuit-notes","schema_version":1,"statuses":{}}')).toThrow();
    expect(JSON.stringify(data)).toBe(before);
  });
  it('loads and persists valid local state', () => {
    const map = new Map();
    vi.stubGlobal('localStorage', { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value) });
    expect(loadData().data).toEqual(defaultData());
    const data = withReading(defaultData(), 'L025'); data.bookmarks = ['L025'];
    expect(saveData(data)).toBe('');
    expect(loadData().data).toEqual(data);
    expect(map.has(STORAGE_KEY)).toBe(true);
  });
  it('reports unavailable or corrupt storage and leaves the raw record intact', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '{broken', setItem });
    expect(loadData().error).not.toBe('');
    expect(setItem).not.toHaveBeenCalled();
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } });
    expect(loadData().error).not.toBe('');
    expect(saveData(defaultData())).not.toBe('');
  });
});
describe('Local full-text search', () => {
  it.each(['上拉', 'MOSFET', 'SWD', 'PCB'])('finds %s in real course content', term => {
    expect(searchLessons(term).length).toBeGreaterThan(0);
    expect(searchLessons(term).every(l => (l.title + l.searchText).toLowerCase().includes(term.toLowerCase()))).toBe(true);
  });
  it('supports body-only text, case-insensitive terms and multiword AND searches', () => {
    expect(searchLessons('悬空')).toContainEqual(expect.objectContaining({ id: 'L005' }));
    expect(searchLessons('mosfet')).toContainEqual(expect.objectContaining({ id: 'L014' }));
    expect(searchLessons('SWD GND').every(l => /swd/i.test(l.title + l.searchText) && /gnd/i.test(l.title + l.searchText))).toBe(true);
    expect(searchLessons('')).toEqual([]);
    expect(searchLessons('不存在的关键词xyz')).toEqual([]);
  });
});
