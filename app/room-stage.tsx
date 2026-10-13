'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowCounterClockwise,
  ArrowUpRight,
  BookOpen,
  ChatCircleDots,
  Check,
  Files,
  HandPalm,
  Pause,
  Play,
  SkipForward,
  Sparkle,
} from '@phosphor-icons/react';
import type { Expert, Evidence, Session, Turn } from './types';

const rounds: Record<string, string> = {
  opening: 'Opening positions',
  challenge: 'Cross-examination',
  verdict: 'Final positions',
};
const routes = [
  [-160, -130],
  [0, -160],
  [160, -130],
  [240, 0],
  [160, 150],
  [0, 170],
  [-160, 150],
  [-240, 0],
];
type Props = {
  experts: Expert[];
  session: Session;
  turn?: Turn;
  presenting: boolean;
  playing: boolean;
  count: number;
  onExpert: (expert: Expert) => void;
  onEvidence: (evidence: Evidence) => void;
  onPlay: () => void;
  onNext: () => void;
  onReset: () => void;
};

export function RoomStage({
  experts,
  session,
  turn,
  presenting,
  playing,
  count,
  onExpert,
  onEvidence,
  onPlay,
  onNext,
  onReset,
}: Props) {
  const [motion, setMotion] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const speaker = experts.find((e) => e.id === turn?.seat);
  const seatIndex = experts.findIndex((e) => e.id === turn?.seat);
  const evidence =
    turn?.evidenceIds
      .map((id) => session.evidence.find((e) => e.id === id))
      .filter((e): e is Evidence => !!e) || [];
  const mainEvidence = evidence[0];
  const challenge = turn?.round === 'challenge';
  return (
    <section
      className={`arena ${motion ? 'motion-enabled' : 'motion-disabled'} ${presenting ? 'is-presenting' : ''}`}
      aria-label="The strategy arena"
    >
      <header className="arena-topline">
        <span className="room-indicator">
          <i />
          {session.demo
            ? 'DEMO IN PLAY'
            : session.status === 'waiting'
              ? 'WAITING FOR CODEX'
              : session.status === 'running'
                ? 'COUNCIL IN SESSION'
                : session.status === 'complete'
                  ? 'CASE CLOSED'
                  : 'NEEDS ATTENTION'}
        </span>
        <button className="motion-toggle" aria-pressed={motion} onClick={() => setMotion(!motion)}>
          <Sparkle size={14} />
          Motion {motion ? 'on' : 'off'}
        </button>
      </header>
      <div className="council-stage">
        <div className="floor-marks" />
        <div className="table-base" />
        <div className="strategy-table">
          <div className="table-felt">
            <span className="table-corner top-left">BRING A CLAIM.</span>
            <span className="table-corner bottom">LEAVE WITH A TEST.</span>
            <div className="table-rule left" />
            <div className="table-rule right" />
          </div>
        </div>
        <div className="table-props" aria-hidden="true">
          <div className="notebook">
            <span />
            <span />
            <span />
          </div>
          <div className="pencil" />
          <div className="coffee">
            <i />
          </div>
        </div>
        {experts.map((e, i) => {
          const active = speaker?.id === e.id;
          const chosen = session.seats.includes(e.id);
          return (
            <div
              key={e.id}
              className={`expert-seat seat-${i} ${active ? 'is-speaking' : ''} ${chosen ? '' : 'not-selected'}`}
              style={{ '--seat-index': i } as React.CSSProperties}
            >
              {active && turn && (
                <div key={turn.id} className={`speech-bubble ${challenge ? 'challenge' : ''}`}>
                  <span>{challenge ? <HandPalm size={12} /> : <ChatCircleDots size={12} />}</span>
                  {challenge
                    ? 'Challenge accepted.'
                    : turn.round === 'verdict'
                      ? 'Here is my call.'
                      : 'Let’s look at the evidence.'}
                </div>
              )}
              <button
                className="expert-button"
                onClick={() => onExpert(e)}
                aria-label={`${e.name} — ${e.role}. Open dossier`}
              >
                <div className="portrait-wrap">
                  <div className="portrait-plinth" />
                  <img src={e.avatar} alt={`Illustrated ${e.name}`} width="1254" height="1254" />
                  <span className="speaker-wave">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <strong className="expert-name">{e.name}</strong>
                <span className="expert-role">{e.role}</span>
              </button>
            </div>
          );
        })}
        <div
          className="table-center"
          key={`${session.id}-${turn?.id || 'waiting'}`}
          style={
            {
              '--deal-x': `${routes[Math.max(0, seatIndex)][0]}px`,
              '--deal-y': `${routes[Math.max(0, seatIndex)][1]}px`,
            } as React.CSSProperties
          }
        >
          {mainEvidence ? (
            <>
              <div className="paper-underlay" />
              <button
                className="evidence-card"
                onClick={() => onEvidence(mainEvidence)}
                aria-label={`Inspect evidence: ${mainEvidence.title}`}
              >
                <span className="paper-clip" />
                <span className="card-kicker">
                  <Files size={12} />
                  {mainEvidence.kind}
                </span>
                <strong>{mainEvidence.title}</strong>
                <span className="card-source">
                  <BookOpen size={11} />
                  {mainEvidence.id}
                  <ArrowUpRight size={12} />
                </span>
              </button>
              {challenge && (
                <span className="objection-stamp">
                  <HandPalm size={12} /> CHALLENGED
                </span>
              )}
              {turn?.round === 'verdict' && (
                <span className="objection-stamp verdict-stamp">
                  <Check size={12} /> FINAL POSITION
                </span>
              )}
            </>
          ) : (
            <div className="table-empty">
              <Files size={24} />
              <strong>
                {session.status === 'waiting' ? 'Your case goes here.' : 'Evidence, before ego.'}
              </strong>
              <span>
                {session.status === 'waiting'
                  ? 'Ready when Codex is.'
                  : 'Every claim needs a receipt.'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="round-ribbon">
        <span className="round-icon">
          {challenge ? <HandPalm size={18} /> : <ChatCircleDots size={18} />}
        </span>
        <div>
          <strong>{turn ? rounds[turn.round] : 'The room is ready'}</strong>
          <span>
            {speaker
              ? `${speaker.name} has the floor`
              : 'A new perspective starts with your question'}
          </span>
        </div>
        <span className="turn-counter">
          {turn ? session.turns.findIndex((t) => t.id === turn.id) + 1 : 0}
          <small> / {session.turns.length}</small>
        </span>
      </div>
      {session.demo && (
        <div className="replay-controls">
          <span className="replay-caption">Fictional case. Real disagreement.</span>
          <div>
            <button onClick={onReset} aria-label="Restart demo">
              <ArrowCounterClockwise size={17} />
            </button>
            <button className="play-control" onClick={onPlay}>
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
              {playing ? 'Pause' : 'Play debate'}
            </button>
            <button
              onClick={onNext}
              aria-label="Next turn"
              disabled={count >= session.turns.length}
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      )}
      <div className="evidence-deck">
        <span>
          <Files size={14} />
          Evidence deck <b>{session.evidence.length}</b>
        </span>
        <div>
          {session.evidence.map((e, i) => (
            <button
              key={e.id}
              className={evidence.some((v) => v.id === e.id) ? 'in-play' : ''}
              onClick={() => onEvidence(e)}
              aria-label={`Open evidence ${i + 1}: ${e.title}`}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {e.kind}
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
        {!session.evidence.length && <p>Sources will appear here as Codex researches your case.</p>}
      </div>
      <p className="arena-disclosure">
        AI interpretations of public work. Not real statements or endorsements.
      </p>
    </section>
  );
}
