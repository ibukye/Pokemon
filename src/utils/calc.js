/**
 * タイプ相性・ダメージ計算ロジック
 * main.py の calcEffectiveness / calcCompatibility / calcDamage に対応
 */

/**
 * ある技タイプが防御側に与える相性倍率を返す
 * @param {string} moveType
 * @param {string[]} defenderTypes
 * @param {object} typeChart
 * @param {object|null} abilityData - 防御側の特性データ
 * @returns {number}
 */
export function calcEffectiveness(moveType, defenderTypes, typeChart, abilityData = null) {
  let multiplier = 1.0

  // 特性による倍率補正
  if (abilityData?.type_multiplier) {
    multiplier *= abilityData.type_multiplier[moveType] ?? 1.0
  }

  // タイプ相性
  for (const defType of defenderTypes) {
    multiplier *= typeChart[moveType]?.[defType] ?? 1.0
  }

  return multiplier
}

/**
 * 攻撃側の技タイプ群が防御側に与える相性スコアの合計
 * @param {string[]} moveTypes
 * @param {{ types: string[] }} defender
 * @param {object} typeChart
 * @param {object|null} abilityData
 * @returns {number}
 */
export function calcCompatibility(moveTypes, defender, typeChart, abilityData = null) {
  return moveTypes.reduce(
    (sum, mt) => sum + calcEffectiveness(mt, defender.types ?? [], typeChart, abilityData),
    0
  )
}

/**
 * ダメージ計算（レベル50・補正なし簡易版）
 * @param {{ types: string[], stats: object }} attacker
 * @param {{ type: string, power: number|string, category: string }} moveData
 * @param {{ types: string[], stats: object }} defender
 * @param {object} typeChart
 * @returns {{ min, max, minPct, maxPct, koChance }|null}
 */
export function calcDamage(attacker, moveData, defender, typeChart) {
  if (!moveData?.power || moveData.category === 'status') return null

  const power = Number(moveData.power)
  const isPhysical = moveData.category === 'physical'
  const atk = isPhysical ? attacker.stats.attack : attacker.stats.sp_attack
  const def = isPhysical ? defender.stats.defense : defender.stats.sp_defense

  const typeMult = calcEffectiveness(moveData.type, defender.types ?? [], typeChart, null)
  const stab = (attacker.types ?? []).includes(moveData.type) ? 1.5 : 1.0

  // 公式ダメージ計算式（Lv50）
  const base = Math.floor(
    (Math.floor((Math.floor(2 * 50 / 5 + 2) * power * atk / def) / 50) + 2) * stab * typeMult
  )

  const minDmg = Math.floor(base * 0.85)
  const maxDmg = base
  const hp = defender.stats.hp ?? 1

  return {
    min: minDmg,
    max: maxDmg,
    minPct: (minDmg / hp * 100).toFixed(1),
    maxPct: (maxDmg / hp * 100).toFixed(1),
    koChance:
      maxDmg >= hp ? '確定1発' :
      minDmg >= hp ? 'ほぼ1発' :
      maxDmg * 2 >= hp ? '確定2発' : null,
  }
}
