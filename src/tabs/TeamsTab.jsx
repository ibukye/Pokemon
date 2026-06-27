
import { useState } from 'react'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'

export default function TeamsTab({ teams, activeIdx, setActiveIdx, setTeams, makeTeam, db }) {
  const { movesDb } = db
  const [newName, setNewName] = useState('')
  const [expandedTeam, setExpandedTeam] = useState(null) // チームid or null

  function addTeam() {
    const name = newName.trim() || `チーム${teams.length + 1}`
    setTeams(prev => [...prev, makeTeam(name)])
    setActiveIdx(teams.length)
    setNewName('')
  }

  function removeTeam(idx) {
    if (teams.length === 1) return // 最後の1チームは削除不可
    if (!window.confirm(`「${teams[idx].name}」を削除しますか？`)) return
    setTeams(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => Math.min(prev, teams.length - 2))
  }

  function renameTeam(idx, name) {
    setTeams(prev => prev.map((t, i) => i === idx ? { ...t, name } : t))
  }

  function duplicateTeam(idx) {
    const src  = teams[idx]
    const copy = makeTeam(`${src.name} (コピー)`, JSON.parse(JSON.stringify(src.members)))
    setTeams(prev => [...prev, copy])
    setActiveIdx(teams.length)
  }

  return (
    <div>
      <div className="section-title">チーム一覧</div>

      {/* ── 新規チーム作成 ── */}
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          className="search-input"
          style={{ flex: 1, marginBottom: 0 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTeam()}
          placeholder="新しいチーム名…"
        />
        <button
          onClick={addTeam}
          style={{
            background: 'rgba(124,106,247,.2)', border: '1px solid var(--accent)',
            color: 'var(--accent)', borderRadius: 7, padding: '8px 16px',
            cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
          }}
        >
          ＋ 追加
        </button>
      </div>

      {/* ── チームカード一覧 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {teams.map((team, idx) => {
          const isActive   = idx === activeIdx
          const isExpanded = expandedTeam === team.id

          return (
            <div
              key={team.id}
              style={{
                background: 'var(--card)', border: `1px solid ${isActive ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
                boxShadow: isActive ? '0 0 0 1px rgba(124,106,247,.2)' : 'none',
              }}
            >
              {/* ── チームヘッダー ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                {/* チーム名（インライン編集） */}
                <input
                  value={team.name}
                  onChange={e => renameTeam(idx, e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: isActive ? 'var(--accent)' : 'var(--text)',
                    fontSize: 14, fontWeight: 700, cursor: 'text',
                  }}
                />

                {/* メンバー数 */}
                <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {team.members.length}/6匹
                </span>

                {/* アクティブバッジ */}
                {isActive && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(124,106,247,.2)', color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    使用中
                  </span>
                )}

                {/* 操作ボタン */}
                {!isActive && (
                  <button
                    onClick={() => setActiveIdx(idx)}
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    選択
                  </button>
                )}
                <button
                  onClick={() => duplicateTeam(idx)}
                  style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  複製
                </button>
                {teams.length > 1 && (
                  <button
                    onClick={() => removeTeam(idx)}
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: '1px solid rgba(247,106,106,.3)', background: 'transparent', color: 'var(--accent3)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    削除
                  </button>
                )}
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  style={{ fontSize: 13, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', lineHeight: 1 }}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {/* ── メンバーサマリー（常時表示、コンパクト） ── */}
              <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {team.members.length === 0
                  ? <span style={{ fontSize: 11, color: 'var(--text3)' }}>メンバーなし</span>
                  : team.members.map((p, pi) => (
                    <div key={p.name + pi} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ display: 'flex', gap: 2 }}>{(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}</span>
                    </div>
                  ))
                }
              </div>

              {/* ── 展開：詳細カード ── */}
              {isExpanded && team.members.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {team.members.map((p, pi) => (
                      <div key={p.name + pi} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
                          {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
                        </div>
                        <StatBars stats={p.stats} />
                        {p.item && (
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>持ち物: {p.item}</div>
                        )}
                        {p.moves?.filter(Boolean).length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {p.moves.filter(Boolean).map(m => {
                              const mv = movesDb[m]
                              return (
                                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text2)', padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
                                  {mv && <TypeBadge type={mv.type} />}
                                  <span>{m}</span>
                                  {mv?.power && <span style={{ color: 'var(--text3)' }}>威力{mv.power}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}