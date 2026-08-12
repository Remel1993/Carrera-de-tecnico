// @ts-nocheck
/**
 * MODO CARRERA — lógica pura basada en el GDD DiceLeague (V8 + V11 ampliado).
 * Sin dependencias de React: sólo cálculo de tiers, PE, reputación,
 * objetivos, expectativas, contratos, Champions y mercado de entrenadores.
 */

export const CAREER_LEAGUE_ID = 'L7'; // Miscelánea Europea
export const CAREER_DIV = 2; // Segunda División

// Duración máxima de un contrato: al terminar hay que renovar o cambiar de aires
export const CONTRACT_SEASONS = 3;

// Plazas de clasificación a Champions en 1ª División
export const CL_SPOTS = 4;

// Clases de liga (GDD §4)
export const LEAGUE_CLASS = {
  L1: 'A', L2: 'A', L3: 'A', L4: 'A', // Élite
  L6: 'B', L5: 'B',                   // Estratégica / consolidación
  L7: 'C'                             // Desarrollo
};

export const CLASS_INFO = {
  A: { label: 'Élite', repMult: 1.0, maxTier: 4 },
  B: { label: 'Estratégica', repMult: 0.75, maxTier: 3 },
  C: { label: 'Desarrollo', repMult: 0.5, maxTier: 2 }
};

// Tiers de clubes (GDD §5) — techos por atributo
export const TIERS = {
  1: { name: 'Fondo de Segunda', caps: { att: 3, opp: 3, def: 3 }, philosophy: 'Sobrevivir, desarrollar y ascender' },
  2: { name: 'Cima de Segunda', caps: { att: 4, opp: 4, def: 3 }, philosophy: 'Luchar por ascenso y consolidarse' },
  3: { name: 'Media de Primera', caps: { att: 5, opp: 4, def: 4 }, philosophy: 'Consolidarse y competir arriba' },
  4: { name: 'Gigante de Primera', caps: { att: 5, opp: 5, def: 4 }, philosophy: 'Gestionar resultados; exigencia máxima' }
};

// Costos de evolución con PE (GDD §10): costo del salto hacia el nivel destino
export const PE_COST = { 2: 15, 3: 35, 4: 70, 5: 70 };

export const peCostFor = (currentValue) => PE_COST[currentValue + 1] ?? 999;

export const tierOf = (team) => {
  const total = (team?.att || 0) + (team?.opp || 0) + (team?.def || 0);
  if (total >= 14) return 4;
  if (total >= 13) return 3;
  if (total >= 11) return 2;
  return 1;
};

export const tierCaps = (tier) => TIERS[tier]?.caps || TIERS[1].caps;

export const classOf = (compId) => LEAGUE_CLASS[compId] || 'C';

export const strengthOf = (t) => (t?.att || 0) + (t?.opp || 0) + (t?.def || 0);

/** El club llegó a su techo institucional: los PE ya no sirven de nada. */
export const isSquadMaxed = (team, tier) => {
  if (!team) return false;
  const caps = tierCaps(tier || 1);
  return (team.att || 0) >= caps.att && (team.opp || 0) >= caps.opp && (team.def || 0) >= caps.def;
};

/**
 * PE que todavía tienen utilidad real en este club: la suma de lo que cuesta
 * subir cada atributo hasta el techo del Tier. Ganar más PE no sirve de nada,
 * así que el acumulado nunca debe superar este valor.
 */
export const remainingUpgradeCost = (team, tier) => {
  if (!team) return 0;
  const caps = tierCaps(tier || 1);
  let total = 0;
  ['att', 'opp', 'def'].forEach(attr => {
    for (let v = team[attr] || 0; v < caps[attr]; v++) total += peCostFor(v);
  });
  return total;
};

/** Recorta los PE al máximo aprovechable por el club. */
export const capPE = (pe, team, tier) => Math.max(0, Math.min(pe, remainingUpgradeCost(team, tier)));

/**
 * Plus de reputación al firmar por un club mayor: el mercado premia dar el
 * salto, no saltar de banquillo en banquillo. Máximo 15 puntos.
 */
export const signingRepBonus = ({ fromTier = 1, toTier = 1, fromStrength = 0, toStrength = 0 } = {}) => {
  const tierStep = (toTier || 1) - (fromTier || 1);
  if (tierStep <= 0) return 0;
  const strengthStep = Math.max(0, (toStrength || 0) - (fromStrength || 0));
  const bonus = tierStep * 8 + Math.min(6, strengthStep * 1.5);
  return clampRep(Math.min(15, bonus));
};


// Bandas de reputación (GDD §26)
export const REPUTATION_BANDS = [
  { min: 0, max: 20, label: 'Desconocido', desc: 'Clubes Tier 1 y proyectos modestos' },
  { min: 21, max: 40, label: 'Prometedor', desc: 'Clubes Tier 1 y Tier 2 de clase C/B' },
  { min: 41, max: 60, label: 'Consolidado', desc: 'Tier 2 y Tier 3 de clase B' },
  { min: 61, max: 70, label: 'Reconocido', desc: 'Clase A media y Tier 3' },
  { min: 71, max: 100, label: 'Élite mundial', desc: 'Clase A y gigantes Tier 4' }
];

export const repBand = (rep) =>
  REPUTATION_BANDS.find(b => rep >= b.min && rep <= b.max) || REPUTATION_BANDS[0];

export const clampRep = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

// Distribuciones tácticas permitidas (GDD §6): mismo total, techos del tier
export const tacticalOptions = (base, tier) => {
  const total = (base?.att || 0) + (base?.opp || 0) + (base?.def || 0);
  const caps = tierCaps(tier);
  const min = 1;
  const out = [];
  for (let att = min; att <= caps.att; att++) {
    for (let opp = min; opp <= caps.opp; opp++) {
      const def = total - att - opp;
      if (def < min || def > caps.def) continue;
      out.push({ att, opp, def });
    }
  }
  return out.sort((a, b) => b.att - a.att || b.opp - a.opp);
};

export const sameDist = (a, b) => !!a && !!b && a.att === b.att && a.opp === b.opp && a.def === b.def;

// PE por resultado (GDD §9)
export const peForResult = (result) => (result === 'W' ? 3 : result === 'D' ? 1 : 0);

// Reputación por partido con contexto de rival (GDD §11)
export const repForMatch = (result, ownStrength, rivalStrength) => {
  const gap = rivalStrength - ownStrength; // >0 rival superior
  if (result === 'W') return clampRep(0.5 + Math.max(0, Math.min(0.5, gap * 0.15)) + 0.25);
  if (result === 'D') return 0.2 + Math.max(0, Math.min(0.1, gap * 0.05));
  return -(0.5 + Math.max(0, Math.min(0.5, -gap * 0.15)) + 0.25);
};

// Objetivos por Tier (GDD §12) — evaluados sobre 20 equipos
const OBJECTIVES = {
  1: [
    { from: 1, to: 6, rep: 20, pe: 50, note: 'Ascenso a Tier 2', promote: true },
    { from: 7, to: 11, rep: 10, pe: 30, note: 'Temporada notable' },
    { from: 12, to: 15, rep: 5, pe: 15, note: 'Objetivo cumplido' },
    { from: 16, to: 17, rep: -8, pe: 5, note: 'Temporada preocupante' },
    { from: 18, to: 20, rep: -20, pe: 0, note: 'Descenso; despido seguro', fire: true }
  ],
  2: [
    { from: 1, to: 2, rep: 25, pe: 60, note: 'Ascenso a Tier 3', promote: true },
    { from: 3, to: 10, rep: 5, pe: 20, note: 'Objetivo cumplido' },
    { from: 11, to: 20, rep: -15, pe: 0, note: 'Posible despido', riskFire: true }
  ],
  3: [
    { from: 1, to: 4, rep: 20, pe: 50, note: 'Gran temporada', promote: true },
    { from: 5, to: 12, rep: 5, pe: 20, note: 'Objetivo cumplido' },
    { from: 13, to: 20, rep: -25, pe: 0, note: 'Despido inminente', fire: true }
  ],
  4: [
    { from: 1, to: 1, rep: 25, pe: 0, note: 'Campeón: exigencia cumplida' },
    { from: 2, to: 4, rep: 5, pe: 0, note: 'Aceptable' },
    { from: 5, to: 20, rep: -25, pe: 0, note: 'Crisis; despido probable', riskFire: true }
  ]
};

export const objectiveFor = (tier, position) => {
  const table = OBJECTIVES[tier] || OBJECTIVES[1];
  return table.find(r => position >= r.from && position <= r.to) || table[table.length - 1];
};

// Posición esperada (GDD §17): prestigio del club dentro de su división
export const expectedPosition = (teams, teamId) => {
  const ranked = [...(teams || [])].sort((a, b) => strengthOf(b) - strengthOf(a));
  const idx = ranked.findIndex(t => t.id === teamId);
  return idx < 0 ? Math.ceil((teams?.length || 20) / 2) : idx + 1;
};

// Detección de rendimiento inesperado (GDD §16)
export const readPerformance = (position, expected) => {
  const diff = expected - position; // >0 mejor de lo esperado
  if (diff >= 8) return { key: 'milagro', label: 'Sorpresa mayúscula', detail: 'Muy por encima de lo esperado', score: 3 };
  if (diff >= 4) return { key: 'sobresaliente', label: 'Rendimiento sobresaliente', detail: 'Por encima de lo esperado', score: 2 };
  if (diff >= 2) return { key: 'destacado', label: 'Actuación destacada', detail: 'Ligeramente por encima', score: 1 };
  if (diff <= -8) return { key: 'crisis', label: 'Crisis deportiva', detail: 'Muy por debajo de lo esperado', score: -3 };
  if (diff <= -4) return { key: 'decepcion', label: 'Temporada decepcionante', detail: 'Por debajo de lo esperado', score: -2 };
  if (diff <= -2) return { key: 'flojo', label: 'Rendimiento flojo', detail: 'Ligeramente por debajo', score: -1 };
  return { key: 'normal', label: 'Rendimiento esperado', detail: 'Dentro de lo previsto', score: 0 };
};

/* ============================ OBJETIVOS DE TEMPORADA ============================
 * Tres objetivos aterrizados a la realidad del club: se calculan desde la posición
 * esperada por presupuesto, los partidos realmente jugados y la reputación actual.
 * Si el club puede pelear Champions, se añade un objetivo extra.
 */
export const seasonObjectives = ({
  tier, div, position, expected, wins, draws = 0, played = 0, totalRounds = 0,
  reputation, total = 20, clQualified = false, clPhase = null, clChampion = false, clEliminated = false
}) => {
  const size = total || 20;
  const exp = Math.max(1, Math.min(size, expected || Math.ceil(size / 2)));
  const rounds = totalRounds || Math.max(played, (size - 1) * 2);

  // 1) Posición: mejorar ligeramente la expectativa, con techos y suelos coherentes
  const posTarget = tier >= 4
    ? Math.min(2, exp)
    : tier === 3
      ? Math.max(1, Math.min(exp, Math.max(4, exp - 2)))
      : Math.max(1, Math.min(size - 2, exp - 1));

  // 2) Victorias: ritmo de puntos razonable según lo que se exige al club
  const winRate = posTarget <= 2 ? 0.6 : posTarget <= 6 ? 0.45 : posTarget <= 12 ? 0.35 : 0.25;
  const winTarget = Math.max(3, Math.round(rounds * winRate));

  // 3) Reputación: crecimiento modesto sobre la que ya tienes
  const repTarget = clampRep(Math.min(100, (reputation || 0) + (tier >= 3 ? 4 : 6)));

  const items = [
    {
      key: 'position',
      label: `Terminar ${posTarget === 1 ? 'campeón' : `entre los ${posTarget} primeros`}`,
      detail: `Ahora ${played && position ? `${position}º` : '—'} de ${size} · previsión ${exp}º`,
      done: played > 0 && !!position && position <= posTarget
    },
    {
      key: 'wins',
      label: `Ganar ${winTarget} partidos`,
      detail: `Llevas ${wins} de ${winTarget} en ${played} jugado${played === 1 ? '' : 's'}`,
      done: wins >= winTarget
    },
    {
      key: 'reputation',
      label: `Llegar a ${repTarget} de reputación`,
      detail: `Reputación actual ${reputation}`,
      done: (reputation || 0) >= repTarget
    }
  ];

  // Objetivo extra continental (la Champions global, la única que existe)
  if (clQualified) {
    items.push({
      key: 'champions',
      extra: true,
      label: clPhase === 'Final' || clPhase === 'Semis' ? 'Ganar la Champions' : 'Llegar lejos en Champions',
      detail: clChampion
        ? 'Campeón de Europa'
        : clEliminated
          ? 'Eliminado de la competición'
          : `Ronda actual: ${clPhaseLabel(clPhase)}`,
      done: clChampion
    });
  } else if (div === 1) {
    items.push({
      key: 'championsSpot',
      extra: true,
      label: `Clasificar a Champions (top ${CL_SPOTS})`,
      detail: played && position ? `Ahora ${position}º` : 'Sin clasificación aún',
      done: played > 0 && !!position && position <= CL_SPOTS
    });
  }

  return items;
};

/* ================================= CHAMPIONS =================================
 * NO existe una Champions propia del modo carrera: el técnico juega la MISMA
 * Champions League de la temporada global (competición 'C1'), con sus 32
 * participantes, su fase de grupos y sus eliminatorias. Aquí sólo viven las
 * utilidades de lectura de ese torneo.
 */
export const CL_PHASE_ORDER = ['groups', 'Octavos', 'Cuartos', 'Semis', 'Final', 'Terminado'];

export const clPhaseLabel = (phase) => ({
  groups: 'Fase de grupos',
  Octavos: 'Octavos de final',
  Cuartos: 'Cuartos de final',
  Semis: 'Semifinales',
  Final: 'Final',
  Terminado: 'Torneo terminado'
}[phase] || 'Fase de grupos');

/** Reputación por el recorrido europeo del club en la Champions global. */
export const clProgressRep = ({ champion = false, phaseReached = null, played = false } = {}) => {
  if (champion) return 8;
  if (!played) return 0;
  const idx = CL_PHASE_ORDER.indexOf(phaseReached || 'groups');
  if (idx >= 4) return 5; // llegó a la Final
  if (idx === 3) return 3.5; // Semifinales
  if (idx === 2) return 2.5; // Cuartos
  if (idx === 1) return 1.5; // Octavos
  return 0.5; // sólo grupos
};

/* ======================== MERCADO DE ENTRENADORES ==========================
 * (GDD §18-20) La progresión es coherente: nadie salta de Tier 1 a un gigante.
 * - Buen año (objetivos cumplidos + rendimiento sobre lo esperado) → puedes
 *   subir COMO MÁXIMO un Tier respecto al club que dirigías.
 * - Fin de contrato sin brillar → clubes de tu mismo nivel o por debajo.
 * - Despido → el mercado castiga: sólo proyectos de menor Tier, pocas ofertas
 *   y, con mala reputación, ninguna.
 * La reputación es un filtro DURO: sin ella no hay club grande posible.
 */
const MIN_REP_FOR_CLASS = { C: 0, B: 35, A: 60 };
const MIN_REP_FOR_TIER = { 1: 0, 2: 20, 3: 45, 4: 70 };

/** Cuántas ofertas puede recibir el técnico según su situación y reputación. */
export const offerCountFor = ({ kind, reputation = 0, objectivesMet = 0, score = 0 }) => {
  if (kind === 'fired') {
    if (reputation < 15) return 0;             // despedido y sin nombre: paro
    if (reputation < 35 || score <= -2) return 1;
    return 2;
  }
  if (kind === 'renewal') return reputation >= 45 || objectivesMet >= 2 ? 3 : 2;
  // Interés por rendimiento durante/al final de una buena temporada
  if (score >= 3 && objectivesMet >= 2) return 3;
  if (score >= 2 || objectivesMet >= 2) return 2;
  return 1;
};

/**
 * Devuelve ofertas realistas: nunca un salto de más de un Tier, siempre con la
 * reputación suficiente y con castigo real tras un despido.
 */
export const buildOffers = ({
  comps, career, performance, reputation, season, leagueNames,
  kind = 'performance', objectivesMet = 0, count = null
}) => {
  if (!comps) return [];
  const score = performance?.score ?? 0;
  const currentTier = career.tier || 1;
  const goodSeason = objectivesMet >= 2 && score >= 1;

  // Sin buen año no hay clubes llamando a media temporada
  if (kind === 'performance' && !goodSeason) return [];

  const wanted = count ?? offerCountFor({ kind, reputation, objectivesMet, score });
  if (wanted <= 0) return [];

  // Techo y suelo de nivel según lo ocurrido en la temporada
  let maxTier, minTier;
  if (kind === 'fired') {
    maxTier = Math.max(1, currentTier - 1);
    minTier = 1;
  } else if (kind === 'renewal') {
    maxTier = goodSeason ? Math.min(4, currentTier + 1) : currentTier;
    minTier = Math.max(1, currentTier - 1);
  } else {
    maxTier = Math.min(4, currentTier + 1);
    minTier = currentTier;
  }

  const candidates = [];
  Object.keys(LEAGUE_CLASS).forEach(compId => {
    const comp = comps[compId];
    if (!comp) return;
    [1, 2].forEach(div => {
      const teams = div === 2 ? comp.teams2 : comp.teams;
      (teams || []).forEach(team => {
        if (compId === career.compId && div === career.div && team.id === career.teamId) return;
        const tier = tierOf(team);
        const cls = classOf(compId);
        if (tier > (CLASS_INFO[cls]?.maxTier || 4)) return;
        if (tier > maxTier || tier < minTier) return;
        // Filtro de reputación: duro y sin excepciones
        if (reputation < (MIN_REP_FOR_CLASS[cls] || 0)) return;
        if (reputation < (MIN_REP_FOR_TIER[tier] || 0)) return;
        const appeal = score * 2 + reputation / 25 - (tier - currentTier) * 1.5;
        candidates.push({
          compId, compName: leagueNames?.[compId] || comp.name, div, team, tier, cls,
          appeal, strength: strengthOf(team)
        });
      });
    });
  });
  if (!candidates.length) return [];

  // Reparto por niveles: como mucho UN club del Tier superior; el resto, de tu nivel
  const stepUp = candidates.filter(c => c.tier === currentTier + 1).sort((a, b) => b.strength - a.strength);
  const same = candidates.filter(c => c.tier === currentTier).sort(() => Math.random() - 0.5);
  const lower = candidates.filter(c => c.tier < currentTier).sort((a, b) => b.strength - a.strength);

  const pick = (arr) => (arr.length ? arr.splice(Math.floor(Math.random() * Math.min(arr.length, 5)), 1)[0] : null);
  const chosen = [];
  if (goodSeason && kind !== 'fired' && stepUp.length) {
    const up = pick(stepUp);
    if (up) chosen.push(up);
  }
  while (chosen.length < wanted) {
    const c = kind === 'fired'
      ? (pick(lower) || pick(same))
      : (pick(same) || pick(lower) || pick(stepUp));
    if (!c) break;
    if (!chosen.some(x => x.compId === c.compId && x.div === c.div && x.team.id === c.team.id)) chosen.push(c);
  }

  const reasonFor = (c) => {
    if (kind === 'fired') return c.tier < currentTier ? 'Proyecto de reconstrucción para relanzarte' : 'Última oportunidad tras el despido';
    if (kind === 'renewal') return c.tier > currentTier ? 'Salto de nivel al acabar contrato' : 'Oferta de mercado al acabar tu contrato';
    return c.tier > currentTier
      ? `${performance?.label || 'Gran temporada'}: te quieren para un proyecto mayor`
      : performance?.label || 'Interés por tu trabajo';
  };

  return chosen.slice(0, wanted).map(c => ({
    id: `${season}-${c.compId}-${c.div}-${c.team.id}`,
    season,
    compId: c.compId,
    compName: c.compName,
    div: c.div,
    teamId: c.team.id,
    teamName: c.team.name,
    color1: c.team.color1,
    color2: c.team.color2,
    isFlag: c.team.isFlag,
    tier: c.tier,
    cls: c.cls,
    step: c.tier > currentTier ? 'up' : c.tier === currentTier ? 'same' : 'down',
    profile: c.tier >= 3 ? 'Dominante' : c.tier === 2 ? 'Media tabla' : 'Proyecto modesto',
    seasons: CONTRACT_SEASONS,
    reason: reasonFor(c)
  }));
};

/* =============================== DESPIDOS =================================
 * Más duros: la probabilidad crece con lo mal que fue la temporada y con la
 * mala racha acumulada. Un objetivo fallado ya no se perdona dos veces.
 */
export const fireChance = ({ objective, score = 0, objectivesMet = 0, badStreak = 0, tier = 1 }) => {
  if (objective?.fire) return 1;
  if (!objective?.riskFire) {
    // Aun sin riesgo formal, dos temporadas seguidas por debajo pesan
    if (badStreak >= 2 && score <= -2 && objectivesMet === 0) return 0.35;
    return 0;
  }
  let p = 0.65;
  if (score <= -3) p = 0.95;
  else if (score <= -2) p = 0.85;
  else if (score <= -1) p = 0.75;
  if (objectivesMet === 0) p += 0.1;
  if (objectivesMet >= 2) p -= 0.25;
  if (badStreak >= 1) p += 0.15;
  if (tier >= 4) p += 0.05; // en un gigante la paciencia es mínima
  return Math.max(0.1, Math.min(0.98, p));
};


// Los 5 equipos con estadísticas más mediocres de una división
export const worstTeams = (teams, count = 5) => {
  return [...(teams || [])]
    .sort((a, b) => strengthOf(a) - strengthOf(b) || (a.name || '').localeCompare(b.name || ''))
    .slice(0, count);
};

/** Trayectoria: sólo los cambios de club, sin repetir información por temporada. */
export const careerSpells = (history = []) => {
  const asc = [...history].sort((a, b) => a.season - b.season);
  const spells = [];
  asc.forEach(s => {
    const last = spells[spells.length - 1];
    if (last && last.teamName === s.teamName && last.compName === s.compName) {
      last.to = s.season;
      last.seasons += 1;
      last.bestPosition = Math.min(last.bestPosition, s.position || 99);
      last.repAfter = s.repAfter;
      return;
    }
    spells.push({
      teamName: s.teamName,
      compName: s.compName,
      from: s.season,
      to: s.season,
      seasons: 1,
      bestPosition: s.position || 99,
      repAfter: s.repAfter,
      arrival: s.arrival || (spells.length === 0 ? 'Inicio de carrera' : 'Cambio de club')
    });
  });
  return spells.reverse();
};

export const DEFAULT_CAREER = {
  active: false,
  manager: 'Nuevo Técnico',
  compId: CAREER_LEAGUE_ID,
  div: CAREER_DIV,
  teamId: null,
  tier: 1,
  pe: 0,
  reputation: 10,
  startedSeason: 1,
  contractStart: 1,
  contractSeasons: CONTRACT_SEASONS,
  tactic: null,
  baseDist: null,
  seasonLog: [],
  seasonHistory: [],
  offers: [],
  fired: false,
  // Champions: la carrera se engancha a la Champions global ('C1'), no crea otra
  clSeason: null,
  clQualifiedFor: null,
  badStreak: 0,
  lastObjectivesMet: 0,
  lastProcessedSeason: 0,
  // Temporada en la que ya se firmó (renovación o club nuevo): bloquea el balance
  signedForSeason: 0,
  // Club del primer contrato: si te despiden de él y era de los más humildes,
  // puedes volver a empezar allí
  firstTeamId: null,
  firstTeamCompId: null,
  firstTeamDiv: null
};
