import { getStatColor } from '../utils/pokemon.js'

const STAT_LABELS = [
  ['hp',         'HP'],
  ['attack',     'こうげき'],
  ['defense',    'ぼうぎょ'],
  ['sp_attack',  'とくこう'],
  ['sp_defense', 'とくぼう'],
  ['speed',      'すばやさ'],
]

export default function StatBars({ stats }) {
  return (
    <div className="stats-grid">
      {STAT_LABELS.map(([key, label]) => (
        <div key={key} className="stat-row">
          <span className="stat-label">{label}</span>
          <div className="stat-bar-bg">
            <div
              className="stat-bar-fill"
              style={{
                width: `${Math.min(100, stats[key] / 255 * 100)}%`,
                background: getStatColor(stats[key], key),
              }}
            />
          </div>
          <span className="stat-val">{stats[key]}</span>
        </div>
      ))}
    </div>
  )
}
