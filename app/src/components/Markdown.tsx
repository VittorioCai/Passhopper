import { Fragment, type ReactNode } from 'react';

/**
 * A small, safe Markdown subset for assistant replies: paragraphs, bullet and numbered lists,
 * **bold**, `code` and [links](https://…). Everything is rendered as React text, never as HTML,
 * and only http(s) links are kept.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (!lines.length) return null;
        const bullet = /^\s*(?:[-*•]|\d+[.)])\s+/;
        if (lines.every((l) => bullet.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const items = lines.map((l, j) => <li key={j}>{inline(l.replace(bullet, ''))}</li>);
          return ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(bullet, '• ').replace(/^#+\s*/, ''))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

const TOKEN =
  /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)<>]+[^\s)<>.,;:!?])/g;

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const k = out.length;
    if (m[1]) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) out.push(<code key={k}>{m[2]}</code>);
    else {
      const href = m[4] ?? m[5]!;
      out.push(
        <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow">
          {m[3] ?? hostOf(href)}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
