import { useState, useMemo } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'
import QuickSearch from '../components/QuickSearch.jsx'
import PokemonBrowser from '../components/PokemonBrowser.jsx'
import MegaToggle from '../components/MegaToggle.jsx'
import PokemonDetailPage from './PokemonDetailPage.jsx'
import { calcCompatibility, calcDamage } from '../utils/calc.js'
import { getBaseForm } from '../utils/pokemon.js'

export default function AnalysisTab({ party, db }) {
  const { pokemonDb, movesDb, abilitiesDb, typeChart } = db

  const [query,      setQuery]      = useState('')
  const [enemyName,  setEnemyName]  = useState('')
  const [enemyBase,  setEnemyBase]  = useState('')
  const [detailMode, setDetailMode] = useState(false)

  const enemy = enemyName ? { ...pokemonDb[enemyName], name: enemyName } : null

  function selectEnemy(name) {
    setEnemyName(name)
    setEnemyBase(getBaseForm(name, pokemonDb) ?? name)
    setDetailMode(false)
  }

  // 攻撃/防御スコア計算
  const results = useMemo(() => {
    if (!enemy) return null
    const enemyAbility = abilitiesDb[(enemy.abilities ?? [])[0]] ?? {}
    return party.map(p => {
      const myMoveTypes = (p.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const scoreAtk    = calcCompatibility(myMoveTypes, enemy, typeChart, enemyAbility)
      const enMoveTypes = (enemy.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const myAbility   = abilitiesDb[(p.abilities ?? [])[0]] ?? {}
      const scoreDef    = calcCompatibility(enMoveTypes, p, typeChart, myAbility)
      return { ...p, scoreAtk, scoreDef, overall: scoreAtk + 1 / (scoreDef + 1) }
    })
  }, [enemy, party, abilitiesDb, movesDb, typeChart])

  const sorted = useMemo(() => {
    if (!results) return { atk: [], def: [], overall: [] }
    return {
      atk:     [...results].sort((a, b) => b.scoreAtk - a.scoreAtk),
      def:     [...results].sort((a, b) => a.scoreDef - b.scoreDef),
      overall: [...results].sort((a, b) => b.overall - a.overall),
    }
  }, [results])

  const dmgResults = useMemo(() => {
    if (!enemy || !results) return []
    return results.map(p => {
      const moves = (p.moves ?? []).map(name => {
        const mv = movesDb[name]
        if (!mv?.power || mv.category === 'status') return null
        const d = calcDamage(p, mv, enemy, typeChart)
        return d ? { name, type: mv.type, ...d } : null
      }).filter(Boolean)
      return { pname: p.name, moves }
    }).filter(r => r.moves.length > 0)
  }, [enemy, results, movesDb, typeChart])

  const maxAtk = results ? Math.max(...results.map(r => r.scoreAtk), 0.01) : 1
  const maxDef = results ? Math.max(...results.map(r => r.scoreDef), 0.01) : 1
  const maxOvr = results ? Math.max(...results.map(r => r.overall),  0.01) : 1
  const rankColor = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 0 }}>

      {/* ── 左ペイン：ポケモン選択 ── */}
      <div style={{ flex: '0 0 52%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="section-title">相手ポケモンを選択</div>
        <QuickSearch
          pokemonDb={pokemonDb}
          value={query}
          onChange={setQuery}
          onSelect={name => selectEnemy(name)}
          placeholder="名前で素早く検索…"
        />
        <PokemonBrowser
          pokemonDb={pokemonDb}
          onSelect={name => selectEnemy(name === enemyName ? '' : name)}
          selected={enemyName}
          defaultView="card"
        />
      </div>

      {/* ── 右ペイン：分析結果 ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {enemy ? (
          <>
            {/* 詳細ページ表示切替 */}
            {detailMode ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <button
                    onClick={() => setDetailMode(false)}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      color: 'var(--text2)', borderRadius: 6, padding: '5px 12px',
                      fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    ← 分析に戻る
                  </button>
                </div>
                <PokemonDetailPage
                  pokemon={enemy}
                  pokemonName={enemyName}
                  db={db}
                  party={party}
                  onMegaChange={name => { setEnemyName(name); setEnemyBase(getBaseForm(name, pokemonDb) ?? enemyBase) }}
                />
              </>
            ) : (
              <>
            {/* 相手ポケモン情報 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{enemyName}</div>
                <button
                  onClick={() => setDetailMode(true)}
                  style={{
                    background: 'rgba(124,106,247,.15)', border: '1px solid rgba(124,106,247,.4)',
                    color: 'var(--accent)', borderRadius: 6, padding: '4px 10px',
                    fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  詳細を見る →
                </button>
              </div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                {enemy.types.map(t => <TypeBadge key={t} type={t} />)}
                {enemy.abilities?.[0] && (
                  <span style={{ fontSize: 10, color: 'var(--text3)', padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4, border: '1px solid var(--border)' }}>
                    {enemy.abilities[0]}
                  </span>
                )}
              </div>
              <StatBars stats={enemy.stats} />
              <MegaToggle
                currentName={enemyName}
                pokemonDb={pokemonDb}
                onChange={name => { setEnemyName(name); setEnemyBase(getBaseForm(name, pokemonDb) ?? enemyBase) }}
              />
            </div>

            <div className="two-col">
              <div>
                <div className="card">
                  <div className="card-title">攻撃 ranking</div>
                  <div className="rank-list">
                    {sorted.atk.map((p, i) => (
                      <div key={p.name} className="rank-item">
                        <span className={`rank-num ${rankColor(i)}`}>{i + 1}</span>
                        <span className="rank-name">{p.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar" style={{ width: `${p.scoreAtk / maxAtk * 100}%` }} />
                          <span className="rank-score">{p.scoreAtk.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">防御 ranking（低いほど良）</div>
                  <div className="rank-list">
                    {sorted.def.map((p, i) => (
                      <div key={p.name} className="rank-item">
                        <span className={`rank-num ${rankColor(i)}`}>{i + 1}</span>
                        <span className="rank-name">{p.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar red" style={{ width: `${p.scoreDef / maxDef * 100}%` }} />
                          <span className="rank-score">{p.scoreDef.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="card">
                  <div className="card-title">総合 ranking</div>
                  <div className="rank-list">
                    {sorted.overall.map((p, i) => (
                      <div key={p.name} className="rank-item">
                        <span className={`rank-num ${rankColor(i)}`}>{i + 1}</span>
                        <span className="rank-name">{p.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar" style={{ width: `${p.overall / maxOvr * 100}%` }} />
                          <span className="rank-score">{p.overall.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">ダメージ計算 → {enemyName}</div>
                  {dmgResults.length === 0
                    ? <div className="empty-state">技データなし</div>
                    : dmgResults.map(r => (
                      <div key={r.pname} className="dmg-result">
                        <div className="dmg-title">{r.pname}</div>
                        {r.moves.map(m => (
                          <div key={m.name} className="dmg-row">
                            <span className="dmg-movename"><TypeBadge type={m.type} />{m.name}</span>
                            <span>
                              <span className="dmg-range">{m.minPct}〜{m.maxPct}%</span>
                              {m.koChance && <span className="dmg-ko"> {m.koChance}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text3)', fontSize: 13 }}>
            左のリストからポケモンを選択してください
          </div>
        )}
      </div>
    </div>
  )
}