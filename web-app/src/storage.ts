import { defaultData, validId, STORAGE_KEY, type StudyData, type Recent, type Status } from './model';
const allowedStatuses = ['planned', 'learning', 'learned'];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function readRecent(value: unknown): Recent {
  if (!isObject(value) || !validId(value.lesson_id) || typeof value.read_at !== 'string' || !Number.isFinite(Date.parse(value.read_at))) throw new Error('最近阅读记录无效。');
  return { lesson_id: value.lesson_id, read_at: value.read_at };
}
export function validateData(value: unknown): StudyData {
  if (!isObject(value) || value.schema_version !== 1) throw new Error('备份格式或版本不受支持。请选择电路手记导出的 JSON。');
  if (!isObject(value.statuses) || !Array.isArray(value.bookmarks) || !Array.isArray(value.recent) || value.recent.length > 20) throw new Error('备份缺少完整的进度、收藏或最近阅读。');
  const data = defaultData();
  if (Object.keys(value.statuses).length !== Object.keys(data.statuses).length) throw new Error('备份需包含全部 78 课的状态。');
  for (const [id, status] of Object.entries(value.statuses)) {
    if (!validId(id) || typeof status !== 'string' || !allowedStatuses.includes(status)) throw new Error('备份中包含无效课次或学习状态。');
    data.statuses[id] = status as Status;
  }
  if (!value.bookmarks.every(validId)) throw new Error('收藏中包含未知课次。');
  data.bookmarks = [...new Set(value.bookmarks as string[])];
  data.recent = value.recent.map(readRecent).filter((r, i, all) => all.findIndex(a => a.lesson_id === r.lesson_id) === i);
  data.last_read = value.last_read === null ? null : readRecent(value.last_read);
  if (!['light', 'dark', 'system'].includes(String(value.theme)) || !['normal', 'large'].includes(String(value.font_size))) throw new Error('主题或字号设置无效。');
  data.theme = value.theme as StudyData['theme'];
  data.font_size = value.font_size as StudyData['font_size'];
  return data;
}
export function parseBackup(text: string): StudyData {
  if (text.length > 1024 * 1024) throw new Error('备份文件超过 1 MB，请确认选择了正确文件。');
  const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!isObject(value) || value.app !== 'circuit-notes') throw new Error('这不是电路手记的备份。');
  return validateData(value);
}
export function serializeBackup(data: StudyData) {
  return JSON.stringify({ app: 'circuit-notes', exported_at: new Date().toISOString(), ...validateData(data) }, null, 2);
}
export function loadData(): { data: StudyData; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? validateData(JSON.parse(raw)) : defaultData(), error: '' };
  } catch {
    return { data: defaultData(), error: '浏览器存储不可用或已有记录无法读取。原记录未被覆盖；请导出当前进度，或在数据设置中导入有效备份后恢复。' };
  }
}
export function saveData(data: StudyData): string {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validateData(data))); return ''; }
  catch { return '进度暂时无法保存到浏览器。请先导出 JSON 备份，再检查浏览器的存储设置。'; }
}
export function withReading(data: StudyData, id: string, now = new Date().toISOString()): StudyData {
  if (!validId(id)) return data;
  const item = { lesson_id: id, read_at: now };
  return { ...data, last_read: item, recent: [item, ...data.recent.filter(r => r.lesson_id !== id)].slice(0, 20) };
}
