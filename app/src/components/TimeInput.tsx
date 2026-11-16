import { useState, type InputHTMLAttributes } from 'react';

/**
 * Reads a time typed in any common way as 24-hour "HH:mm": "8:05", "0805", "805", "8.05", "20h05".
 * Returns null when it isn't a time.
 */
export function parseTime(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');
  if (!s) return null;
  const m =
    /^(\d{1,2})[:.hH](\d{2})$/.exec(s) ?? /^(\d{1,2})(\d{2})$/.exec(s) ?? /^(\d{1,2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * A 24-hour time field. Browsers show `<input type="time">` as "10:05 AM" when the system uses a
 * 12-hour clock; European timetables never do, so this is a text field that tidies up on blur.
 * `onChange` gets "HH:mm", '' when empty, or the raw text when it isn't a time yet.
 */
export function TimeInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
>) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  // Follow changes from outside (a timetable result, say) without fighting the typing.
  if (value !== seen) {
    setSeen(value);
    if (parseTime(text) !== value) setText(value);
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="hh:mm"
      maxLength={5}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        const next = v.trim() ? (parseTime(v) ?? v) : '';
        setSeen(next);
        onChange(next);
      }}
      onBlur={(e) => {
        const p = parseTime(text);
        if (p && p !== text) setText(p);
        rest.onBlur?.(e);
      }}
    />
  );
}
