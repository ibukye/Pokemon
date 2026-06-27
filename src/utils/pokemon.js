/**
 * ポケモン固有のユーティリティ
 * メガシンカ判定・フォーム取得など
 */

export const TYPE_JP = {
  Normal: 'ノーマル', Fire: 'ほのお', Water: 'みず', Electric: 'でんき',
  Grass: 'くさ', Ice: 'こおり', Fighting: 'かくとう', Poison: 'どく',
  Ground: 'じめん', Flying: 'ひこう', Psychic: 'エスパー', Bug: 'むし',
  Rock: 'いわ', Ghost: 'ゴースト', Dragon: 'ドラゴン', Dark: 'あく',
  Steel: 'はがね', Fairy: 'フェアリー',
}

export const ALL_TYPES = Object.keys(TYPE_JP)

/** メガシンカ形態かどうか */
export function isMega(name) {
  return name.startsWith('メガ')
}

/**
 * ベース形態からメガシンカ形態名の配列を返す
 * @param {string} baseName - ベースのポケモン名
 * @param {object} pokemonDb
 * @returns {string[]}
 */
export function getMegaForms(baseName, pokemonDb) {
  const data = pokemonDb[baseName]
  if (!data?.mega) return []
  return Array.isArray(data.mega) ? data.mega : [data.mega]
}

/**
 * メガシンカ形態からベース形態名を返す
 * @param {string} name
 * @param {object} pokemonDb
 * @returns {string|null}
 */
export function getBaseForm(name, pokemonDb) {
  return pokemonDb[name]?.base_form ?? null
}

/**
 * ポケモンのあらゆるフォームからベース名を解決する
 * @param {string} name
 * @param {object} pokemonDb
 * @returns {string}
 */
export function resolveBaseName(name, pokemonDb) {
  return getBaseForm(name, pokemonDb) ?? name
}

/** ステータスバーの色（値と種別に応じてグリーン→レッド） */
export function getStatColor(value, statKey) {
  const maxValues = {
    hp: 255, attack: 190, defense: 230,
    sp_attack: 194, sp_defense: 230, speed: 200,
  }
  const pct = value / (maxValues[statKey] ?? 200)
  if (pct > 0.7) return '#5edf82'
  if (pct > 0.5) return '#f7d45e'
  if (pct > 0.3) return '#f7a06a'
  return '#f76a6a'
}

/**
 * ひらがなをカタカナに変換
 * 例: "がぶりあす" → "ガブリアス"
 */
export function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

/**
 * ポケモン名がクエリにマッチするか（ひらがな・カタカナ両対応）
 * @param {string} name  - ポケモン名（カタカナ）
 * @param {string} query - 入力文字列（ひらがな・カタカナ混在可）
 */
export function matchPokemonName(name, query) {
  if (!query) return true
  const normalized = hiraToKata(query)
  return name.includes(normalized) || name.includes(query)
}