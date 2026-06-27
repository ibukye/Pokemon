import { useMemo } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import MegaToggle from '../components/MegaToggle.jsx'
import { calcCompatibility, calcDamage } from '../utils/calc.js'
import { getStatColor, getBaseForm, TYPE_JP } from '../utils/pokemon.js'

const STAT_LABELS = [
  ['hp',         'HP'],
  ['attack',     'こうげき'],
  ['defense',    'ぼうぎょ'],
  ['sp_attack',  'とくこう'],
  ['sp_defense', 'とくぼう'],
  ['speed',      'すばやさ'],
]

const STAT_MAX = { hp: 255, attack: 190, defense: 230, sp_attack: 194, sp_defense: 230, speed: 200 }

function RankMedal({ rank }) {
  const medals = { 0: { char: '🥇', color: '#FFD700' }, 1: { char: '🥈', color: '#C0C0C0' }, 2: { char: '🥉', color: '#CD7F32' } }
  const m = medals[rank]
  return m
    ? <span style={{ fontSize: 14 }}>{m.char}</span>
    : <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{rank + 1}</span>
}

function KoBadge({ ko }) {
  if (!ko) return null
  const isOneHit = ko === '確定1発' || ko === 'ほぼ1発'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
      background: isOneHit ? 'rgba(247,106,106,.2)' : 'rgba(247,160,106,.2)',
      color: isOneHit ? '#f76a6a' : '#f7a06a',
      border: `1px solid ${isOneHit ? 'rgba(247,106,106,.4)' : 'rgba(247,160,106,.4)'}`,
      whiteSpace: 'nowrap',
    }}>{ko}</span>
  )
}

function typeEffLabel(mult) {
  if (mult === 0) return { text: '無効', color: '#5a5f7a' }
  if (mult < 1)   return { text: `×${mult}`, color: '#5edf82' }
  if (mult > 2)   return { text: `×${mult}`, color: '#ff4d4d' }
  if (mult > 1)   return { text: `×${mult}`, color: '#f76a6a' }
  return { text: '×1', color: 'var(--text3)' }
}

export default function PokemonDetailPage({ pokemon, pokemonName, db, onMegaChange, party }) {
  const { pokemonDb, movesDb, abilitiesDb, typeChart } = db

  const enemyAbility = abilitiesDb[(pokemon.abilities ?? [])[0]] ?? {}

  // 攻撃/防御スコア (パーティ各メンバーから見た相手)
  const partyResults = useMemo(() => {
    return party.map(p => {
      const myMoveTypes = (p.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const scoreAtk    = calcCompatibility(myMoveTypes, pokemon, typeChart, enemyAbility)
      const enMoveTypes = (pokemon.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const myAbility   = abilitiesDb[(p.abilities ?? [])[0]] ?? {}
      const scoreDef    = calcCompatibility(enMoveTypes, p, typeChart, myAbility)
      return { ...p, scoreAtk, scoreDef, overall: scoreAtk + 1 / (scoreDef + 1) }
    })
  }, [pokemon, party, abilitiesDb, movesDb, typeChart])

  const sorted = useMemo(() => ({
    atk:     [...partyResults].sort((a, b) => b.scoreAtk - a.scoreAtk),
    def:     [...partyResults].sort((a, b) => a.scoreDef - b.scoreDef),
    overall: [...partyResults].sort((a, b) => b.overall - a.overall),
  }), [partyResults])

  // ダメージ計算
  const dmgResults = useMemo(() => {
    return partyResults.map(p => {
      const moves = (p.moves ?? []).map(name => {
        const mv = movesDb[name]
        if (!mv?.power || mv.category === 'status') return null
        const d = calcDamage(p, mv, pokemon, typeChart)
        return d ? { name, type: mv.type, ...d } : null
      }).filter(Boolean)
      return { pname: p.name, moves }
    }).filter(r => r.moves.length > 0)
  }, [pokemon, partyResults, movesDb, typeChart])

  // タイプ耐性表
  const typeDefense = useMemo(() => {
    return Object.keys(typeChart).map(atk => {
      let mult = 1.0
      if (enemyAbility?.type_multiplier) mult *= enemyAbility.type_multiplier[atk] ?? 1.0
      for (const def of pokemon.types ?? []) mult *= typeChart[atk]?.[def] ?? 1.0
      return { type: atk, mult }
    })
  }, [pokemon, typeChart, enemyAbility])

  const weaknesses  = typeDefense.filter(t => t.mult > 1).sort((a, b) => b.mult - a.mult)
  const resistances = typeDefense.filter(t => t.mult > 0 && t.mult < 1).sort((a, b) => a.mult - b.mult)
  const immunities  = typeDefense.filter(t => t.mult === 0)

  const maxAtk = Math.max(...partyResults.map(r => r.scoreAtk), 0.01)
  const maxDef = Math.max(...partyResults.map(r => r.scoreDef), 0.01)
  const maxOvr = Math.max(...partyResults.map(r => r.overall), 0.01)

  const baseForm = getBaseForm(pokemonName, pokemonDb) ?? pokemonName

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ══ ヘッダーカード ══════════════════════════════ */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        {/* 左: 基本情報 */}
        <div style={{ flex: '0 0 220px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>{pokemonName}</span>
            {pokemon.number && (
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>#{pokemon.number}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
            {(pokemon.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
          </div>

          {/* 特性 */}
          {(pokemon.abilities ?? []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {pokemon.abilities.map((ab, i) => (
                <span key={ab} style={{
                  display: 'inline-block', fontSize: 10, padding: '2px 6px',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 4, color: 'var(--text2)', marginRight: 4,
                }}>
                  {i === 0 ? '' : '🌟 '}{ab}
                </span>
              ))}
            </div>
          )}

          <MegaToggle
            currentName={pokemonName}
            pokemonDb={pokemonDb}
            onChange={onMegaChange}
          />
        </div>

        {/* 右: ステータス */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'grid', gap: 5 }}>
            {STAT_LABELS.map(([key, label]) => {
              const val = pokemon.stats?.[key] ?? 0
              const pct = Math.min(100, val / STAT_MAX[key] * 100)
              const color = getStatColor(val, key)
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 36px', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', fontWeight: 600 }}>{label}</span>
                  <div style={{ height: 7, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`, background: color,
                      borderRadius: 4, transition: 'width .4s cubic-bezier(.4,0,.2,1)',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color, textAlign: 'right', fontFamily: 'monospace' }}>{val}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text3)', textAlign: 'right' }}>
            合計: <span style={{ color: 'var(--text2)', fontWeight: 700 }}>
              {Object.values(pokemon.stats ?? {}).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ══ タイプ相性 ══════════════════════════════════ */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          タイプ相性
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weaknesses.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#f76a6a', fontWeight: 600, marginBottom: 4 }}>弱点</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {weaknesses.map(({ type, mult }) => {
                  const { color } = typeEffLabel(mult)
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <TypeBadge type={type} />
                      <span style={{ fontSize: 10, fontWeight: 700, color }}>{typeEffLabel(mult).text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {resistances.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#5edf82', fontWeight: 600, marginBottom: 4 }}>耐性</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {resistances.map(({ type, mult }) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <TypeBadge type={type} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#5edf82' }}>{typeEffLabel(mult).text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {immunities.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>無効</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {immunities.map(({ type }) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <TypeBadge type={type} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>×0</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ パーティ分析 ══════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

        {/* 攻撃 ranking */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            攻撃 ranking
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.atk.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RankMedal rank={i} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <div style={{ width: 50, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.scoreAtk / maxAtk * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{p.scoreAtk.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 防御 ranking */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            防御 ranking <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(低いほど良)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.def.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RankMedal rank={i} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <div style={{ width: 50, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.scoreDef / maxDef * 100}%`, background: '#5edf82', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{p.scoreDef.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 総合 ranking */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            総合 ranking
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.overall.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RankMedal rank={i} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <div style={{ width: 50, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.overall / maxOvr * 100}%`, background: 'var(--accent2)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{p.overall.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ダメージ計算 ════════════════════════════════ */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          ダメージ計算 → {pokemonName}
        </div>
        {dmgResults.length === 0
          ? <div style={{ color: 'var(--text3)', fontSize: 12 }}>技データなし</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {dmgResults.map(r => (
                <div key={r.pname} style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{r.pname}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {r.moves.map(m => {
                      const pct = parseFloat(m.maxPct)
                      const barColor = pct >= 100 ? '#f76a6a' : pct >= 50 ? '#f7a06a' : 'var(--accent)'
                      return (
                        <div key={m.name}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <TypeBadge type={m.type} />
                            <span style={{ fontSize: 11, flex: 1 }}>{m.name}</span>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text2)' }}>
                              {m.minPct}〜{m.maxPct}%
                            </span>
                            <KoBadge ko={m.koChance} />
                          </div>
                          {/* ダメージバー */}
                          <div style={{ height: 3, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, pct)}%`,
                              background: barColor,
                              borderRadius: 2,
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}