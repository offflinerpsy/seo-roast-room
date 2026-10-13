import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  ArrowCounterClockwise,
  BookOpen,
  FileText,
  ChatCircleDots,
  Crosshair,
  X,
  Check,
  Copy,
  DownloadSimple,
  CaretRight,
  WarningCircle,
  List,
  Fire,
  Quotes,
} from '@phosphor-icons/react';
import type { Expert, Session, Summary, Evidence, Turn } from './types';
import './style.css';
import { PrintReport } from './print-report';
import { RoomStage } from './room-stage';
import { Dossier } from './dossier';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}
const enStage: Record<string, string> = {
  brief: 'Brief',
  evidence: 'Evidence',
  opening: 'Positions',
  challenge: 'Debate',
  verdict: 'Decision',
};
const phases = ['brief', 'evidence', 'opening', 'challenge', 'verdict'];
const safeHref = (s: string) => {
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? s : undefined;
  } catch {
    return undefined;
  }
};
function App() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedId, setSelectedId] = useState('demo');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [sessionDirectory, setSessionDirectory] = useState('');
  const [tab, setTab] = useState<'debate' | 'actions' | 'evidence'>('debate');
  const [modal, setModal] = useState<'new' | Expert | Evidence | null>(null);
  const [dossier, setDossier] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [activeTurn, setActiveTurn] = useState<Turn | null>(null);
  const [presenting, setPresenting] = useState(false);
  const previous = useRef<{ id: string; turns: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [mode, setMode] = useState('quick');
  const [chosen, setChosen] = useState(['harry', 'kate', 'tj']);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);
  const currentId = useRef(selectedId);
  useEffect(() => {
    currentId.current = selectedId;
  }, [selectedId]);

  const refresh = useCallback(async (id: string, initial = false) => {
    const serial = ++requestId.current;
    try {
      const data = await api<{
        experts: Expert[];
        token: string;
        sessionDirectory: string;
        sessions: Summary[];
        errors: { id: string }[];
      }>('/api/bootstrap');
      const chosenId = data.sessions.some((s) => s.id === id) ? id : data.sessions[0]?.id;
      const full = chosenId ? await api<Session>(`/api/sessions/${chosenId}`) : null;
      if (serial !== requestId.current) return;
      setExperts(data.experts);
      setToken(data.token);
      setSessionDirectory(data.sessionDirectory);
      setSummaries(data.sessions);
      setSession(full);
      if (chosenId && chosenId !== id) setSelectedId(chosenId);
      setError(
        data.errors.length
          ? `${data.errors.length} ${'invalid sessions: validate JSON with the CLI.'}`
          : '',
      );
      if (initial || previous.current?.id !== full?.id) {
        setVisibleCount(null);
        setPlaying(false);
        setActiveTurn(full?.turns[0] || null);
        setPresenting(false);
      } else if (full && !full.demo && full.turns.length > (previous.current?.turns || 0)) {
        setActiveTurn(full.turns.at(-1) || null);
        setPresenting(true);
      }
      previous.current = full ? { id: full.id, turns: full.turns.length } : null;
    } catch (e) {
      if (serial === requestId.current) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh(selectedId, true);
  }, [selectedId, refresh]);
  useEffect(() => {
    const stream = new EventSource('/api/events');
    stream.addEventListener('ready', () => setConnected(true));
    stream.addEventListener('changed', () => {
      setConnected(true);
      void refresh(currentId.current);
    });
    stream.addEventListener('failure', () => setError('Could not read sessions. Check files.'));
    stream.onerror = () => setConnected(false);
    return () => stream.close();
  }, [refresh]);
  useEffect(() => {
    if (!playing || !session) return;
    const timer = window.setInterval(
      () => setVisibleCount((n) => Math.min((n ?? 1) + 1, session.turns.length)),
      4200,
    );
    return () => clearInterval(timer);
  }, [playing, session?.id, session?.turns.length]);
  useEffect(() => {
    if (visibleCount !== null && session) {
      setActiveTurn(session.turns[Math.max(0, visibleCount - 1)] || null);
      setPresenting(true);
      if (visibleCount >= session.turns.length) setPlaying(false);
    }
  }, [visibleCount, session?.id]);
  useEffect(() => {
    if (!presenting || playing) return;
    const timer = window.setTimeout(() => setPresenting(false), 4200);
    return () => clearTimeout(timer);
  }, [presenting, activeTurn?.id, playing]);
  useEffect(() => {
    if (modal) {
      dialogRef.current?.showModal();
      setDossier('');
      if (typeof modal === 'object' && 'beliefs' in modal) {
        let cancelled = false;
        api<{ markdown: string }>(`/api/experts/${modal.id}`)
          .then((d) => {
            if (!cancelled) setDossier(d.markdown);
          })
          .catch(() => {
            if (!cancelled) setDossier('Could not load the dossier. Try again.');
          });
        return () => {
          cancelled = true;
        };
      }
    } else dialogRef.current?.close();
  }, [modal]);
  const select = (id: string) => {
    setSelectedId(id);
    setSidebar(false);
    setTab('debate');
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard unavailable. Select and copy the text manually.');
    }
  };
  const stageLabel = (stage: string) => enStage[stage] || stage;
  const statusLabel = (s: string) =>
    ({
      waiting: 'Waiting for Codex',
      running: 'Council running',
      complete: 'Complete',
      failed: 'Needs attention',
    })[s] || s;
  const turns = session?.turns.slice(0, visibleCount ?? undefined) || [];
  const spotlight = activeTurn || turns[0];
  const speaker = experts.find((e) => e.id === spotlight?.seat);
  const replay = () => {
    if (playing) {
      setPlaying(false);
      setPresenting(false);
      return;
    }
    if (visibleCount === null || visibleCount >= (session?.turns.length || 0)) setVisibleCount(1);
    setPlaying(true);
    setPresenting(true);
    setTab('debate');
  };
  const nextTurn = () => {
    setPlaying(false);
    const next = Math.min(
      (session?.turns.findIndex((t) => t.id === spotlight?.id) ?? -1) + 2,
      session?.turns.length || 0,
    );
    setVisibleCount(next);
    setActiveTurn(session?.turns[next - 1] || null);
    setPresenting(true);
  };
  const evidencePills = (ids: string[]) => (
    <div className="evidence-pills">
      {ids.map((id) => (
        <button
          key={id}
          onClick={() => setModal(session?.evidence.find((e) => e.id === id) || null)}
        >
          <BookOpen size={12} />
          {id}
        </button>
      ))}
    </div>
  );
  const prompt = session
    ? `Use $seo-roast-room:seo-roast (or $seo-roast for a standalone skill installation) to continue session ${session.id}. Its exact session directory is ${JSON.stringify(sessionDirectory)}; pass that directory through --sessions on every CLI operation. Read its existing brief and current revision. Research the target, run the selected ${session.mode} council, and publish validated updates through the skill CLI. ${session.language === 'auto' ? 'Match the language of the user request unless they ask otherwise.' : 'Write the discussion and findings in the requested language: ' + JSON.stringify(session.language) + '.'}`
    : '';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      const created = await api<Session>('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Roast-Token': token },
        body: JSON.stringify({
          title: data.get('title'),
          question: data.get('question'),
          context: data.get('context'),
          mode,
          language: String(data.get('language') || '').trim() || 'auto',
          seats: chosen,
        }),
      });
      setModal(null);
      select(created.id);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const changeMode = (m: string) => {
    setMode(m);
    setChosen(
      m === 'consult'
        ? ['harry']
        : m === 'council'
          ? experts.map((e) => e.id)
          : ['harry', 'kate', 'tj'],
    );
  };
  const toggleSeat = (id: string) =>
    setChosen((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((x) => x !== id)
          : current
        : mode === 'consult'
          ? [id]
          : current.length < (mode === 'quick' ? 3 : 8)
            ? [...current, id]
            : current,
    );
  return (
    <>
      <div className="app-shell">
        <a className="skip" href="#main">
          {'Skip to content'}
        </a>
        <aside className={`sidebar ${sidebar ? 'is-open' : ''}`} aria-label={'Navigation'}>
          <a href="/" className="brand">
            <span className="brand-icon">
              <Fire weight="fill" size={23} />
            </span>
            <span>
              SEO ROAST
              <span className="brand-second">
                ROOM <small>by Base2026</small>
              </span>
            </span>
          </a>
          <button
            className="new-session"
            onClick={() => {
              setModal('new');
              setSidebar(false);
            }}
          >
            <Plus size={18} />
            {'New roast'}
            <span>↗</span>
          </button>
          <div className="nav-caption">{'WORKSPACE'}</div>
          <button className="nav-active" onClick={() => document.getElementById('main')?.focus()}>
            <ChatCircleDots size={19} />
            {'Council room'}
            <span className="tiny-dot" />
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setTab('evidence');
              setSidebar(false);
              document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <BookOpen size={19} />
            {'Session sources'}
          </button>
          <div className="nav-caption history-title">
            {'SESSIONS'}
            <span>{summaries.length}</span>
          </div>
          <div className="session-list">
            {summaries.map((s) => (
              <button
                className={s.id === selectedId ? 'selected-session' : ''}
                key={s.id}
                onClick={() => select(s.id)}
              >
                <span className={`session-dot ${s.status}`} />
                <span>
                  {s.title}
                  <small>
                    {s.demo ? 'Demonstration' : new Date(s.updatedAt).toLocaleDateString('en')}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <span className="base-mark">
              B<span>26</span>
            </span>
            <div>
              {'Knowledge with receipts'}
              <a href="https://base2026.dev" target="_blank" rel="noreferrer">
                Base2026 <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </aside>
        {sidebar && (
          <button
            aria-label={'Close navigation'}
            className="sidebar-backdrop"
            onClick={() => setSidebar(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-menu icon-button"
                aria-label={'Open navigation'}
                onClick={() => setSidebar(!sidebar)}
              >
                <List size={22} />
              </button>
              <span>SEO Roast Room</span>
              <CaretRight size={13} />
              <strong>{'Council room'}</strong>
            </div>
            <div className="topbar-tools">
              <span className={`connection ${connected ? 'online' : ''}`}>
                <i />
                {connected ? 'Local · connected' : 'Reconnecting'}
              </span>

              <a
                href="https://github.com/offflinerpsy/seo-roast-room"
                target="_blank"
                rel="noreferrer"
                className="source-link"
              >
                GitHub <ArrowUpRight size={14} />
              </a>
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span />
                  {'THE SEO DEBATE CLUB'}
                </div>
                <h1>
                  {'Put your strategy'}
                  <br />
                  <span>{'on the table.'}</span>
                </h1>
              </div>
              <p>{'Strong opinions. Open sources.\nA plan you can actually test.'}</p>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                <WarningCircle size={18} />
                {error}
                <button onClick={() => void refresh(selectedId)}>{'Retry'}</button>
              </div>
            )}
            {!session ? (
              <div className="empty-room">
                <Fire size={36} />
                <h2>{'The council is ready for your question'}</h2>
                <p>
                  {'Describe a site or a decision. Codex will gather evidence and run the review.'}
                </p>
                <button className="primary" onClick={() => setModal('new')}>
                  {'Start a roast'}
                </button>
              </div>
            ) : (
              <>
                <section className="brief-bar">
                  <div className="brief-icon">
                    <Crosshair size={21} />
                  </div>
                  <div>
                    <span className="micro-label">
                      {session.demo ? 'FICTIONAL EXAMPLE' : 'ON THE TABLE'}
                    </span>
                    <h2 dir="auto">{session.title}</h2>
                  </div>
                  <span className="mode-tag">
                    {session.mode === 'council'
                      ? 'Full council'
                      : session.mode === 'quick'
                        ? 'Quick roast'
                        : 'Consult'}
                  </span>
                </section>
                <div className="room-grid">
                  <RoomStage
                    experts={experts}
                    session={session}
                    turn={spotlight}
                    presenting={presenting || playing}
                    playing={playing}
                    count={
                      spotlight ? session.turns.findIndex((t) => t.id === spotlight.id) + 1 : 0
                    }
                    onExpert={setModal}
                    onEvidence={setModal}
                    onPlay={replay}
                    onNext={nextTurn}
                    onReset={() => {
                      setPlaying(false);
                      setVisibleCount(1);
                      setActiveTurn(session.turns[0] || null);
                      setPresenting(false);
                    }}
                  />
                  <aside className="insight-panel">
                    <div className="insight-header">
                      <span className="micro-label">{'IN THE SPOTLIGHT'}</span>
                      <Quotes size={22} />
                    </div>
                    {spotlight && speaker ? (
                      <>
                        <div className="spotlight-author">
                          <img src={speaker.avatar} alt="" />
                          <div>
                            <strong>{speaker.name}</strong>
                            <small>{speaker.role}</small>
                          </div>
                          <span className="live-line" />
                        </div>
                        <p className="spotlight-text" dir="auto">
                          {spotlight.text}
                        </p>
                        {evidencePills(spotlight.evidenceIds)}
                        <div className="challenge-note">
                          <span>{'WHAT WOULD CHANGE THIS VIEW'}</span>
                          <p>{spotlight.challenge}</p>
                        </div>
                      </>
                    ) : (
                      <div className="waiting">
                        <ChatCircleDots size={32} />
                        <h3>{'The brief is ready. Codex takes it from here.'}</h3>
                        <p>
                          {
                            'Copy the prompt below into Codex. The room will show results as they arrive.'
                          }
                        </p>
                      </div>
                    )}
                    <div className="insight-footer">
                      <span>{session.demo ? 'Illustrative scenario' : 'Saved locally'}</span>
                      <BookOpen size={15} />
                    </div>
                  </aside>
                </div>
                <div className="phase-track" aria-label={'Review stages'}>
                  {phases.map((p, i) => (
                    <div
                      key={p}
                      className={i <= phases.indexOf(session.stage) ? 'phase done' : 'phase'}
                    >
                      <span>{i < phases.indexOf(session.stage) ? <Check size={12} /> : <i />}</span>
                      {stageLabel(p)}
                      {i < 4 && <div className="phase-line" />}
                    </div>
                  ))}
                </div>
                {session.status === 'waiting' && (
                  <div className="codex-handoff">
                    <div>
                      <strong>{'Continue this roast in Codex'}</strong>
                      <p>{prompt}</p>
                    </div>
                    <button className="primary" onClick={() => void copy(prompt)}>
                      {copied ? <Check size={16} /> : <Copy size={16} />} {'Copy prompt'}
                    </button>
                  </div>
                )}
                <section className="workspace-panel">
                  <div className="workspace-top">
                    <div
                      id="workspace-tabs"
                      className="tabs"
                      role="tablist"
                      aria-label={'Review materials'}
                    >
                      {(['debate', 'actions', 'evidence'] as const).map((t, i) => (
                        <button
                          key={t}
                          role="tab"
                          id={`tab-${t}`}
                          aria-selected={tab === t}
                          aria-controls={`panel-${t}`}
                          onClick={() => setTab(t)}
                          className={tab === t ? 'active' : ''}
                        >
                          {i === 0 ? (
                            <ChatCircleDots size={17} />
                          ) : i === 1 ? (
                            <Crosshair size={17} />
                          ) : (
                            <BookOpen size={17} />
                          )}{' '}
                          {['Discussion', 'Action plan', 'Evidence'][i]}
                          <span>
                            {
                              [
                                session.turns.length,
                                session.actions.length,
                                session.evidence.length,
                              ][i]
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="exports">
                      <a href={`/api/sessions/${session.id}/report.md`} title="Markdown">
                        <DownloadSimple size={17} />
                        <span>MD</span>
                      </a>
                      <a href={`/api/sessions/${session.id}/session.json`}>JSON</a>
                      <button onClick={() => window.print()}>
                        <FileText size={16} />
                        PDF
                      </button>
                    </div>
                  </div>
                  <div
                    role="tabpanel"
                    id={`panel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                    className="tab-content"
                  >
                    {tab === 'debate' && (
                      <>
                        <div className="section-intro">
                          <div>
                            <h3>{'A good debate leaves receipts.'}</h3>
                            <p>
                              {
                                'Select a turn to bring it to the table. Open its evidence to inspect the argument.'
                              }
                            </p>
                          </div>
                          {visibleCount !== null && (
                            <button
                              className="text-button"
                              onClick={() => {
                                setPlaying(false);
                                setVisibleCount(null);
                                setPresenting(false);
                              }}
                            >
                              <ArrowCounterClockwise size={15} />
                              {'Show all'}
                            </button>
                          )}
                        </div>
                        <div className="turns">
                          {turns.map((t) => {
                            const e = experts.find((e) => e.id === t.seat);
                            return (
                              <article
                                className={`turn ${spotlight?.id === t.id ? 'focused' : ''}`}
                                key={t.id}
                              >
                                <img src={e?.avatar} alt="" />
                                <div>
                                  <div className="turn-meta">
                                    <strong>{e?.name}</strong>
                                    <span>{stageLabel(t.round)}</span>
                                    <small>{'AI simulation'}</small>
                                  </div>
                                  <button
                                    dir="auto"
                                    className="turn-text"
                                    onClick={() => {
                                      setActiveTurn(t);
                                      setPlaying(false);
                                      setPresenting(true);
                                    }}
                                  >
                                    {t.text}
                                  </button>
                                  {evidencePills(t.evidenceIds)}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                        {!turns.length && (
                          <div className="empty-inline">
                            {'No turns yet. Codex will add them after research.'}
                          </div>
                        )}
                      </>
                    )}
                    {tab === 'actions' && (
                      <>
                        {session.verdict && (
                          <div className="verdict">
                            <span className="decision-label">
                              {session.verdict.decision.toUpperCase()}
                            </span>
                            <h3>{session.verdict.summary}</h3>
                            <details>
                              <summary>{'Dissent and unknowns'}</summary>
                              <p>{session.verdict.dissent}</p>
                              <p>{session.verdict.unknowns}</p>
                            </details>
                            {evidencePills(session.verdict.evidenceIds)}
                          </div>
                        )}
                        <div className="action-list">
                          {session.actions.map((a) => (
                            <article className="action" key={a.id}>
                              <span className={`priority ${a.priority}`}>{a.priority}</span>
                              <div>
                                <h3>{a.title}</h3>
                                <p>{a.why}</p>
                                <div className="action-meta">
                                  <span>{a.owner}</span>
                                  <span>{a.effort}</span>
                                  <span>
                                    {'Confidence'}: {a.confidence}
                                  </span>
                                </div>
                                <div className="acceptance">
                                  <Check size={16} />
                                  <span>{a.acceptance}</span>
                                </div>
                                {a.experiment && (
                                  <details>
                                    <summary>{'Experiment design'}</summary>
                                    <dl>
                                      {Object.entries(a.experiment).map(([k, v]) => (
                                        <React.Fragment key={k}>
                                          <dt>{k}</dt>
                                          <dd>{v}</dd>
                                        </React.Fragment>
                                      ))}
                                    </dl>
                                  </details>
                                )}
                                {evidencePills(a.evidenceIds)}
                              </div>
                            </article>
                          ))}
                        </div>
                        {!session.actions.length && (
                          <div className="empty-inline">
                            {'The action plan follows the discussion.'}
                          </div>
                        )}
                      </>
                    )}
                    {tab === 'evidence' && (
                      <>
                        <div className="section-intro">
                          <div>
                            <h3>{'Inspect what holds the argument up.'}</h3>
                            <p>
                              {
                                'An observation, a practitioner claim and a hypothesis are different kinds of evidence.'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="evidence-list">
                          {session.evidence.map((e) => (
                            <button key={e.id} onClick={() => setModal(e)}>
                              <span className={`evidence-kind ${e.kind}`}>{e.kind}</span>
                              <div>
                                <strong>{e.title}</strong>
                                <p>{e.summary}</p>
                                <small>
                                  {e.id} · {new Date(e.retrievedAt).toLocaleDateString('en')}
                                </small>
                              </div>
                              <ArrowUpRight size={20} />
                            </button>
                          ))}
                        </div>
                        {!session.evidence.length && (
                          <div className="empty-inline">
                            {'No evidence yet. Nothing fabricated.'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </>
            )}
            <footer className="page-footer">
              <span>{'Opinions can be challenged. Sources can be checked.'}</span>
              <span>OPEN SOURCE · CODEX FIRST</span>
            </footer>
          </main>
        </div>
        <dialog
          ref={dialogRef}
          onCancel={() => setModal(null)}
          onClick={(e) => {
            if (e.target === dialogRef.current) setModal(null);
          }}
          aria-labelledby="dialog-title"
        >
          <div className="dialog-inner">
            <button
              className="close-dialog icon-button"
              onClick={() => setModal(null)}
              aria-label={'Close'}
            >
              <X size={22} />
            </button>
            {modal === 'new' ? (
              <>
                <span className="eyebrow">{'YOUR NEXT ROAST'}</span>
                <h2 id="dialog-title">{'What are we challenging?'}</h2>
                <p className="dialog-intro">
                  {'A site, a strategy, or a difficult choice. Context first, opinions second.'}
                </p>
                <form onSubmit={submit}>
                  <label>
                    {'Title'}
                    <input
                      name="title"
                      required
                      maxLength={160}
                      placeholder={'Local clinic acquisition strategy'}
                    />
                  </label>
                  <label>
                    {'URL and council question'}
                    <textarea
                      name="question"
                      required
                      maxLength={6000}
                      rows={3}
                      placeholder={'Which next step could bring more qualified enquiries?'}
                    />
                  </label>
                  <label>
                    {'Business, market, constraints and available data'}
                    <textarea
                      name="context"
                      maxLength={12000}
                      rows={3}
                      placeholder={
                        'What you sell, to whom, where. Timeline, budget and baseline metrics.'
                      }
                    />
                  </label>
                  <label>
                    Response language <small>optional</small>
                    <input
                      name="language"
                      maxLength={80}
                      placeholder="Match my request, or enter a language"
                    />
                    <small>
                      The interface stays in English. Your council can respond in any language.
                    </small>
                  </label>
                  <fieldset>
                    <legend>{'Depth'}</legend>
                    <div className="mode-options">
                      {['quick', 'council', 'consult'].map((m, i) => (
                        <button
                          type="button"
                          key={m}
                          className={mode === m ? 'selected' : ''}
                          onClick={() => changeMode(m)}
                        >
                          {['Quick · 3 seats', 'Council · up to 8', 'One expert'][i]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>{'Choose the seats'}</legend>
                    <div className="choose-experts">
                      {experts.map((e) => (
                        <button
                          type="button"
                          key={e.id}
                          aria-pressed={chosen.includes(e.id)}
                          className={chosen.includes(e.id) ? 'chosen' : ''}
                          onClick={() => toggleSeat(e.id)}
                        >
                          <img src={e.avatar} alt="" />
                          <span>{e.name.split(' ')[0]}</span>
                          {chosen.includes(e.id) && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p className="form-note">
                    {
                      'This creates a local brief. Then copy its prompt into Codex to run the council.'
                    }
                  </p>
                  {formError && (
                    <p role="alert" className="form-error">
                      {formError}
                    </p>
                  )}
                  <button
                    disabled={saving || chosen.length === 0}
                    className="primary submit"
                    type="submit"
                  >
                    {saving ? 'Creating…' : 'Convene the council'}
                    <ArrowRight size={18} />
                  </button>
                </form>
              </>
            ) : modal && 'beliefs' in modal ? (
              <>
                <div className="dossier-hero">
                  <img src={modal.avatar} alt={`${modal.name} avatar`} />
                  <div>
                    <span className="eyebrow">{modal.role}</span>
                    <h2 id="dialog-title">{modal.name}</h2>
                    <p>{modal.character}</p>
                    <a href={modal.identityUrl} target="_blank" rel="noreferrer">
                      {'Original creator'}
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
                <p className="fiction-note">
                  {
                    'An independent AI simulation inspired by public professional work. The creator does not participate in or endorse this council.'
                  }
                </p>
                <h3>{'Signature question'}</h3>
                <p className="dossier-question">{modal.tagline}</p>
                <details open>
                  <summary>{'Researched dossier and sources'}</summary>
                  <Dossier markdown={dossier || 'Loading the source-backed dossier…'} />
                </details>
              </>
            ) : (
              modal && (
                <>
                  <span className="eyebrow">
                    {modal.kind} · {modal.confidence}
                  </span>
                  <h2 id="dialog-title">{modal.title}</h2>
                  <p className="source-summary">{modal.summary}</p>
                  <dl className="source-details">
                    <dt>{'Locator'}</dt>
                    <dd>{modal.locator}</dd>
                    <dt>{'Retrieved'}</dt>
                    <dd>{new Date(modal.retrievedAt).toLocaleString('en')}</dd>
                    <dt>ID</dt>
                    <dd>{modal.id}</dd>
                  </dl>
                  {modal.url && safeHref(modal.url) ? (
                    <a
                      className="primary"
                      href={safeHref(modal.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {'Open original source'}
                      <ArrowUpRight size={17} />
                    </a>
                  ) : (
                    <p className="fiction-note">
                      {'Local or demonstration evidence; no public URL.'}
                    </p>
                  )}
                </>
              )
            )}
          </div>
        </dialog>
      </div>
      {session && <PrintReport session={session} experts={experts} />}
    </>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
