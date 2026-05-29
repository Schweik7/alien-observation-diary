import { useEffect, useState } from 'react'
import { emit } from '../net.js'
import { NICKNAMES, randomNickname } from '../nicknames.js'

export default function Home({ decks, connected, onEnter }) {
  const [nickname, setNickname] = useState(() => randomNickname())
  const [deckKey, setDeckKey] = useState('highgrade')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState('create') // create | join
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 从邀请链接 ?room=XXXX 预填
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room')
    if (r) {
      setJoinCode(r.toUpperCase())
      setMode('join')
    }
  }, [])

  function create() {
    if (!connected) return setError('正在连接服务器，请稍候…')
    setBusy(true)
    setError('')
    emit('createRoom', { nickname, deckKey }, (res) => {
      setBusy(false)
      if (res?.ok) {
        window.history.replaceState({}, '', `${window.location.pathname}?room=${res.roomId}`)
        onEnter(res)
      } else setError(res?.error || '创建失败')
    })
  }

  function join() {
    if (!connected) return setError('正在连接服务器，请稍候…')
    if (!joinCode.trim()) return setError('请输入房间号')
    setBusy(true)
    setError('')
    emit('joinRoom', { roomId: joinCode.trim().toUpperCase(), nickname }, (res) => {
      setBusy(false)
      if (res?.ok) {
        window.history.replaceState({}, '', `${window.location.pathname}?room=${res.roomId}`)
        onEnter(res)
      } else setError(res?.error || '加入失败')
    })
  }

  return (
    <div className="home">
      <div className="home__bg" aria-hidden />
      <div className="home__card">
        <div className="home__eyebrow">EARTHLING OBSERVATION · 在线观测站</div>
        <h1 className="home__title">地球人观察日记</h1>
        <p className="home__sub">选个代号，开一间观测室，叫上家人朋友一起猜猜彼此。</p>

        <section className="block">
          <div className="block__label">你的观察员代号</div>
          <div className="nick-row">
            <input
              className="input nick-input"
              value={nickname}
              maxLength={16}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入或挑一个代号"
            />
            <button className="btn btn--ghost" onClick={() => setNickname(randomNickname())}>
              换一个 🎲
            </button>
          </div>
          <div className="nick-grid">
            {NICKNAMES.slice(0, 24).map((n) => (
              <button
                key={n}
                className={`chip ${n === nickname ? 'chip--active' : ''}`}
                onClick={() => setNickname(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <div className="tabs">
          <button className={`tab ${mode === 'create' ? 'tab--active' : ''}`} onClick={() => setMode('create')}>
            创建房间
          </button>
          <button className={`tab ${mode === 'join' ? 'tab--active' : ''}`} onClick={() => setMode('join')}>
            加入房间
          </button>
        </div>

        {mode === 'create' ? (
          <section className="block">
            <div className="block__label">选择牌库</div>
            <div className="deck-pick">
              {(decks.length ? decks : [{ key: 'highgrade', label: '高年级版' }]).map((d) => (
                <button
                  key={d.key}
                  className={`deck-opt ${deckKey === d.key ? 'deck-opt--active' : ''}`}
                  onClick={() => setDeckKey(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button className="btn btn--primary btn--block" disabled={busy} onClick={create}>
              创建观测室 →
            </button>
          </section>
        ) : (
          <section className="block">
            <div className="block__label">输入房间号</div>
            <input
              className="input code-input"
              value={joinCode}
              maxLength={4}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="如 A7K9"
            />
            <button className="btn btn--primary btn--block" disabled={busy} onClick={join}>
              加入观测室 →
            </button>
          </section>
        )}

        {error && <div className="error-bar">{error}</div>}
        <div className="home__foot">
          {connected ? '● 服务器已连接' : '○ 正在连接服务器…'} · 支持 2–8 人
        </div>
      </div>
    </div>
  )
}
