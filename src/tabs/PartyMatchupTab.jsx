import { useState, useMemo } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import PokemonBrowser from '../components/PokemonBrowser.jsx'
import QuickSearch from '../components/QuickSearch.jsx'
import { calcCompatibility } from '../utils/calc.js'
import { getMegaForms, getBaseForm } from '../utils/pokemon.js'

export default function PartyMatchupTab({ party, db }) {
  const { pokemonDb, movesDb, abilitiesDb, typeChart } = db

  const [enemyParty, setEnemyParty] = useState([])
  const [query,      setQuery]      = useState('')

  function addEnemy(name, data) {
    if (enemyParty.length >= 6 || enemyParty.find(p => p.name === name)) return
    setEnemyParty(prev => [...prev, { ...data, name }])
  }
  function removeEnemy(name) {
    setEnemyParty(prev => prev.filter(p => p.name !== name))
  }
  function toggleMegaEnemy(idx, megaName) {
    setEnemyParty(prev => prev.map((p, i) => {
      if (i !== idx) return p
      const base    = getBaseForm(p.name, pokemonDb) ?? p.name
      const newName = p.name === megaName ? base : megaName
      return { ...pokemonDb[newName], name: newName }
    }))
  }

  const matrix = useMemo(() => {
    return party.map(my => enemyParty.map(en => {
      const myMT = (my.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const enAb = abilitiesDb[(en.abilities ?? [])[0]] ?? {}
      const atk  = calcCompatibility(myMT, en, typeChart, enAb)

      // 防御評価: 相手の技タイプがあればそれを使う、なければ相手のタイプ一覧で代替
      const enMoveMTs = (en.moves ?? []).map(m => movesDb[m]?.type).filter(Boolean)
      const defMTs    = enMoveMTs.length > 0 ? enMoveMTs : (en.types ?? [])
      const myAb = abilitiesDb[(my.abilities ?? [])[0]] ?? {}
      const def  = calcCompatibility(defMTs, my, typeChart, myAb)
      return { atk, def, score: atk - def }
    }))
  }, [party, enemyParty, movesDb, abilitiesDb, typeChart])

  function cellBg(s) {
    if (s >  3) return `rgba(94,223,130,${Math.min(0.75, s / 8)})`
    if (s >  1) return `rgba(94,223,130,${s / 8})`
    if (s > -1) return 'transparent'
    if (s > -3) return `rgba(247,106,106,${Math.abs(s) / 8})`
    return `rgba(247,106,106,${Math.min(0.75, Math.abs(s) / 8)})`
  }
  function cellColor(s) {
    return s > 3 ? '#5edf82' : s > 1 ? '#a8f0c0' : s < -3 ? '#f76a6a' : s < -1 ? '#f0a8a8' : 'var(--text2)'
  }

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 0 }}>

      {/* ── 左ペイン：ポケモン選択 ── */}
      <div style={{ flex: '0 0 52%', minWidth: 0 }}>
        <div className="section-title">相手パーティを選択 ({enemyParty.length}/6)</div>

        <QuickSearch
          pokemonDb={pokemonDb}
          value={query}
          onChange={setQuery}
          onSelect={addEnemy}
          placeholder="名前で素早く検索…"
          exclude={enemyParty.map(p => p.name)}
        />

        <PokemonBrowser
          pokemonDb={pokemonDb}
          onSelect={addEnemy}
          selected={enemyParty.map(p => p.name)}
          maxCount={6}
          currentCount={enemyParty.length}
          defaultView="list"
        />
      </div>

      {/* ── 右ペイン：選択済み＋マトリクス ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>

        {/* 選択中の相手パーティチップ */}
        {enemyParty.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {enemyParty.map((p, i) => {
              const base  = getBaseForm(p.name, pokemonDb) ?? p.name
              const megas = getMegaForms(base, pokemonDb)
              return (
                <div key={p.name + i} style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</span>
                    <span onClick={() => removeEnemy(p.name)} style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: 14, lineHeight: 1 }}>×</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: megas.length ? 4 : 0 }}>
                    {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
                  </div>
                  {megas.map(m => pokemonDb[m] && (
                    <button key={m} className={`mega-toggle ${p.name === m ? 'on' : ''}`}
                      style={{ fontSize: 9, padding: '1px 6px' }}
                      onClick={() => toggleMegaEnemy(i, m)}>
                      ⚡{m.replace('メガ', '')}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {enemyParty.length > 0 ? (
          <>
            <div className="card">
              <div className="card-title">相性マトリクス（スコア = 攻撃評価 − 被ダメ評価）</div>
              <div className="heatmap-wrap">
                <table className="heatmap">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>自分 ↓ / 相手 →</th>
                      {enemyParty.map(p => <th key={p.name}>{p.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {party.map((my, i) => (
                      <tr key={my.name}>
                        <th style={{ textAlign: 'left' }}>{my.name}</th>
                        {matrix[i].map((cell, j) => (
                          <td key={j} style={{ background: cellBg(cell.score), color: cellColor(cell.score) }}>
                            {cell.score > 0 ? '+' : ''}{cell.score.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">自パーティ 有利度</div>
                {party.map((my, i) => {
                  const avg = matrix[i].reduce((s, c) => s + c.score, 0) / (matrix[i].length || 1)
                  const adv = matrix[i].filter(c => c.score > 1).length
                  return (
                    <div key={my.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 76, fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{my.name}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, (avg + 4) / 8 * 100))}%`, height: '100%', background: avg > 0 ? 'var(--accent2)' : 'var(--accent3)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>有利 {adv}/{enemyParty.length}</span>
                    </div>
                  )
                })}
              </div>
              <div className="card">
                <div className="card-title">相手 対策難易度</div>
                {enemyParty.map((en, j) => {
                  const avg = matrix.reduce((s, row) => s + row[j].score, 0) / (party.length || 1)
                  const adv = matrix.filter(row => row[j].score > 1).length
                  return (
                    <div key={en.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 76, fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{en.name}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, (-avg + 4) / 8 * 100))}%`, height: '100%', background: avg < 0 ? 'var(--accent3)' : 'var(--accent2)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{adv}匹で対応可</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text3)', fontSize: 13 }}>
            左のリストからポケモンを最大6匹選択してください
          </div>
        )}
      </div>
    </div>
  )
}