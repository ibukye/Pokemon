import { useState, useMemo } from 'react'
import TypeBadge from './TypeBadge.jsx'
import StatBars from './StatBars.jsx'
import { TYPE_JP, ALL_TYPES, isMega, matchPokemonName } from '../utils/pokemon.js'

/**
 * フィルター付きポケモン一覧
 * viewMode: 'card' | 'list'
 */
export default function PokemonBrowser({
  pokemonDb,
  onSelect,
  selected = [],       // 選択済み名の配列 or string
  maxCount,
  currentCount = 0,
  defaultView = 'card',
}) {
  const [query,      setQuery]      = useState('')
  const [typeFilter, setTypeFilter] = useState([])
  const [megaFilter, setMegaFilter] = useState('all') // 'all'|'base'|'mega'
  const [viewMode,   setViewMode]   = useState(defaultView)

  const allPoke = useMemo(
    () => Object.entries(pokemonDb).map(([name, d]) => ({ name, ...d })),
    [pokemonDb]
  )

  const filtered = useMemo(() => {
    return allPoke.filter(p => {
      if (query && !matchPokemonName(p.name, query)) return false
      if (typeFilter.length > 0 && !typeFilter.every(t => p.types.includes(t))) return false
      if (megaFilter === 'base' && isMega(p.name)) return false
      if (megaFilter === 'mega' && !isMega(p.name)) return false
      return true
    })
  }, [allPoke, query, typeFilter, megaFilter])

  function toggleType(t) {
    setTypeFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])

  function handleClick(p) {
    const isSelected = selectedSet.has(p.name)
    const disabled = !isSelected && maxCount != null && currentCount >= maxCount
    if (!disabled) onSelect(p.name, p)
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {/* ── 上段コントロール ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          className="search-input"
          style={{ flex: 1, minWidth: 140, marginBottom: 0 }}
          value={query}
          placeholder="名前で絞り込み…"
          onChange={e => setQuery(e.target.value)}
        />

        {/* メガフィルター */}
        {[['all','すべて'],['base','通常'],['mega','メガ']].map(([v, label]) => (
          <button key={v} className={`filter-btn ${megaFilter === v ? 'on' : ''}`}
            onClick={() => setMegaFilter(v)}>{label}</button>
        ))}

        {/* リセット */}
        <button className="filter-btn" onClick={() => { setTypeFilter([]); setQuery('') }}>
          リセット
        </button>

        {/* Card / List 切り替え */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
          <button
            className={`filter-btn ${viewMode === 'card' ? 'on' : ''}`}
            style={{ padding: '3px 8px' }}
            onClick={() => setViewMode('card')}
            title="カード表示"
          >⊞</button>
          <button
            className={`filter-btn ${viewMode === 'list' ? 'on' : ''}`}
            style={{ padding: '3px 8px' }}
            onClick={() => setViewMode('list')}
            title="リスト表示"
          >≡</button>
        </div>
      </div>

      {/* ── タイプフィルター ── */}
      <div className="filter-row" style={{ marginBottom: 8 }}>
        <span className="filter-label">タイプ:</span>
        {ALL_TYPES.map(t => (
          <button key={t} className={`filter-btn ${typeFilter.includes(t) ? 'on' : ''}`}
            onClick={() => toggleType(t)}>
            {TYPE_JP[t]}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8 }}>
        {filtered.length} 匹表示中
        {maxCount && <span style={{ marginLeft: 8 }}>選択: {currentCount}/{maxCount}</span>}
      </div>

      {/* ── カード表示 ── */}
      {viewMode === 'card' && (
        <div className="poke-grid">
          {filtered.map(p => {
            const isSelected = selectedSet.has(p.name)
            const disabled   = !isSelected && maxCount != null && currentCount >= maxCount
            return (
              <div
                key={p.name}
                className={`poke-card ${isSelected ? 'selected' : ''}`}
                style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                onClick={() => handleClick(p)}
              >
                <div className="pc-num">No.{p.number}</div>
                <div className="pc-name">{p.name}</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {p.types.map(t => <TypeBadge key={t} type={t} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── リスト表示 ── */}
      {viewMode === 'list' && (
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1 }}>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'left', width: 36 }}>No.</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'left' }}>名前</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'left' }}>タイプ</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>HP</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>攻</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>防</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>特攻</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>特防</th>
                <th style={{ padding: '5px 8px', color: 'var(--text3)', fontWeight: 600, textAlign: 'right', width: 32 }}>速</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSelected = selectedSet.has(p.name)
                const disabled   = !isSelected && maxCount != null && currentCount >= maxCount
                return (
                  <tr
                    key={p.name}
                    onClick={() => handleClick(p)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                      background: isSelected ? 'rgba(94,223,200,0.07)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = isSelected ? 'rgba(94,223,200,0.12)' : 'rgba(124,106,247,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(94,223,200,0.07)' : 'transparent' }}
                  >
                    <td style={{ padding: '5px 8px', color: 'var(--text3)' }}>{p.number}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {p.name}
                      {isSelected && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent2)' }}>✓</span>}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {p.types.map(t => <TypeBadge key={t} type={t} />)}
                      </div>
                    </td>
                    {['hp','attack','defense','sp_attack','sp_defense','speed'].map(s => (
                      <td key={s} style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>
                        {p.stats[s]}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}