import React, { useState, useMemo } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import QuickSearch from '../components/QuickSearch.jsx'
import PokemonBrowser from '../components/PokemonBrowser.jsx'

export default function SpeedTab({ party, db }) {
  const { pokemonDb } = db

  const [scarf,       setScarf]       = useState(false)
  const [tailwind,    setTailwind]    = useState(false)
  const [query,       setQuery]       = useState('')
  const [extras,      setExtras]      = useState([])   // 比較追加したポケモン
  const [showBrowser, setShowBrowser] = useState(false)

  function addExtra(name, data) {
    if (extras.find(p => p.name === name)) return
    setExtras(prev => [...prev, { ...data, name }])
    setShowBrowser(false)
  }
  function removeExtra(name) { setExtras(prev => prev.filter(p => p.name !== name)) }

  const allPoke = useMemo(() => {
    const scarfMult    = scarf    ? 1.5 : 1
    const tailwindMult = tailwind ? 2   : 1

    const myList = party.map(p => ({
      name: p.name,
      spd:  p.stats.speed,
      types: p.types,
      isMine: true,
      spdMod: Math.floor(p.stats.speed * scarfMult * tailwindMult),
    }))
    const extraList = extras.map(p => ({
      name: p.name,
      spd:  p.stats.speed,
      types: p.types,
      isMine: false,
      spdMod: p.stats.speed,
    }))
    return [...myList, ...extraList].sort((a, b) => b.spdMod - a.spdMod)
  }, [party, extras, scarf, tailwind])

  const maxSpd = Math.max(...allPoke.map(p => p.spdMod), 1)

  return (
    <div>
      <div className="section-title">素早さ比較</div>

      {/* 補正トグル */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className={`toggle-btn ${scarf    ? 'on' : ''}`} onClick={() => setScarf(v => !v)}>
          こだわりスカーフ ×1.5
        </button>
        <button className={`toggle-btn ${tailwind ? 'on' : ''}`} onClick={() => setTailwind(v => !v)}>
          おいかぜ ×2
        </button>
      </div>

      {/* 追加検索 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <QuickSearch
            pokemonDb={pokemonDb}
            value={query}
            onChange={setQuery}
            onSelect={addExtra}
            placeholder="比較したいポケモンを追加…"
            exclude={extras.map(p => p.name)}
          />
        </div>
        <button
          className={`toggle-btn ${showBrowser ? 'on' : ''}`}
          onClick={() => setShowBrowser(v => !v)}
        >
          🔍 ブラウザ
        </button>
      </div>

      {showBrowser && (
        <PokemonBrowser
          pokemonDb={pokemonDb}
          onSelect={addExtra}
          selected={extras.map(p => p.name)}
          maxCount={12}
          currentCount={extras.length}
        />
      )}

      {/* 追加ポケモンチップ */}
      {extras.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {extras.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</span>
              <span onClick={() => removeExtra(p.name)} style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: 13 }}>×</span>
            </div>
          ))}
        </div>
      )}

      {/* 素早さチャート */}
      <div className="card">
        <div className="card-title">
          素早さ順{scarf ? '（スカーフ補正後）' : ''}{tailwind ? '（追い風補正後）' : ''}
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 10, color: 'var(--text3)' }}>
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent2)', marginRight: 4 }} />
            自パーティ
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent3)', marginRight: 4 }} />
            追加ポケモン
          </span>
        </div>

        {allPoke.map((p, i) => {
          const prev   = allPoke[i - 1]
          const slower = prev && p.spdMod < prev.spdMod
          return (
            <React.Fragment key={p.name}>
              {slower && (
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '3px 0', marginBottom: 3, borderBottom: '1px dashed var(--border)' }}>
                  ── {p.spdMod} 以下 ──
                </div>
              )}
              <div className={`speed-item ${p.isMine ? 'my-poke' : 'enemy-poke'}`}>
                <span className="speed-name">{p.name}</span>
                <div className="speed-bar-wrap">
                  <div
                    className={`speed-bar ${p.isMine ? '' : 'enemy'}`}
                    style={{ width: `${p.spdMod / maxSpd * 82}%` }}
                  />
                </div>
                <span className="speed-val">{p.spdMod}</span>
                {!p.isMine && (
                  <span style={{ display: 'flex', gap: 3 }}>
                    {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
                  </span>
                )}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}