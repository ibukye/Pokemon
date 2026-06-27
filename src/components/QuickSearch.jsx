import { useState, useMemo, useRef, useEffect } from 'react'
import TypeBadge from './TypeBadge.jsx'
import { isMega, matchPokemonName } from '../utils/pokemon.js'

export default function QuickSearch({
  pokemonDb,
  value,
  onChange,
  onSelect,
  placeholder = 'ポケモン名を入力…',
  exclude = [],
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const results = useMemo(() => {
    if (!value || value.length < 1) return []
    return Object.entries(pokemonDb)
      .filter(([name]) => matchPokemonName(name, value) && !exclude.includes(name))
      .slice(0, 12)
  }, [pokemonDb, value, exclude])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="search-wrap" ref={ref}>
      <input
        className="search-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(([name, data]) => (
            <div
              key={name}
              className="search-item"
              onMouseDown={() => { onSelect(name, data); setOpen(false); onChange('') }}
            >
              <span className="si-num">No.{data.number}</span>
              <span className="si-name">{name}</span>
              <span style={{ display: 'flex', gap: 3 }}>
                {data.types.map(t => <TypeBadge key={t} type={t} />)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}