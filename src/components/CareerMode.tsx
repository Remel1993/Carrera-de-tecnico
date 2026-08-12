// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Trophy, Dices, Star, TrendingUp, Users, BarChart3, Swords,
  Briefcase, Target, Sparkles, AlertTriangle, Check, X, Globe, History, Newspaper, Play,
  FileSignature, ShieldCheck, Pencil, CalendarPlus
} from 'lucide-react';
import {
  TIERS, CLASS_INFO, classOf, tierCaps, tacticalOptions, sameDist, peCostFor,
  repBand, objectiveFor, expectedPosition, readPerformance, seasonObjectives,
  isSquadMaxed, careerSpells, CONTRACT_SEASONS, CL_SPOTS, signingRepBonus
} from '@/lib/career';

const Panel = ({ children, className = '' }) => (
  <div className={`bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const Stat = ({ label, value, hint, accent = 'emerald' }) => (
  <div className='flex-1 bg-black/30 rounded-2xl px-3 py-2.5 border border-white/5'>
    <p className={`text-[8px] font-black uppercase tracking-widest text-${accent}-400`}>{label}</p>
    <p className='text-lg font-black italic text-white tabular-nums leading-tight'>{value}</p>
    {hint && <p className='text-[8px] font-bold uppercase text-slate-400 tracking-wider'>{hint}</p>}
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 flex flex-col items-center gap-1 rounded-[14px] transition-all ${
      active ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
    }`}
  >
    {icon}
    <span className='text-[8px] font-black uppercase italic tracking-wider'>{label}</span>
  </button>
);

const strengthOf = t => (t?.att || 0) + (t?.opp || 0) + (t?.def || 0);

/* Rumores y titulares del mundo del fútbol */
const buildNews = ({
  managerName, teamName, rivalName, position, expected, reputation, log, tier,
  seasonsLeft, maxed, clQualified, clPhaseLabel, division, standingsSize
}) => {
  const items = [];
  const last = log?.[0];
  if (last) {
    items.push({
      tag: 'Crónica',
      text: last.result === 'W'
        ? `${teamName} se impone ${last.gf}-${last.ga} a ${last.rival} y el vestuario respira.`
        : last.result === 'D'
          ? `Reparto de puntos: ${teamName} ${last.gf}-${last.ga} ${last.rival}.`
          : `Derrota ${last.gf}-${last.ga} ante ${last.rival}: la prensa pide reacción.`
    });
  }
  if (rivalName) items.push({ tag: 'Previa', text: `Ambiente de jornada grande: ${teamName} mide fuerzas con ${rivalName}.` });
  if (position && expected) {
    items.push({
      tag: 'Análisis',
      text: position < expected
        ? `Los analistas destacan que ${teamName} rinde por encima de su presupuesto (${position}º frente al ${expected}º previsto).`
        : position > expected
          ? `Crecen las dudas: se esperaba a ${teamName} en el ${expected}º y marcha ${position}º.`
          : `${teamName} cumple el guion previsto en la clasificación.`
    });
  }

  // Mercado: aspirar a un club mejor o riesgo real de despido
  const overachieving = position && expected && expected - position >= 3;
  const underachieving = position && expected && position - expected >= 3;
  const recentLosses = log?.slice(0, 5).filter(l => l.result === 'L').length || 0;
  if (underachieving || recentLosses >= 3) {
    items.push({
      tag: 'Mercado',
      text: `La directiva empieza a sondear el mercado de entrenadores: si ${teamName} no reacciona, el puesto de ${managerName} peligra y el despido sería cuestión de semanas.`
    });
  } else if (overachieving && reputation >= 35) {
    items.push({
      tag: 'Mercado',
      text: `Clubes de mayor entidad preguntan por ${managerName}: con este rendimiento podría aspirar a un banquillo Tier ${Math.min(4, tier + 1)} el próximo verano.`
    });
  } else if (reputation >= 55) {
    items.push({
      tag: 'Mercado',
      text: `${managerName} entra en las quinielas de varios grandes; su nombre suena para proyectos de Champions.`
    });
  } else {
    items.push({
      tag: 'Mercado',
      text: `Sin movimientos: el mercado ve a ${managerName} atado al proyecto de ${teamName} mientras cumpla los objetivos.`
    });
  }

  if (clQualified) {
    items.push({
      tag: 'Champions',
      text: `${teamName} está en la Champions global${clPhaseLabel ? ` (${clPhaseLabel})` : ''}: Europa marca la temporada.`
    });
  } else if (division === 1 && position && position <= CL_SPOTS + 2) {
    items.push({
      tag: 'Champions',
      text: `La pelea por las ${CL_SPOTS} plazas de Champions está viva: ${teamName} marcha ${position}º de ${standingsSize || 20}.`
    });
  }

  items.push({
    tag: 'Contrato',
    text: seasonsLeft <= 1
      ? `Última temporada de contrato de ${managerName}: renovación o salida al final del curso.`
      : `A ${managerName} le quedan ${seasonsLeft} temporadas de contrato en ${teamName}.`
  });

  if (maxed) {
    items.push({
      tag: 'Club',
      text: `${teamName} ha tocado su techo institucional: el entrenamiento ya no aporta y sólo un club mayor puede dar más margen.`
    });
  }

  return items.slice(0, 6);
};

/* ============================ SELECCIÓN DE CLUB ============================ */
export const CareerSelectView = ({ candidates, leagueName, onBack, onStart, ui }) => {
  const { Shield } = ui;
  const [teamId, setTeamId] = useState(candidates?.[0]?.id ?? null);
  const [manager, setManager] = useState('');
  const [confirming, setConfirming] = useState(false);
  const selected = (candidates || []).find(t => t.id === teamId);

  return (
    <div className='flex-grow px-4 pb-20'>
      <div className='flex items-center gap-3 py-6'>
        <button onClick={onBack} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
        <div>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Modo Carrera</h2>
          <p className='text-[9px] font-bold uppercase tracking-widest text-amber-400'>Elige tu proyecto</p>
        </div>
      </div>

      <Panel className='p-5 mb-5'>
        <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>{leagueName} · 2ª División · Clase C</p>
        <h3 className='text-base font-black italic uppercase text-white mt-1'>Elige tu equipo</h3>
        <p className='text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1'>Clubes de bajo nivel</p>
        <p className='text-[10px] font-bold text-slate-300 mt-2 leading-relaxed'>
          Empiezas abajo, como Tier 1: sobrevivir, desarrollar y ascender. Los PE pertenecen al club; la reputación es tuya.
          Los contratos duran un máximo de {CONTRACT_SEASONS} temporadas.
        </p>
      </Panel>

      <div className='mb-5'>
        <p className='text-[9px] font-black uppercase tracking-widest text-slate-300 mb-2'>Nombre del técnico</p>
        <input
          value={manager}
          onChange={e => setManager(e.target.value)}
          placeholder='Tu nombre'
          className='w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder:text-slate-500 outline-none focus:border-amber-400/60'
        />
      </div>

      <div className='space-y-3'>
        {(candidates || []).map(t => (
          <button
            key={t.id}
            onClick={() => setTeamId(t.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 backdrop-blur-md text-left ${
              t.id === teamId ? 'bg-amber-600/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]' : 'bg-slate-900/40 border-white/10'
            }`}
          >
            <Shield color1={t.color1} color2={t.color2} initial={t.name} size='md' isFlag={t.isFlag} />
            <div className='flex-grow'>
              <p className='text-xs font-black uppercase italic text-white drop-shadow-md'>{t.name}</p>
              <p className='text-[8px] font-bold text-slate-200 uppercase bg-black/40 px-1.5 py-0.5 rounded inline-block mt-1'>
                {t.att}/{t.opp}/{t.def} · Fuerza {strengthOf(t)}
              </p>
            </div>
            {t.id === teamId && <div className='bg-white/30 p-1.5 rounded-full'><Check size={14} className='text-white' /></div>}
          </button>
        ))}
      </div>

      <button
        onClick={() => setConfirming(true)}
        disabled={!teamId}
        className='mt-6 w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 py-4 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2'
      >
        <Briefcase size={15} /> Firmar contrato
      </button>

      <AnimatePresence>
        {confirming && selected && (
          <ConfirmSignModal
            title='¿Estás seguro?'
            teamName={selected.name}
            detail={`${leagueName} · 2ª División · Contrato de ${CONTRACT_SEASONS} temporadas`}
            onCancel={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onStart(teamId, manager.trim() || 'Nuevo Técnico'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ====================== CONFIRMACIÓN DE FIRMA (reutilizable) ====================== */
const ConfirmSignModal = ({ title, teamName, detail, note, onCancel, onConfirm }) => (
  <div className='fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6'>
    <motion.div initial={{ scale: 0.92, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ opacity: 0 }}
      className='w-full max-w-xs bg-gradient-to-b from-slate-900 to-slate-950 rounded-[1.75rem] border border-amber-500/40 p-6 text-center'>
      <div className='w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3'>
        <FileSignature size={22} />
      </div>
      <h4 className='text-base font-black uppercase italic text-white'>{title}</h4>
      <p className='text-[11px] font-black uppercase italic text-amber-300 mt-2'>{teamName}</p>
      <p className='text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-1'>{detail}</p>
      {note && <p className='text-[9px] font-bold text-slate-400 mt-2 leading-relaxed'>{note}</p>}
      <div className='grid grid-cols-2 gap-2 mt-5'>
        <button onClick={onCancel} className='bg-slate-800 text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
          Cancelar
        </button>
        <button onClick={onConfirm} className='bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
          Sí, firmar
        </button>
      </div>
    </motion.div>
  </div>
);

/* ================================ CARRERA ================================= */
export const CareerView = ({
  career, team, comp, standings, position, seasonState, nextFixture, rival, isHome,
  divisionFinished, pendingGlobal, worldPending, onBack, onPlayMatch, onSimulateWorld,
  onSetTactic, onSpendPE, onOpenReview, onSimulateMatch, clInfo, onOpenChampions,
  onRenameManager, reviewDone, contractSigned, allLeaguesFinished, championsFinished, onNewSeason, ui
}) => {
  const { Shield, FormBadges } = ui;
  const [tab, setTab] = useState('main');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(career.manager || '');
  const tier = career.tier || 1;
  const caps = tierCaps(tier);
  const cls = classOf(career.compId);
  const band = repBand(career.reputation);
  const base = career.baseDist || { att: team?.att, opp: team?.opp, def: team?.def };
  const options = useMemo(() => tacticalOptions(base, tier), [base, tier]);
  const expected = useMemo(() => expectedPosition(standings, career.teamId), [standings, career.teamId]);
  const objective = objectiveFor(tier, position || expected);
  const perf = readPerformance(position || expected, expected);
  const log = career.seasonLog || [];
  const wins = log.filter(l => l.result === 'W').length;
  const maxed = isSquadMaxed(team, tier);
  // La Champions del modo carrera ES la Champions global ('C1'): sólo se lee
  const cl = clInfo;
  const season = seasonState?.season || 1;
  const seasonsLeft = Math.max(0, (career.contractStart || season) + (career.contractSeasons || CONTRACT_SEASONS) - season);

  const objectives = seasonObjectives({
    tier,
    div: career.div,
    position,
    expected,
    wins,
    played: log.length,
    totalRounds: Math.max(0, ((standings?.length || 20) - 1) * 2),
    reputation: career.reputation,
    total: standings?.length,
    clQualified: !!cl,
    clPhase: cl?.phase,
    clChampion: !!cl?.champion,
    clEliminated: !!cl?.eliminated
  });

  const news = useMemo(
    () => buildNews({
      managerName: career.manager, teamName: team?.name, rivalName: rival?.name,
      position, expected, reputation: career.reputation, log: career.seasonLog, tier,
      seasonsLeft, maxed, clQualified: !!cl, clPhaseLabel: cl?.phaseLabel,
      division: career.div, standingsSize: standings?.length
    }),
    [career.manager, team?.name, rival?.name, position, expected, career.reputation, career.seasonLog, tier, seasonsLeft, maxed, cl, career.div, standings?.length]
  );

  const spells = useMemo(() => careerSpells(career.seasonHistory || []), [career.seasonHistory]);

  return (
    <div className='flex-grow flex flex-col px-4 pb-8'>
      <header className='flex items-center gap-3 py-5'>
        <button onClick={onBack} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
        <div className='flex-grow min-w-0'>
          <h1 className='text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-md'>Modo Carrera</h1>
          {editingName ? (
            <div className='flex items-center gap-2 mt-1'>
              <input
                autoFocus
                value={nameDraft}
                maxLength={24}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onRenameManager && onRenameManager(nameDraft); setEditingName(false); }
                  if (e.key === 'Escape') { setNameDraft(career.manager || ''); setEditingName(false); }
                }}
                className='flex-grow min-w-0 bg-black/40 border border-amber-400/40 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white outline-none'
              />
              <button
                onClick={() => { onRenameManager && onRenameManager(nameDraft); setEditingName(false); }}
                className='p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all'
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => { setNameDraft(career.manager || ''); setEditingName(false); }}
                className='p-1.5 rounded-lg bg-slate-800 text-slate-300 active:scale-95 transition-all'
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameDraft(career.manager || ''); setEditingName(true); }}
              className='flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-300 active:scale-95 transition-all'
            >
              {career.manager} · {band.label}
              <Pencil size={10} className='text-amber-400' />
            </button>
          )}
        </div>

        <div className='w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0'><Briefcase size={20} /></div>
      </header>

      <Panel className='p-5 mb-4'>
        <div className='flex items-center gap-4'>
          <Shield color1={team?.color1} color2={team?.color2} initial={team?.name} size='lg' isFlag={team?.isFlag} />
          <div className='flex-grow'>
            <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>{comp?.name} · {career.div === 2 ? '2ª' : '1ª'} División · Clase {cls}</p>
            <h2 className='text-xl font-black uppercase italic text-white tracking-tight drop-shadow-md'>{team?.name}</h2>
            <p className='text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-1'>
              Tier {tier} — {TIERS[tier]?.name} · {team?.att}/{team?.opp}/{team?.def}
            </p>
          </div>
        </div>
        <div className='flex gap-2 mt-4'>
          <Stat label='Reputación' value={career.reputation} hint={band.label} accent='amber' />
          <Stat label='PE' value={maxed ? 'Tope' : career.pe} hint={maxed ? 'Plantilla al máximo' : 'Del club'} />
          <Stat label='Posición' value={position ? `${position}º` : '—'} hint={`Esperado ${expected}º`} accent='blue' />
        </div>
        <div className='mt-3 bg-black/30 rounded-2xl px-4 py-3 border border-white/5'>
          <p className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
            Temporada {season} · Contrato: {seasonsLeft === 0 ? 'último año' : `${seasonsLeft} temporada${seasonsLeft === 1 ? '' : 's'}`}
          </p>
          <p className='text-[10px] font-bold text-slate-200 mt-1'>{perf.label} — {objective?.note}</p>
        </div>
      </Panel>

      <Panel className='p-1.5 mb-4 flex gap-1'>
        <TabButton active={tab === 'main'} onClick={() => setTab('main')} icon={<Swords size={15} />} label='Partido' />
        <TabButton active={tab === 'tactic'} onClick={() => setTab('tactic')} icon={<Target size={15} />} label='Táctica' />
        <TabButton active={tab === 'squad'} onClick={() => setTab('squad')} icon={<TrendingUp size={15} />} label='Entreno' />
        {cl && <TabButton active={tab === 'cl'} onClick={() => setTab('cl')} icon={<Trophy size={15} />} label='Champions' />}
        <TabButton active={tab === 'table'} onClick={() => setTab('table')} icon={<BarChart3 size={15} />} label='Tabla' />
        <TabButton active={tab === 'market'} onClick={() => setTab('market')} icon={<Sparkles size={15} />} label='Buzón' />
      </Panel>

      <AnimatePresence mode='wait'>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className='flex-grow space-y-4'>
          {tab === 'main' && (
            <>
              {divisionFinished ? (
                <Panel className='p-5 text-center'>
                  <Trophy size={32} className='text-yellow-400 mx-auto mb-3' />
                  <h3 className='text-sm font-black uppercase italic text-white'>Temporada de tu club finalizada</h3>
                  <p className='text-[10px] font-bold text-slate-300 mt-2'>
                    {contractSigned
                      ? 'Contrato firmado: el balance de esta temporada está cerrado.'
                      : reviewDone
                        ? 'El balance de esta temporada ya está resuelto.'
                        : 'Revisa el balance de temporada y el mercado de entrenadores.'}
                  </p>
                  <button
                    onClick={onOpenReview}
                    disabled={reviewDone || contractSigned}
                    className='mt-4 w-full bg-amber-500 text-slate-950 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none disabled:grayscale'
                  >
                    {contractSigned ? 'Balance cerrado · Contrato firmado' : reviewDone ? 'Balance resuelto' : 'Ver balance de temporada'}
                  </button>
                </Panel>

              ) : nextFixture ? (
                <Panel className='p-5'>
                  <p className='text-[9px] font-black uppercase tracking-widest text-emerald-400'>Próximo partido · Jornada {(career.div === 2 ? (comp?.matchday2 || 0) : (comp?.matchday || 0)) + 1}</p>
                  <div className='flex items-center justify-between mt-4'>
                    <div className='flex-1 text-center'>
                      <Shield color1={team?.color1} color2={team?.color2} initial={team?.name} size='md' isFlag={team?.isFlag} />
                      <p className='text-[9px] font-black uppercase italic mt-2 text-white truncate'>{team?.name}</p>
                      <p className='text-[8px] font-black uppercase text-amber-400 mt-0.5'>{isHome ? 'Local' : 'Visitante'}</p>
                    </div>
                    <div className='px-3 text-center'>
                      <p className='text-[8px] font-black uppercase text-slate-400'>{isHome ? 'En casa' : 'Fuera'}</p>
                      <p className='text-2xl font-black italic text-white'>VS</p>
                    </div>
                    <div className='flex-1 text-center'>
                      <Shield color1={rival?.color1} color2={rival?.color2} initial={rival?.name} size='md' isFlag={rival?.isFlag} />
                      <p className='text-[9px] font-black uppercase italic mt-2 text-white truncate'>{rival?.name}</p>
                      <p className='text-[8px] font-black uppercase text-slate-400 mt-0.5'>{isHome ? 'Visitante' : 'Local'}</p>
                    </div>
                  </div>
                  <div className='mt-4 bg-black/30 rounded-2xl px-4 py-3 border border-white/5 flex items-center justify-between'>
                    <div>
                      <p className='text-[8px] font-black uppercase tracking-widest text-slate-400'>Rival</p>
                      <p className='text-[10px] font-bold text-slate-200'>{rival?.att}/{rival?.opp}/{rival?.def} · Fuerza {strengthOf(rival)}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-[8px] font-black uppercase tracking-widest text-slate-400'>Tu salida</p>
                      <p className='text-[10px] font-bold text-amber-300'>
                        {(career.tactic || base).att}/{(career.tactic || base).opp}/{(career.tactic || base).def}
                      </p>
                    </div>
                  </div>
                  <div className='mt-4 grid grid-cols-2 gap-2'>
                    <button onClick={onPlayMatch} className='bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2'>
                      <Dices size={15} /> Jugar partido
                    </button>
                    <button onClick={onSimulateMatch} className='bg-slate-800/90 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2'>
                      <Play size={15} /> Simular jornada
                    </button>
                  </div>
                </Panel>
              ) : (
                <Panel className='p-5 text-center'>
                  <p className='text-[10px] font-bold uppercase text-slate-300'>Jornada resuelta. El mundo sigue jugando.</p>
                </Panel>
              )}

              <Panel className='p-5'>
                <p className='text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2'><Target size={12} /> Objetivos de temporada</p>
                <div className='space-y-2 mt-3'>
                  {objectives.map((o, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border ${o.extra ? 'bg-blue-500/10 border-blue-400/30' : 'bg-black/30 border-white/5'}`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${o.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {o.done ? <Check size={13} /> : <X size={13} />}
                      </span>
                      <div className='flex-grow'>
                        <p className='text-[10px] font-black uppercase italic text-white'>{o.extra ? 'Extra · ' : ''}{o.label}</p>
                        <p className='text-[9px] font-bold text-slate-400'>{o.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className='text-[8px] font-bold uppercase text-slate-400 tracking-wider mt-3'>{objective?.note}</p>
              </Panel>

              <Panel className='p-5'>
                <p className='text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2'><Newspaper size={12} /> Sala de prensa</p>
                <div className='space-y-2 mt-3'>
                  {news.map((n, i) => (
                    <div key={i} className='bg-black/25 rounded-xl px-3 py-2'>
                      <p className='text-[8px] font-black uppercase tracking-widest text-amber-400'>{n.tag}</p>
                      <p className='text-[10px] font-bold text-slate-200 leading-relaxed'>{n.text}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className='p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-[9px] font-black uppercase tracking-widest text-blue-400'>Mundo vivo</p>
                    <p className='text-[10px] font-bold text-slate-200 mt-1'>
                      {worldPending > 0 ? `${worldPending} liga${worldPending > 1 ? 's' : ''} con partidos pendientes` : 'Todas las ligas al día'}
                    </p>
                  </div>
                  <Globe size={22} className='text-blue-400' />
                </div>
                {worldPending > 0 && (
                  <button onClick={onSimulateWorld} className='mt-3 w-full bg-blue-600/80 text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
                    Simular resto del mundo
                  </button>
                )}

                {/* Cierre completo de la temporada global sin salir del modo carrera */}
                {allLeaguesFinished && !championsFinished && (
                  <button onClick={onOpenChampions} className='mt-3 w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2'>
                    <Trophy size={14} /> Resolver la Champions global
                  </button>
                )}
                {allLeaguesFinished && championsFinished && (
                  <button
                    onClick={onNewSeason}
                    disabled={divisionFinished && !reviewDone && !contractSigned}
                    className='mt-3 w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2'
                  >
                    <CalendarPlus size={14} /> Iniciar nueva temporada
                  </button>
                )}
                {allLeaguesFinished && championsFinished && divisionFinished && !reviewDone && !contractSigned && (
                  <p className='text-[8px] font-bold uppercase tracking-wider text-amber-400 mt-2 text-center'>
                    Cierra antes tu balance de temporada
                  </p>
                )}
              </Panel>


              {log.length > 0 && (
                <Panel className='p-5'>
                  <p className='text-[9px] font-black uppercase tracking-widest text-slate-300 mb-3'>Tus últimos partidos</p>
                  <div className='space-y-2'>
                    {log.slice(0, 6).map((l, i) => (
                      <div key={i} className='flex items-center gap-3 bg-black/25 rounded-xl px-3 py-2'>
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${
                          l.result === 'W' ? 'bg-emerald-500 text-slate-950' : l.result === 'D' ? 'bg-slate-500 text-white' : 'bg-red-600 text-white'
                        }`}>{l.result === 'W' ? 'G' : l.result === 'D' ? 'E' : 'P'}</span>
                        <p className='text-[10px] font-bold text-slate-200 flex-grow'>J{l.matchday} · {l.rival}</p>
                        <p className='text-[10px] font-black text-white tabular-nums'>{l.gf}-{l.ga}</p>
                        <p className='text-[8px] font-bold text-amber-300 tabular-nums w-10 text-right'>{l.rep > 0 ? '+' : ''}{l.rep}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </>
          )}

          {tab === 'cl' && cl && (
            <>
              <Panel className='p-5'>
                <p className='text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2'>
                  <Trophy size={12} /> Champions League · Temporada {cl.season}
                </p>
                <p className='text-[9px] font-bold text-slate-400 mt-1'>
                  Es la misma Champions de la temporada global: mismo cuadro, mismos rivales.
                </p>
                {cl.champion ? (
                  <div className='text-center py-6'>
                    <Trophy size={40} className='text-yellow-400 mx-auto mb-3' />
                    <h3 className='text-base font-black uppercase italic text-white'>¡Campeón de Europa!</h3>
                    <p className='text-[10px] font-bold text-slate-300 mt-1'>{team?.name} conquista la Champions.</p>
                  </div>
                ) : cl.eliminated ? (
                  <div className='text-center py-6'>
                    <AlertTriangle size={32} className='text-red-400 mx-auto mb-3' />
                    <h3 className='text-sm font-black uppercase italic text-white'>Eliminados de Champions</h3>
                    <p className='text-[10px] font-bold text-slate-300 mt-1'>Caída en {cl.phaseLabel}.</p>
                  </div>
                ) : (
                  <>
                    <h3 className='text-sm font-black uppercase italic text-white mt-2'>
                      {cl.phaseLabel}{cl.groupName ? ` · ${cl.groupName}` : ''}
                    </h3>
                    <div className='grid grid-cols-4 gap-2 mt-4'>
                      {[
                        { k: 'PJ', v: cl.p || 0 },
                        { k: 'PTS', v: cl.pts || 0 },
                        { k: 'GF', v: cl.gf || 0 },
                        { k: 'GC', v: cl.ga || 0 }
                      ].map(s => (
                        <div key={s.k} className='bg-black/25 rounded-xl py-2 text-center'>
                          <p className='text-[8px] font-black uppercase text-slate-400'>{s.k}</p>
                          <p className='text-sm font-black text-white tabular-nums'>{s.v}</p>
                        </div>
                      ))}
                    </div>
                    {cl.rivalName && (
                      <p className='text-[10px] font-bold text-slate-200 mt-4'>
                        Próximo cruce europeo: <span className='text-white font-black'>{cl.rivalName}</span>
                      </p>
                    )}
                    {!cl.isGlobalPhase && (
                      <p className='text-[9px] font-bold text-amber-400 mt-3'>
                        La Champions se disputa al cerrar las ligas de la temporada global.
                      </p>
                    )}
                    <button
                      onClick={onOpenChampions}
                      className='mt-4 w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2'
                    >
                      <Dices size={15} /> Ir a la Champions global
                    </button>
                  </>
                )}
              </Panel>
            </>
          )}


          {tab === 'tactic' && (
            <Panel className='p-5'>
              <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>Distribución táctica libre</p>
              <h3 className='text-sm font-black uppercase italic text-white mt-1'>Mismos puntos, otra forma de salir</h3>
              <p className='text-[10px] font-bold text-slate-300 mt-2 leading-relaxed'>
                Base del club: {base.att}/{base.opp}/{base.def} ({base.att + base.opp + base.def} puntos). Redistribuye antes del partido sin cambiar el total y respetando los techos del Tier {tier} ({caps.att}/{caps.opp}/{caps.def}).
              </p>
              <div className='grid grid-cols-3 gap-2 mt-4'>
                {options.map(o => {
                  const active = sameDist(career.tactic || base, o);
                  return (
                    <button key={`${o.att}-${o.opp}-${o.def}`} onClick={() => onSetTactic(o)}
                      className={`py-3 rounded-2xl border text-center transition-all active:scale-95 ${
                        active ? 'bg-amber-500 border-amber-300 text-slate-950' : 'bg-black/30 border-white/10 text-white'
                      }`}>
                      <p className='text-sm font-black italic tabular-nums'>{o.att}-{o.opp}-{o.def}</p>
                      <p className='text-[7px] font-black uppercase tracking-wider opacity-70'>ATT·OPP·DEF</p>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === 'squad' && (
            <Panel className='p-5'>
              <p className='text-[9px] font-black uppercase tracking-widest text-emerald-400'>Puntos de Entrenamiento · {career.pe} PE</p>
              <h3 className='text-sm font-black uppercase italic text-white mt-1'>Economía de atributos</h3>
              {maxed ? (
                <div className='mt-3 bg-emerald-500/10 border border-emerald-400/30 rounded-2xl px-4 py-3 flex items-start gap-3'>
                  <ShieldCheck size={16} className='text-emerald-400 shrink-0 mt-0.5' />
                  <p className='text-[10px] font-bold text-emerald-200 leading-relaxed'>
                    El club está en su techo ({caps.att}/{caps.opp}/{caps.def}). Ya no se acumulan ni se gastan PE:
                    para crecer más necesitas un club de mayor Tier.
                  </p>
                </div>
              ) : (
                <p className='text-[10px] font-bold text-slate-300 mt-2'>
                  Techo institucional del Tier {tier}: {caps.att}/{caps.opp}/{caps.def}. Costos: 1→2 = 15 PE · 2→3 = 35 PE · 3→4 = 70 PE.
                </p>
              )}
              <div className='space-y-3 mt-4'>
                {[
                  { key: 'att', label: 'Ataque (ATT)' },
                  { key: 'opp', label: 'Oportunidades (OPP)' },
                  { key: 'def', label: 'Defensa (DEF)' }
                ].map(a => {
                  const val = team?.[a.key] || 0;
                  const cost = peCostFor(val);
                  const capped = val >= caps[a.key];
                  return (
                    <div key={a.key} className='flex items-center gap-3 bg-black/30 rounded-2xl px-4 py-3 border border-white/5'>
                      <div className='flex-grow'>
                        <p className='text-[9px] font-black uppercase tracking-widest text-slate-300'>{a.label}</p>
                        <p className='text-lg font-black italic text-white tabular-nums'>{val} <span className='text-[9px] text-slate-400'>/ {caps[a.key]}</span></p>
                      </div>
                      <button
                        onClick={() => onSpendPE(a.key)}
                        disabled={capped || career.pe < cost}
                        className='px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase italic tracking-widest disabled:opacity-30 active:scale-95 transition-all'
                      >
                        {capped ? 'Techo' : `+1 · ${cost} PE`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === 'table' && (
            <Panel className='p-4'>
              <p className='text-[9px] font-black uppercase tracking-widest text-blue-400 px-2 pb-3'>{comp?.name} · {career.div === 2 ? '2ª' : '1ª'} División</p>
              <div className='space-y-1'>
                {(standings || []).map((t, i) => (
                  <div key={t.id} className={`flex items-center gap-2 px-2 py-2 rounded-xl ${t.id === career.teamId ? 'bg-amber-500/20 border border-amber-400/40' : i % 2 ? 'bg-black/20' : ''}`}>
                    <span className='w-5 text-[9px] font-black text-slate-400 tabular-nums'>{i + 1}</span>
                    <Shield color1={t.color1} color2={t.color2} initial={t.name} size='sm' isFlag={t.isFlag} />
                    <span className='flex-grow text-[10px] font-black uppercase italic text-white truncate'>{t.name}</span>
                    <span className='text-[9px] font-bold text-slate-300 tabular-nums w-6 text-center'>{t.p}</span>
                    <span className='text-[9px] font-bold text-slate-300 tabular-nums w-8 text-center'>{t.gf - t.ga}</span>
                    <span className='text-[10px] font-black text-white tabular-nums w-7 text-right'>{t.pts}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'market' && (
            <>
              <Panel className='p-5'>
                <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>Buzón del técnico</p>
                {career.offers?.length ? (
                  <div className='space-y-3 mt-3'>
                    {career.offers.map(o => (
                      <div key={o.id} className='bg-black/30 rounded-2xl p-4 border border-white/10'>
                        <p className='text-[10px] font-black uppercase italic text-white'>{o.teamName}</p>
                        <p className='text-[9px] font-bold uppercase text-slate-300'>{o.compName} · {o.div === 2 ? '2ª' : '1ª'} Div · Tier {o.tier} · {o.profile}</p>
                        <p className='text-[9px] font-bold text-amber-300 mt-1'>{o.reason}</p>
                      </div>
                    ))}
                    <p className='text-[8px] font-bold uppercase text-slate-400 tracking-wider'>Las ofertas se firman en el balance de temporada.</p>
                  </div>
                ) : (
                  <p className='text-[10px] font-bold text-slate-300 mt-2'>Ningún club te ha llamado todavía. Supera las expectativas y el mundo empezará a mirarte.</p>
                )}
              </Panel>

              <Panel className='p-5'>
                <p className='text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2'><History size={12} /> Trayectoria</p>
                <p className='text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1'>Sólo cambios de club</p>
                {spells.length ? (
                  <div className='space-y-2 mt-3'>
                    {spells.map((s, i) => (
                      <div key={i} className='bg-black/25 rounded-xl px-3 py-2'>
                        <p className='text-[10px] font-black uppercase italic text-white'>
                          {s.from === s.to ? `T${s.from}` : `T${s.from}–T${s.to}`} · {s.teamName}
                        </p>
                        <p className='text-[9px] font-bold text-slate-300'>
                          {s.compName || '—'} · {s.seasons} temporada{s.seasons === 1 ? '' : 's'} · mejor {s.bestPosition}º
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-[10px] font-bold text-slate-300 mt-2'>Tu primera etapa aún está en marcha.</p>
                )}
              </Panel>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ============================== PARTIDO ================================== */
export const CareerMatchView = ({ matchState, rolling, onRoll, onFinish, ui }) => {
  const { Shield, DieIcon } = ui;
  if (!matchState) return null;
  return (
    <div className='flex-grow flex flex-col px-4 pb-6'>
      <div className='py-4 text-center'>
        <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>
          {`Modo Carrera · Jornada ${matchState.careerMatchday}`}
        </p>
      </div>
      <Panel className='p-4 mb-4'>
        <div className='flex items-center'>
          <div className='flex-1 text-center'>
            <Shield color1={matchState.home?.color1} color2={matchState.home?.color2} initial={matchState.home?.name} size='lg' isFlag={matchState.home?.isFlag} />
            <p className='text-[10px] font-black uppercase italic mt-2 text-white truncate'>{matchState.home?.name}</p>
            <p className='text-[8px] font-bold text-slate-300 mt-1'>{matchState.home.att}/{matchState.home.opp}/{matchState.home.def}</p>
          </div>
          <div className='px-2 text-center'>
            <p className='text-4xl font-black italic text-white tabular-nums drop-shadow-lg'>{matchState.scoreH} - {matchState.scoreA}</p>
            <p className='text-[8px] font-black uppercase text-slate-400 mt-1'>Ocasiones {matchState.oppH} / {matchState.oppA}</p>
          </div>
          <div className='flex-1 text-center'>
            <Shield color1={matchState.away?.color1} color2={matchState.away?.color2} initial={matchState.away?.name} size='lg' isFlag={matchState.away?.isFlag} />
            <p className='text-[10px] font-black uppercase italic mt-2 text-white truncate'>{matchState.away?.name}</p>
            <p className='text-[8px] font-bold text-slate-300 mt-1'>{matchState.away.att}/{matchState.away.opp}/{matchState.away.def}</p>
          </div>
        </div>
      </Panel>

      <div className='flex-grow bg-[#2e7d32]/60 backdrop-blur-md rounded-[3rem] border-8 border-slate-900/40 relative overflow-hidden flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] min-h-[260px]'>
        <div className='absolute top-1/2 left-0 w-full h-[2px] bg-white/20 -translate-y-1/2' />
        <div className='absolute top-1/2 left-1/2 w-40 h-40 border-[2px] border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2' />
        {!matchState.finished ? (
          <div className='z-10 flex flex-col items-center gap-8'>
            <div className={'transition-all duration-300 transform ' + (rolling ? 'scale-125 rotate-45' : 'scale-100')}>
              <DieIcon value={matchState.lastDie} className='w-24 h-24 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.8)]' />
            </div>
            <button onClick={onRoll} disabled={rolling} className='bg-white/90 text-emerald-900 px-10 py-5 rounded-3xl font-black uppercase italic tracking-widest shadow-xl active:scale-90 transition-transform disabled:opacity-50'>
              {rolling ? 'Lanzando...' : 'Lanzar Dado'}
            </button>
          </div>
        ) : (
          <div className='z-10 text-center p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 max-w-[80%]'>
            <Trophy size={40} className='text-yellow-400 mx-auto mb-3' />
            <h3 className='text-base font-black uppercase italic mb-4 text-white'>¡Fin del Partido!</h3>
            <button onClick={onFinish} className='w-full bg-white/90 text-slate-950 py-4 rounded-2xl font-black uppercase italic tracking-widest active:scale-95 transition-all'>
              Resolver jornada mundial
            </button>
          </div>
        )}
      </div>

      <div className='mt-4 bg-slate-900/40 backdrop-blur-md rounded-3xl p-5 h-36 overflow-y-auto border border-white/10 space-y-2'>
        {matchState.logs.map((log, i) => (
          <div key={i} className={'text-[10px] font-bold italic flex gap-3 ' + (i === 0 ? 'text-white' : 'text-slate-300')}>
            <span className='opacity-60 shrink-0'>⚽</span><p>{log}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ========================== BALANCE DE TEMPORADA ========================== */
export const CareerSeasonReviewModal = ({ review, onAcceptOffer, onRenew, onStay, ui }) => {
  const { Shield } = ui;
  const [pendingOffer, setPendingOffer] = useState(null);
  const [confirmRenew, setConfirmRenew] = useState(false);
  if (!review) return null;

  const marketTitle = review.fired
    ? 'Nuevos proyectos para tu perfil'
    : review.contractEnd
      ? 'Fin de contrato: renovar o cambiar de aires'
      : 'Mercado de entrenadores';

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4'>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className='w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2rem] border border-amber-500/30 overflow-hidden max-h-[88vh] overflow-y-auto'>
        <div className='px-6 py-5 bg-gradient-to-r from-amber-900/50 to-transparent border-b border-white/10'>
          <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>Balance de temporada {review.season}</p>
          <h3 className='text-lg font-black uppercase italic text-white'>{review.teamName} — {review.position}º</h3>
          <p className='text-[9px] font-bold uppercase text-slate-300 mt-1'>{review.performance} · esperado {review.expected}º</p>
        </div>
        <div className='p-6 space-y-4'>
          <div className='flex gap-2'>
            <Stat label='Reputación' value={review.repAfter} hint={`${review.repDelta > 0 ? '+' : ''}${review.repDelta}`} accent='amber' />
            <Stat
              label='PE ganados'
              value={`+${review.peGain}`}
              hint={review.peRoom === 0 ? 'Sin margen de mejora' : review.peGain === 0 ? 'Club al máximo' : 'Del club'}
            />

          </div>
          <div className='bg-black/40 rounded-2xl px-4 py-3 border border-white/5'>
            <p className='text-[9px] font-black uppercase tracking-widest text-slate-400'>Veredicto</p>
            <p className='text-[11px] font-bold text-white mt-1'>{review.note}</p>
            {typeof review.objectivesMet === 'number' && (
              <p className={`text-[10px] font-black uppercase italic mt-2 ${review.objectivesMet === 0 ? 'text-red-400' : review.objectivesMet === review.objectivesTotal ? 'text-emerald-400' : 'text-amber-300'}`}>
                Objetivos cumplidos: {review.objectivesMet}/{review.objectivesTotal}
              </p>
            )}
            {review.clResult && <p className='text-[10px] font-black uppercase italic text-blue-300 mt-2'>{review.clResult}</p>}
            {review.clQualified && <p className='text-[10px] font-black uppercase italic text-blue-400 mt-2'>Clasificado a la Champions global</p>}
            {review.promote && <p className='text-[10px] font-black uppercase italic text-emerald-400 mt-2'>Ascenso a Tier {review.newTier}</p>}
            {review.fired && <p className='text-[10px] font-black uppercase italic text-red-400 mt-2 flex items-center gap-1'><AlertTriangle size={12} /> Has sido despedido</p>}
            {review.fired && <p className='text-[10px] font-bold text-slate-300 mt-1'>Pierdes los PE del club y tu nombre se resiente en el mercado.</p>}
            {review.unemployed && <p className='text-[10px] font-black uppercase italic text-red-300 mt-2'>Ningún club te ofrece banquillo: te quedas sin equipo.</p>}
            {!review.fired && review.contractEnd && (
              <p className='text-[10px] font-black uppercase italic text-amber-300 mt-2 flex items-center gap-1'>
                <FileSignature size={12} /> Contrato cumplido ({CONTRACT_SEASONS} temporadas)
              </p>
            )}
          </div>


          {!review.fired && review.contractEnd && (
            <button onClick={() => setConfirmRenew(true)} className='w-full bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
              Renovar {CONTRACT_SEASONS} temporadas en {review.teamName}
            </button>
          )}

          {review.offers?.length > 0 && (
            <div>
              <p className='text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2'>{marketTitle}</p>
              <div className='space-y-2'>
                {review.offers.map(o => (
                  <button key={o.id} onClick={() => setPendingOffer(o)} className='w-full flex items-center gap-3 bg-black/40 hover:bg-amber-600/20 rounded-2xl p-3 border border-white/10 text-left active:scale-95 transition-all'>
                    <Shield color1={o.color1} color2={o.color2} initial={o.teamName} size='sm' isFlag={o.isFlag} />
                    <div className='flex-grow'>
                      <p className='text-[10px] font-black uppercase italic text-white'>{o.teamName}</p>
                      <p className='text-[8px] font-bold uppercase text-slate-300'>{o.compName} · {o.div === 2 ? '2ª' : '1ª'} · Tier {o.tier} · {o.profile}</p>
                    </div>
                    <Check size={14} className='text-emerald-400' />
                  </button>
                ))}
              </div>
              <p className='text-[8px] font-bold uppercase text-slate-400 tracking-wider mt-2'>Se te pedirá confirmación antes de firmar.</p>
            </div>
          )}

          {(!review.fired || review.offers?.length === 0) && (
            <button onClick={onStay} className='w-full bg-slate-800 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
              {review.fired ? 'Buscar otro proyecto desde cero' : review.contractEnd ? 'Decidir más tarde' : 'Continuar en el club'}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {pendingOffer && (
          <ConfirmSignModal
            title='¿Estás seguro?'
            teamName={pendingOffer.teamName}
            detail={`${pendingOffer.compName} · ${pendingOffer.div === 2 ? '2ª' : '1ª'} División · Tier ${pendingOffer.tier}`}
            note={(() => {
              const bonus = signingRepBonus({ fromTier: review.currentTier || 1, toTier: pendingOffer.tier || 1 });
              const base = `Firmarás ${CONTRACT_SEASONS} temporadas y dejarás ${review.teamName}. Tu reputación viaja contigo; los PE del club actual no.`;
              return bonus > 0 ? `${base} Plus por dar el salto: +${bonus} de reputación.` : base;
            })()}
            onCancel={() => setPendingOffer(null)}
            onConfirm={() => { const o = pendingOffer; setPendingOffer(null); onAcceptOffer(o); }}
          />
        )}
        {confirmRenew && (
          <ConfirmSignModal
            title='¿Renovar contrato?'
            teamName={review.teamName}
            detail={`Nuevo contrato de ${CONTRACT_SEASONS} temporadas`}
            onCancel={() => setConfirmRenew(false)}
            onConfirm={() => { setConfirmRenew(false); onRenew && onRenew(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
