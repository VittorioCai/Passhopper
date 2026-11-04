/** Calendar dates as 'YYYY-MM-DD' strings, computed in UTC so time zones never shift a day. */
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const toStr = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const addDays = (s: string, n: number) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);
export const todayLocal = () => {
  const n = new Date();
  return toStr(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
};

/** Formats a date for the UI language, e.g. "Wed, Jul 14" or "7月14日 周三". */
export function formatDate(s: string, lang: string, opts: { weekday?: boolean } = {}) {
  const d = toDate(s);
  if (lang.startsWith('zh')) {
    const wd = '日一二三四五六'[d.getUTCDay()];
    return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日${opts.weekday ? ` 周${wd}` : ''}`;
  }
  const md = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return opts.weekday ? `${WEEKDAYS[d.getUTCDay()]}, ${md}` : md;
}

/** Short day and month labels for compact date blocks. */
export function dateParts(s: string, lang: string) {
  const d = toDate(s);
  const zh = lang.startsWith('zh');
  return {
    month: zh ? `${d.getUTCMonth() + 1}月` : MONTHS[d.getUTCMonth()]!,
    day: d.getUTCDate(),
    weekday: zh ? `周${'日一二三四五六'[d.getUTCDay()]}` : WEEKDAYS[d.getUTCDay()]!,
  };
}

/** "4h 01m" in English, "4小时01分" in Chinese. */
export function formatDuration(minutes: number, lang: string) {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return lang.startsWith('zh') ? `${h}小时${m}分` : `${h}h ${m}m`;
}
