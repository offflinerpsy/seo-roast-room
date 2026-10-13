import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let hit: RegExpExecArray | null;
  while ((hit = pattern.exec(text))) {
    out.push(text.slice(last, hit.index));
    if (hit[1]) {
      let safe = false;
      try {
        const u = new URL(hit[2]);
        safe = !u.username && !u.password;
      } catch {}
      out.push(
        safe ? (
          <a key={hit.index} href={hit[2]} target="_blank" rel="noreferrer">
            {hit[1]}
          </a>
        ) : (
          hit[1]
        ),
      );
    } else out.push(<strong key={hit.index}>{hit[3]}</strong>);
    last = pattern.lastIndex;
  }
  out.push(text.slice(last));
  return out;
}
export function Dossier({ markdown }: { markdown: string }) {
  return (
    <div className="dossier-text">
      {markdown.split(/\r?\n/).map((line, i) => {
        if (!line.trim()) return null;
        if (/^# /.test(line)) return <h3 key={i}>{inline(line.slice(2))}</h3>;
        if (/^##?##? /.test(line)) return <h4 key={i}>{inline(line.replace(/^#+ /, ''))}</h4>;
        if (/^[-*] /.test(line))
          return (
            <p className="dossier-bullet" key={i}>
              {inline(line.slice(2))}
            </p>
          );
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
