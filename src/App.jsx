import { useState, useEffect } from 'react'
import { loadAllData } from './data/loader.js'
import TypeBadge from './components/TypeBadge.jsx'
import AnalysisTab     from './tabs/AnalysisTab.jsx'
import PartyMatchupTab from './tabs/PartyMatchupTab.jsx'
import SpeedTab        from './tabs/SpeedTab.jsx'
import PartyEditorTab  from './tabs/PartyEditorTab.jsx'
import TeamsTab        from './tabs/TeamsTab.jsx'

const TAB_LABELS = ['1vs1 分析', 'パーティ対戦', '素早さ比較', 'チーム編集', 'チーム一覧']

// LocalStorage キー
const LS_TEAMS      = 'poke_teams'
const LS_ACTIVE_IDX = 'poke_active_team'

function makeTeam(name, members = []) {
  return { id: Date.now() + Math.random(), name, members }
}

export default function App() {
  const [db,    setDb]    = useState(null)
  const [error, setError] = useState(null)
  const [tab,   setTab]   = useState(0)

  // チームリストとアクティブインデックス
  const [teams,      setTeams]      = useState(null)
  const [activeIdx,  setActiveIdx]  = useState(0)

  // ─── 初回データロード ──────────────────────────────
  useEffect(() => {
    loadAllData()
      .then(data => {
        setDb(data)
        try {
          const savedTeams = localStorage.getItem(LS_TEAMS)
          const savedIdx   = localStorage.getItem(LS_ACTIVE_IDX)
          if (savedTeams) {
            const parsed = JSON.parse(savedTeams)
            setTeams(parsed)
            setActiveIdx(Math.min(Number(savedIdx) || 0, parsed.length - 1))
          } else {
            setTeams([makeTeam('チーム1', data.defaultParty)])
            setActiveIdx(0)
          }
        } catch {
          setTeams([makeTeam('チーム1', data.defaultParty)])
          setActiveIdx(0)
        }
      })
      .catch(err => setError(err.message))
  }, [])

  // チーム変更時に保存
  useEffect(() => {
    if (teams) {
      try {
        localStorage.setItem(LS_TEAMS, JSON.stringify(teams))
        localStorage.setItem(LS_ACTIVE_IDX, String(activeIdx))
      } catch {}
    }
  }, [teams, activeIdx])

  // アクティブなパーティ
  const party    = teams?.[activeIdx]?.members ?? []
  const teamName = teams?.[activeIdx]?.name ?? ''

  function setParty(membersOrFn) {
    setTeams(prev => prev.map((t, i) => {
      if (i !== activeIdx) return t
      const next = typeof membersOrFn === 'function' ? membersOrFn(t.members) : membersOrFn
      return { ...t, members: next }
    }))
  }

  // ─── ローディング / エラー ──────────────────────────
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ color:'var(--accent3)', fontSize:16 }}>データの読み込みに失敗しました</div>
      <div style={{ color:'var(--text3)', fontSize:12 }}>{error}</div>
    </div>
  )

  if (!db || !teams) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ color:'var(--accent)', fontSize:15 }}>データを読み込み中…</div>
    </div>
  )

  const panels = [
    <AnalysisTab     key="analysis" party={party} db={db} />,
    <PartyMatchupTab key="matchup"  party={party} db={db} />,
    <SpeedTab        key="speed"    party={party} db={db} />,
    <PartyEditorTab  key="editor"   party={party} setParty={setParty} db={db}
                     teamName={teamName}
                     onRenameTeam={name => setTeams(prev => prev.map((t,i) => i===activeIdx ? {...t,name} : t))}
    />,
    <TeamsTab        key="teams"    teams={teams} activeIdx={activeIdx}
                     setActiveIdx={setActiveIdx}
                     setTeams={setTeams}
                     makeTeam={makeTeam}
                     db={db}
    />,
  ]

  return (
    <div className="app">
      <div className="header">
        <h1>⚔ ポケモン対戦ツール</h1>
        <div className="tabs">
          {TAB_LABELS.map((label, i) => (
            <div key={i} className={`tab ${tab===i?'active':''}`} onClick={() => setTab(i)}>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="main">
        {/* ─── サイドバー ─── */}
        <div className="sidebar">
          {/* チーム切り替え */}
          <div style={{ marginBottom: 10 }}>
            <h2 style={{ marginBottom: 6 }}>チーム</h2>
            {teams.map((t, i) => (
              <div
                key={t.id}
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: '5px 8px', borderRadius: 6, marginBottom: 3, cursor: 'pointer',
                  background: i === activeIdx ? 'rgba(124,106,247,.18)' : 'var(--bg3)',
                  border: `1px solid ${i === activeIdx ? 'rgba(124,106,247,.5)' : 'var(--border)'}`,
                  fontSize: 11, fontWeight: i === activeIdx ? 700 : 400,
                  color: i === activeIdx ? 'var(--accent)' : 'var(--text2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, marginLeft: 4 }}>{t.members.length}/6</span>
              </div>
            ))}
          </div>

          {/* アクティブチームのメンバー */}
          <h2>メンバー</h2>
          {party.map((p, i) => (
            <div key={p.name + i} className="party-slot">
              <div className="pname">{p.name}</div>
              <div className="ptypes">
                {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
              </div>
              <div className="pspeed">S: {p.stats?.speed}</div>
            </div>
          ))}
          {party.length === 0 && (
            <div style={{ color:'var(--text3)', fontSize:11 }}>チーム編集から追加</div>
          )}
        </div>

        {/* ─── メインコンテンツ ─── */}
        <div className="content">{panels[tab]}</div>
      </div>
    </div>
  )
}