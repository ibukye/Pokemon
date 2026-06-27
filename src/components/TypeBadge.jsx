import { TYPE_JP } from '../utils/pokemon.js'

export default function TypeBadge({ type }) {
  return (
    <span className={`type-badge t-${type.toLowerCase()}`}>
      {TYPE_JP[type] ?? type}
    </span>
  )
}
