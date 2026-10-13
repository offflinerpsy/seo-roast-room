import type { Expert, Session } from './types';

/** All report sections remain printable regardless of the current tab or replay. */
export function PrintReport({ session: s, experts }: { session: Session; experts: Expert[] }) {
  const ru = s.language === 'ru';
  const t = (a: string, b: string) => (ru ? a : b);
  return (
    <article className="print-report">
      <header>
        <p>
          SEO ROAST ROOM · {s.id} · v{s.revision} · {s.status}
        </p>
        <h1>{s.title}</h1>
        <p>
          {t(
            'AI-образы: вымышленная интерпретация публичных работ, не реальные высказывания или одобрение авторов.',
            'AI simulations: fictional interpretations of public work, not actual statements or creator endorsements.',
          )}
        </p>
        {s.demo && (
          <strong>
            {t(
              'ВЫМЫШЛЕННЫЙ ПРИМЕР — сайт не проверялся.',
              'FICTIONAL EXAMPLE — no real site was audited.',
            )}
          </strong>
        )}
      </header>
      <h2>{t('Бриф', 'Brief')}</h2>
      <p>{s.question}</p>
      <p>{s.context}</p>
      <h2>{t('Допущения', 'Assumptions')}</h2>
      <ul>
        {s.assumptions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
      {s.verdict && (
        <>
          <h2>
            {t('Решение', 'Decision')}: {s.verdict.decision}
          </h2>
          <p>{s.verdict.summary}</p>
          <h3>{t('Возражения', 'Dissent')}</h3>
          <p>{s.verdict.dissent}</p>
          <h3>{t('Неизвестное', 'Unknowns')}</h3>
          <p>{s.verdict.unknowns}</p>
          <p>{s.verdict.evidenceIds.join(', ')}</p>
        </>
      )}
      <h2>{t('План действий', 'Action plan')}</h2>
      {s.actions.map((a) => (
        <section className="print-action" key={a.id}>
          <h3>
            {a.priority} · {a.title}
          </h3>
          <p>{a.why}</p>
          <p>
            {a.owner} · {a.effort} · {a.confidence}
          </p>
          <p>
            <b>{t('Приёмка', 'Acceptance')}: </b>
            {a.acceptance}
          </p>
          {a.experiment && (
            <dl>
              {Object.entries(a.experiment).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <p>{a.evidenceIds.join(', ')}</p>
        </section>
      ))}
      <h2>{t('Полный разговор', 'Full discussion')}</h2>
      {s.turns.map((v) => (
        <section className="print-turn" key={v.id}>
          <h3>
            {experts.find((e) => e.id === v.seat)?.name} · {v.round} · AI
          </h3>
          <p>{v.text}</p>
          <p>
            <b>{t('Что изменит мнение', 'What changes this view')}: </b>
            {v.challenge}
          </p>
          <p>
            {v.stance} · {v.evidenceIds.join(', ')}
          </p>
        </section>
      ))}
      <h2>{t('Доказательства', 'Evidence')}</h2>
      {s.evidence.map((e) => (
        <section className="print-evidence" key={e.id}>
          <h3>
            {e.id} · {e.title}
          </h3>
          <p>
            {e.kind} · {e.confidence} · {e.retrievedAt}
          </p>
          <p>{e.summary}</p>
          <p>{e.locator}</p>
          {e.url && <p>{e.url}</p>}
        </section>
      ))}
    </article>
  );
}
