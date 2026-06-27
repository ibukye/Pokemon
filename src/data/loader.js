/**
 * JSONデータのロード・キャッシュ管理
 * すべてのデータは初回アクセス時にfetchしてメモリにキャッシュする
 */

const cache = {}

async function loadJson(path) {
  if (cache[path]) return cache[path]
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  const data = await res.json()
  cache[path] = data
  return data
}

export async function loadAllData() {
  const [pokemonDb, movesDb, abilitiesDb, typeChart, defaultParty] = await Promise.all([
    loadJson('/data/pokemon.json'),
    loadJson('/data/moves.json'),
    loadJson('/data/abilities.json'),
    loadJson('/data/type_compatibility.json'),
    loadJson('/data/my_party.json'),
  ])
  return { pokemonDb, movesDb, abilitiesDb, typeChart, defaultParty }
}
