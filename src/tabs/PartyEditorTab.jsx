import { useState, useMemo } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import PokemonBrowser from '../components/PokemonBrowser.jsx'
import { getMegaForms, getBaseForm, isMega, TYPE_JP } from '../utils/pokemon.js'
import { calcDamage, calcEffectiveness } from '../utils/calc.js'
import QuickSearch from '../components/QuickSearch.jsx'
import MoveSearch from '../components/MoveSearch.jsx'

// ─────────────────────────────────────────────────────────
// 性格一覧（上昇/下降スタット）
// ─────────────────────────────────────────────────────────
const NATURES = [
  { name: 'がんばりや', up: null,  down: null  },
  { name: 'さみしがり', up: 'atk', down: 'def' },
  { name: 'いじっぱり', up: 'atk', down: 'spa' },
  { name: 'やんちゃ',   up: 'atk', down: 'spd' },
  { name: 'ゆうかん',   up: 'atk', down: 'spe' },
  { name: 'ずぶとい',   up: 'def', down: 'atk' },
  { name: 'すなおな',   up: null,  down: null  },
  { name: 'のんき',     up: 'def', down: 'spa' },
  { name: 'わんぱく',   up: 'def', down: 'spd' },
  { name: 'のうてんき', up: 'def', down: 'spe' },
  { name: 'ひかえめ',   up: 'spa', down: 'atk' },
  { name: 'おっとり',   up: 'spa', down: 'def' },
  { name: 'うっかりや', up: null,  down: null  },
  { name: 'れいせい',   up: 'spa', down: 'spe' },
  { name: 'おだやか',   up: 'spd', down: 'atk' },
  { name: 'おとなしい', up: 'spd', down: 'def' },
  { name: 'しんちょう', up: 'spd', down: 'spa' },
  { name: 'なまいき',   up: 'spd', down: 'spe' },
  { name: 'よわむし',   up: null,  down: null  },
  { name: 'おくびょう', up: 'spe', down: 'atk' },
  { name: 'せっかち',   up: 'spe', down: 'def' },
  { name: 'ようき',     up: 'spe', down: 'spa' },
  { name: 'むじゃき',   up: 'spe', down: 'spd' },
  { name: 'てれや',     up: null,  down: null  },
]
const NATURE_LIST = NATURES

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const STAT_LABELS = { hp: 'HP', atk: 'こうげき', def: 'ぼうぎょ', spa: 'とくこう', spd: 'とくぼう', spe: 'すばやさ' }
const STAT_MAP = { hp: 'hp', atk: 'attack', def: 'defense', spa: 'sp_attack', spd: 'sp_defense', spe: 'speed' }

// ─────────────────────────────────────────────────────────
// ステータス計算（Lv50・個体値31固定）
// ─────────────────────────────────────────────────────────
function calcStatValue(base, ev, nature_mod, isHp = false) {
  const iv = 31
  const lv = 50
  if (isHp) {
    return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * lv / 100 + lv + 10)
  }
  return Math.floor((Math.floor((base * 2 + iv + Math.floor(ev / 4)) * lv / 100 + 5)) * nature_mod)
}

function calcAllStats(baseStats, evs, natureName) {
  const nature = NATURE_LIST.find(n => n.name === natureName) ?? { up: null, down: null }
  const result = {}
  for (const key of STAT_KEYS) {
    const dbKey = STAT_MAP[key]
    const base  = baseStats[dbKey] ?? 0
    const ev    = evs?.[key] ?? 0
    const mod   = key === 'hp' ? 1 : (nature.up === key ? 1.1 : nature.down === key ? 0.9 : 1.0)
    result[dbKey] = calcStatValue(base, ev, mod, key === 'hp')
  }
  return result
}

// ─────────────────────────────────────────────────────────
// デフォルト努力値・性格を作成
// ─────────────────────────────────────────────────────────
function makeDefaultMember(name, data) {
  return {
    name,
    baseStats: data.stats,   // 種族値（変えない）
    types:     data.types,
    abilities: data.abilities ?? [],
    moves:     data.moves ?? [],
    item:      '',
    nature:    'ようき',
    ability:   (data.abilities ?? [])[0] ?? '',
    evs:       { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    mega:      data.mega,
    base_form: data.base_form,
    number:    data.number,
  }
}

// ─────────────────────────────────────────────────────────
// EV合計チェック
// ─────────────────────────────────────────────────────────
function totalEv(evs) {
  return Object.values(evs ?? {}).reduce((s, v) => s + (v || 0), 0)
}

// ─────────────────────────────────────────────────────────
// PokeCard（ポケモンカード＋詳細編集）
// ─────────────────────────────────────────────────────────
function PokeCard({ p, idx, pokemonDb, movesDb, onRemove, onUpdate }) {
  const [expanded, setExpanded] = useState(false)

  const base     = getBaseForm(p.name, pokemonDb) ?? p.name
  const megas    = getMegaForms(base, pokemonDb)
  const evTotal  = totalEv(p.evs)
  const evLeft   = 508 - evTotal

  // 計算済みステータス
  const calcedStats = useMemo(
    () => calcAllStats(p.baseStats ?? {}, p.evs, p.nature),
    [p.baseStats, p.evs, p.nature]
  )

  const moves = [...(p.moves ?? []), '', '', '', ''].slice(0, 4)

  function setMove(si, name) {
    const next = [...moves]; next[si] = name
    onUpdate(idx, { moves: next.filter(Boolean) })
  }

  function setEv(key, raw) {
    const v   = Math.max(0, Math.min(252, Number(raw) || 0))
    const cur = totalEv({ ...p.evs, [key]: 0 })
    const clamped = Math.min(v, 508 - cur)
    onUpdate(idx, { evs: { ...p.evs, [key]: clamped } })
  }

  function toggleMega(megaName) {
    const newName  = p.name === megaName ? base : megaName
    const newData  = pokemonDb[newName]
    if (!newData) return
    onUpdate(idx, {
      name:      newName,
      types:     newData.types,
      abilities: newData.abilities ?? [],
      ability:   (newData.abilities ?? [])[0] ?? p.ability,
      baseStats: newData.stats,
      mega:      newData.mega,
      base_form: newData.base_form,
    })
  }

  const nature  = NATURE_LIST.find(n => n.name === p.nature) ?? { up: null, down: null }

  function statColor(key) {
    if (nature.up   === key) return '#5edf82'
    if (nature.down === key) return '#f76a6a'
    return 'var(--text2)'
  }

  return (
    <div style={{
      background: 'var(--bg3)', border: `1px solid ${expanded ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden',
      gridColumn: expanded ? 'span 3' : 'span 1',
    }}>
      {/* ── ヘッダー ── */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
            background: expanded ? 'rgba(124,106,247,.2)' : 'var(--bg2)',
            border: `1px solid ${expanded ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
            color: expanded ? 'var(--accent)' : 'var(--text3)',
          }}
        >{expanded ? '閉じる' : '詳細'}</button>
        <button
          onClick={() => onRemove(idx)}
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
            background: 'rgba(247,106,106,.1)', border: '1px solid rgba(247,106,106,.3)',
            color: '#f76a6a',
          }}
        >×</button>
      </div>

      {/* ── 技・持ち物プレビュー（折り畳み時） ── */}
      {!expanded && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {moves.filter(Boolean).map(m => {
              const mv = movesDb[m]
              return (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text2)' }}>
                  {mv && <TypeBadge type={mv.type} />}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</span>
                </div>
              )
            })}
            {moves.filter(Boolean).length === 0 && (
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>技なし</span>
            )}
            {p.item && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>📦 {p.item}</div>}
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{p.nature} / EV {evTotal}</div>
          </div>
        </div>
      )}

      {/* ── 詳細編集パネル ── */}
      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* ── 列1: ステータス ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
              ステータス
            </div>
            {STAT_KEYS.map(key => {
              const base  = p.baseStats?.[STAT_MAP[key]] ?? 0
              const ev    = p.evs?.[key] ?? 0
              const final = calcedStats[STAT_MAP[key]] ?? 0
              return (
                <div key={key} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', width: 46, flexShrink: 0 }}>{STAT_LABELS[key]}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', width: 26, textAlign: 'right', fontFamily: 'monospace' }}>{base}</span>
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>+</span>
                    <input
                      type="number" min={0} max={252} step={4}
                      value={ev}
                      onChange={e => setEv(key, e.target.value)}
                      style={{
                        width: 40, background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 4, color: 'var(--text)', fontSize: 10, padding: '1px 4px',
                        outline: 'none', textAlign: 'right',
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>=</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statColor(key), fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                      {final}
                    </span>
                  </div>
                  {/* EVバー */}
                  <div style={{ height: 3, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ev / 252 * 100}%`, background: statColor(key) === 'var(--text2)' ? 'var(--accent)' : statColor(key), borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 9, color: evLeft < 0 ? '#f76a6a' : 'var(--text3)', marginTop: 4 }}>
              EV合計: {evTotal} / 508（残り {Math.max(0, evLeft)}）
            </div>
          </div>

          {/* ── 列2: 性格・特性・持ち物・メガシンカ ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
              性格・特性・持ち物
            </div>

            {/* 性格 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>性格</div>
              <select
                value={p.nature}
                onChange={e => onUpdate(idx, { nature: e.target.value })}
                style={{
                  width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 5, color: 'var(--text)', fontSize: 11, padding: '4px 6px', outline: 'none',
                }}
              >
                {NATURE_LIST.map(n => (
                  <option key={n.name} value={n.name}>
                    {n.name}{n.up ? ` (↑${STAT_LABELS[n.up]} ↓${STAT_LABELS[n.down]})` : ' (補正なし)'}
                  </option>
                ))}
              </select>
            </div>

            {/* 特性 */}
            {(p.abilities ?? []).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>特性</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(p.abilities ?? []).map(ab => (
                    <button
                      key={ab}
                      onClick={() => onUpdate(idx, { ability: ab })}
                      style={{
                        padding: '3px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                        background: p.ability === ab ? 'rgba(94,223,200,.15)' : 'var(--bg2)',
                        border: `1px solid ${p.ability === ab ? 'rgba(94,223,200,.5)' : 'var(--border)'}`,
                        color: p.ability === ab ? 'var(--accent2)' : 'var(--text2)',
                        fontWeight: p.ability === ab ? 700 : 400,
                      }}
                    >{ab}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 持ち物 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>持ち物</div>
              <input
                value={p.item ?? ''}
                onChange={e => onUpdate(idx, { item: e.target.value })}
                placeholder="例: こだわりスカーフ"
                style={{
                  width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 5, color: 'var(--text)', fontSize: 11, padding: '4px 8px', outline: 'none',
                }}
              />
            </div>

            {/* メガシンカ */}
            {megas.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>フォーム</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    className={`mega-toggle ${!isMega(p.name) ? 'on' : ''}`}
                    style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => toggleMega(base)}
                  >通常</button>
                  {megas.map(m => pokemonDb[m] && (
                    <button
                      key={m}
                      className={`mega-toggle ${p.name === m ? 'on' : ''}`}
                      style={{ fontSize: 10, padding: '2px 8px' }}
                      onClick={() => toggleMega(m)}
                    >⚡ {m.replace('メガ', '')}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 列3: 技 ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
              技（最大4つ）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {moves.map((m, si) => {
                const mv = movesDb[m]
                return (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', width: 12, flexShrink: 0 }}>{si + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MoveSearch
                        movesDb={movesDb}
                        value={m ?? ''}
                        onSelect={name => setMove(si, name)}
                        placeholder="技名を検索…"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// チーム弱点分析
// ─────────────────────────────────────────────────────────
function TeamWeaknessChart({ party, typeChart }) {
  const analysis = useMemo(() => {
    return Object.keys(typeChart).map(atkType => {
      const members = party.map(p => {
        let mult = 1.0
        for (const dt of p.types ?? []) mult *= typeChart[atkType]?.[dt] ?? 1.0
        return { name: p.name, mult }
      })
      return { type: atkType, members, weakCount: members.filter(m => m.mult > 1).length, immuneCount: members.filter(m => m.mult === 0).length }
    }).filter(t => t.weakCount > 0 || t.immuneCount > 0)
  }, [party, typeChart])

  const weaknesses = analysis.filter(t => t.weakCount > 0)
    .sort((a, b) => b.weakCount - a.weakCount || b.members.reduce((s,m)=>s+m.mult,0) - a.members.reduce((s,m)=>s+m.mult,0))
  const immunities = analysis.filter(t => t.immuneCount === party.length && party.length > 0)

  if (!party.length) return null

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        チーム弱点分析
      </div>
      {weaknesses.filter(t => t.weakCount >= 3).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#f76a6a', fontWeight: 600, marginBottom: 5 }}>⚠ 集中弱点 (3匹以上)</div>
          {weaknesses.filter(t => t.weakCount >= 3).map(({ type, members, weakCount }) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <TypeBadge type={type} />
              <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap' }}>
                {members.filter(m => m.mult > 1).map(m => (
                  <span key={m.name} style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 3,
                    background: m.mult >= 4 ? 'rgba(247,106,106,.25)' : 'rgba(247,160,106,.15)',
                    border: `1px solid ${m.mult >= 4 ? 'rgba(247,106,106,.4)' : 'rgba(247,160,106,.3)'}`,
                    color: m.mult >= 4 ? '#f76a6a' : '#f7a06a',
                  }}>{m.name} ×{m.mult}</span>
                ))}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{weakCount}/{party.length}匹</span>
            </div>
          ))}
        </div>
      )}
      {weaknesses.filter(t => t.weakCount < 3).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>弱点タイプ (1〜2匹)</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {weaknesses.filter(t => t.weakCount < 3).map(({ type, weakCount }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <TypeBadge type={type} /><span style={{ fontSize: 9, color: 'var(--text3)' }}>{weakCount}匹</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {immunities.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#5edf82', fontWeight: 600, marginBottom: 4 }}>全員無効</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {immunities.map(({ type }) => <TypeBadge key={type} type={type} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ダメージ計算パネル
// ─────────────────────────────────────────────────────────
function DamageCalcPanel({ party, db }) {
  const { pokemonDb, movesDb, typeChart } = db
  const [atkIdx,  setAtkIdx]  = useState(0)
  const [defName, setDefName] = useState('')
  const [defQuery,setDefQuery]= useState('')
  const [reversed,setReversed]= useState(false)

  const attacker = party[atkIdx] ?? null

  // 攻撃側: パーティのcalcedStatsを使う
  const atkStats = useMemo(() => {
    if (!attacker) return null
    return calcAllStats(attacker.baseStats ?? {}, attacker.evs, attacker.nature)
  }, [attacker])

  const atkPokemon = attacker ? { ...attacker, stats: atkStats } : null

  // 防御側: 外部入力 + EV 0・性格補正なし
  const defBase = defName ? pokemonDb[defName] : null
  const defPokemon = useMemo(() => {
    if (!defBase) return null
    return {
      ...defBase,
      name: defName,
      stats: calcAllStats(defBase.stats, {}, 'がんばりや'),
    }
  }, [defBase, defName])

  const actualAtk = reversed ? defPokemon : atkPokemon
  const actualDef = reversed ? atkPokemon : defPokemon

  const dmgResults = useMemo(() => {
    if (!actualAtk || !actualDef) return []
    return (actualAtk.moves ?? []).map(name => {
      const mv = movesDb[name]
      if (!mv?.power || mv.category === 'status') return null
      const d = calcDamage(actualAtk, mv, actualDef, typeChart)
      if (!d) return null
      const eff = calcEffectiveness(mv.type, actualDef.types ?? [], typeChart, null)
      return { name, type: mv.type, power: mv.power, eff, ...d }
    }).filter(Boolean)
  }, [actualAtk, actualDef, movesDb, typeChart])

  const KO_COLOR = { '確定1発': '#f76a6a', 'ほぼ1発': '#f7a06a', '確定2発': '#f7d45e' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 攻撃側 */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>攻撃側</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {party.map((p, i) => (
            <button key={p.name + i} onClick={() => { setAtkIdx(i); setReversed(false) }}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: atkIdx === i && !reversed ? 'rgba(124,106,247,.2)' : 'var(--bg3)',
                border: `1px solid ${atkIdx === i && !reversed ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
                color: atkIdx === i && !reversed ? 'var(--accent)' : 'var(--text2)',
                fontWeight: atkIdx === i && !reversed ? 700 : 400,
              }}>{p.name}</button>
          ))}
        </div>
        {attacker && (
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            {attacker.nature} / 攻撃: {atkStats?.attack} / 特攻: {atkStats?.sp_attack}
            <span style={{ marginLeft: 6 }}>(パーティ設定のEV・性格を使用)</span>
          </div>
        )}
      </div>

      {/* 入替ボタン */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => setReversed(v => !v)} disabled={!defPokemon}
          style={{
            padding: '5px 16px', borderRadius: 6, fontSize: 11, cursor: defPokemon ? 'pointer' : 'not-allowed',
            background: reversed ? 'rgba(94,223,200,.15)' : 'var(--bg3)',
            border: `1px solid ${reversed ? 'rgba(94,223,200,.4)' : 'var(--border)'}`,
            color: reversed ? 'var(--accent2)' : 'var(--text3)',
          }}>⇅ 攻防を入替{reversed ? '（入替中）' : ''}</button>
      </div>

      {/* 防御側 */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>防御側</div>
        <QuickSearch pokemonDb={pokemonDb} value={defQuery} onChange={setDefQuery}
          onSelect={name => { setDefName(name); setDefQuery('') }} placeholder="ポケモン名を入力…" />
        {defPokemon && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{defName}</span>
              <button onClick={() => setDefName('')}
                style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
              {(defPokemon.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>
              HP: {defPokemon.stats.hp} / 防御: {defPokemon.stats.defense} / 特防: {defPokemon.stats.sp_defense}
              <span style={{ marginLeft: 6 }}>(EV 0・補正なし想定)</span>
            </div>
          </div>
        )}
      </div>

      {/* 結果 */}
      {dmgResults.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {reversed ? defName : actualAtk?.name} → {reversed ? actualAtk?.name : defName}
          </div>
          {dmgResults.map(m => {
            const pct      = parseFloat(m.maxPct)
            const barColor = pct >= 100 ? '#f76a6a' : pct >= 50 ? '#f7a06a' : 'var(--accent)'
            const effLabel = m.eff === 0 ? '無効' : m.eff !== 1 ? `×${m.eff}` : null
            return (
              <div key={m.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <TypeBadge type={m.type} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>威力{m.power}</span>
                  {effLabel && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: m.eff > 1 ? 'rgba(247,106,106,.15)' : m.eff === 0 ? 'rgba(90,95,122,.2)' : 'rgba(94,223,130,.1)',
                      color: m.eff > 1 ? '#f76a6a' : m.eff === 0 ? 'var(--text3)' : '#5edf82',
                      border: `1px solid ${m.eff > 1 ? 'rgba(247,106,106,.3)' : m.eff === 0 ? 'var(--border)' : 'rgba(94,223,130,.3)'}`,
                    }}>{effLabel}</span>
                  )}
                  <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{m.minPct}〜{m.maxPct}%</span>
                  {m.koChance && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: `${KO_COLOR[m.koChance]}22`, border: `1px solid ${KO_COLOR[m.koChance]}66`,
                      color: KO_COLOR[m.koChance],
                    }}>{m.koChance}</span>
                  )}
                </div>
                <div style={{ position: 'relative', height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, parseFloat(m.minPct))}%`, background: barColor, opacity: .6, borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, pct)}%`, background: barColor, opacity: .25, borderRadius: 2 }} />
                  {[25,50,100].map(mark => (
                    <div key={mark} style={{ position: 'absolute', left: `${mark}%`, top: 0, bottom: 0, width: 1, background: 'var(--bg)', opacity: .7 }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {actualAtk && !defPokemon && (
        <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
          防御側のポケモンを入力してください
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────
export default function PartyEditorTab({ party, setParty, db, teamName, onRenameTeam }) {
  const { pokemonDb, movesDb, typeChart } = db
  const [rightTab, setRightTab] = useState('team')

  function addPokemon(name, data) {
    if (party.length >= 6 || party.find(p => p.name === name)) return
    setParty(prev => [...prev, makeDefaultMember(name, data)])
  }

  function removePokemon(idx) {
    setParty(prev => prev.filter((_, i) => i !== idx))
  }

  function updatePokemon(idx, patch) {
    setParty(prev => prev.map((p, i) => i !== idx ? p : { ...p, ...patch }))
  }

  function resetParty() {
    if (window.confirm('パーティをデフォルトに戻しますか？')) {
      fetch('/data/my_party.json').then(r => r.json()).then(data => {
        setParty(data.map(p => {
          const base = pokemonDb[p.name] ?? {}
          return {
            ...makeDefaultMember(p.name, { ...base, moves: p.moves ?? [], types: p.types ?? base.types ?? [] }),
            item:   p.item ?? '',
            moves:  p.moves ?? [],
            stats:  p.stats ?? base.stats,
          }
        }))
      })
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 0 }}>

      {/* ── 左ペイン: ポケモン検索 ── */}
      <div style={{ flex: '0 0 48%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="section-title">ポケモンを追加</div>
        <PokemonBrowser
          pokemonDb={pokemonDb}
          onSelect={addPokemon}
          selected={party.map(p => p.name)}
          maxCount={6}
          currentCount={party.length}
          defaultView="card"
        />
      </div>

      {/* ── 右ペイン ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={teamName ?? ''}
              onChange={e => onRenameTeam?.(e.target.value)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--accent)', fontSize: 13, fontWeight: 700, padding: '4px 10px',
                outline: 'none', width: 140,
              }}
              placeholder="チーム名"
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{party.length}/6</span>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['team','チーム編集'], ['dmgcalc','ダメージ計算']].map(([key, label]) => (
              <button key={key} onClick={() => setRightTab(key)}
                style={{
                  padding: '4px 11px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: rightTab === key ? 'rgba(124,106,247,.18)' : 'var(--bg3)',
                  border: `1px solid ${rightTab === key ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
                  color: rightTab === key ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: rightTab === key ? 700 : 400,
                }}>{label}</button>
            ))}
            <button className="del-btn" style={{ float: 'none' }} onClick={resetParty}>リセット</button>
          </div>
        </div>

        {/* チーム編集タブ */}
        {rightTab === 'team' && (
          <>
            <TeamWeaknessChart party={party} typeChart={typeChart} />
            {party.length === 0
              ? <div className="empty-state">左のリストからポケモンを追加してください</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {party.map((p, i) => (
                    <PokeCard
                      key={p.name + i}
                      p={p} idx={i}
                      pokemonDb={pokemonDb}
                      movesDb={movesDb}
                      onRemove={removePokemon}
                      onUpdate={updatePokemon}
                    />
                  ))}
                </div>
              )
            }
          </>
        )}

        {/* ダメージ計算タブ */}
        {rightTab === 'dmgcalc' && (
          party.length === 0
            ? <div className="empty-state">先にチームにポケモンを追加してください</div>
            : <DamageCalcPanel party={party} db={db} />
        )}
      </div>
    </div>
  )
}