import { useState, useMemo, useRef, useEffect } from 'react'
import TypeBadge from './TypeBadge.jsx'

/**
 * 技検索コンポーネント
 * テキスト入力 → ドロップダウン候補 → 選択
 */
export default function MoveSearch({ movesDb, value, onSelect, placeholder = '技名を入力…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 外クリックで閉じる
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const results = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return Object.entries(movesDb)
      .filter(([name]) => name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [movesDb, query])

  // 現在選択中の技データ
  const currentMove = value ? movesDb[value] : null

  function handleSelect(name) {
    onSelect(name)
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onSelect('')
    setQuery('')
  }

  const CATEGORY_LABEL = { physical: '物理', special: '特殊', status: '変化' }
  const CATEGORY_COLOR = { physical: '#f7a06a', special: '#7c6af7', status: '#5edf82' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* 選択済み表示 or 検索入力 */}
      {value && currentMove ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '2px 6px', minHeight: 26,
        }}>
          <TypeBadge type={currentMove.type} />
          <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value}
          </span>
          {currentMove.power && (
            <span style={{ fontSize: 9, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
              威力{currentMove.power}
            </span>
          )}
          <span style={{ fontSize: 9, color: CATEGORY_COLOR[currentMove.category], whiteSpace: 'nowrap' }}>
            {CATEGORY_LABEL[currentMove.category] ?? currentMove.category}
          </span>
          <button
            onMouseDown={handleClear}
            style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1,
            }}
          >×</button>
        </div>
      ) : (
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 5, color: 'var(--text)', fontSize: 11, padding: '3px 8px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}

      {/* ドロップダウン */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 6, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.4)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map(([name, mv]) => (
            <div
              key={name}
              onMouseDown={() => handleSelect(name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 9px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <TypeBadge type={mv.type} />
              <span style={{ flex: 1, fontSize: 11 }}>{name}</span>
              {mv.power && (
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>威力{mv.power}</span>
              )}
              <span style={{ fontSize: 9, color: CATEGORY_COLOR[mv.category] }}>
                {CATEGORY_LABEL[mv.category] ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}