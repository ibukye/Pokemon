import { getMegaForms, getBaseForm, isMega } from '../utils/pokemon.js'

/**
 * 通常形態 ↔ メガシンカ形態の切り替えボタン群
 *
 * @param {string}   currentName  現在表示中のポケモン名（通常 or メガ）
 * @param {object}   pokemonDb
 * @param {function} onChange     選択名が変わったときに呼ばれるコールバック (name) => void
 */
export default function MegaToggle({ currentName, pokemonDb, onChange }) {
  const baseName = getBaseForm(currentName, pokemonDb) ?? currentName
  const megas    = getMegaForms(baseName, pokemonDb)

  // メガシンカを持たないポケモンは何も表示しない
  if (megas.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      {/* 通常形態ボタン */}
      <button
        className={`mega-toggle ${!isMega(currentName) ? 'on' : ''}`}
        onClick={() => onChange(baseName)}
      >
        {baseName}
      </button>

      {/* メガ形態ボタン（存在するもののみ） */}
      {megas.map(megaName =>
        pokemonDb[megaName] ? (
          <button
            key={megaName}
            className={`mega-toggle ${currentName === megaName ? 'on' : ''}`}
            onClick={() => onChange(megaName)}
          >
            ⚡ {megaName}
          </button>
        ) : null
      )}
    </div>
  )
}
