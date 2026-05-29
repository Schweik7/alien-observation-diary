import { useEffect, useRef, useState } from 'react'
import { socket, emit } from './net.js'
import Home from './screens/Home.jsx'
import Lobby from './screens/Lobby.jsx'
import GameBoard from './screens/GameBoard.jsx'
import GameOver from './screens/GameOver.jsx'

export default function App() {
  const [connected, setConnected] = useState(socket.connected)
  const [decks, setDecks] = useState([])
  const [state, setState] = useState(null) // 房间状态
  const [youId, setYouId] = useState(socket.id)
  const [inRoom, setInRoom] = useState(false)
  const [myPick, setMyPick] = useState(null)
  const cardKeyRef = useRef('')

  useEffect(() => {
    const onConnect = () => {
      setConnected(true)
      setYouId(socket.id)
    }
    const onDisconnect = () => setConnected(false)
    const onState = (s) => setState(s)
    const onDecks = (d) => setDecks(d)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('roomState', onState)
    socket.on('decks', onDecks)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('roomState', onState)
      socket.off('decks', onDecks)
    }
  }, [])

  // 卡牌/阶段变化时清空本地选择
  useEffect(() => {
    const key = `${state?.phase}|${state?.current?.id || ''}|${state?.round}`
    if (key !== cardKeyRef.current) {
      cardKeyRef.current = key
      if (state?.phase !== 'select') setMyPick(null)
      else if (state?.current && !state.players?.find((p) => p.id === youId)?.submitted) {
        setMyPick(null)
      }
    }
  }, [state, youId])

  function enterRoom(res) {
    if (res?.ok) {
      setYouId(res.youId)
      setInRoom(true)
    }
  }

  function submit(pick) {
    setMyPick(pick)
    emit('submitPick', pick)
  }

  function leave() {
    emit('leaveRoom')
    setInRoom(false)
    setState(null)
    setMyPick(null)
    // 清掉 URL 里的 room 参数
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (!inRoom || !state) {
    return <Home decks={decks} connected={connected} onEnter={enterRoom} />
  }

  const me = state.players.find((p) => p.id === youId)
  const isHost = state.hostId === youId

  return (
    <div className="screen">
      <TopBar state={state} connected={connected} onLeave={leave} />
      {state.phase === 'lobby' && (
        <Lobby state={state} decks={decks} isHost={isHost} youId={youId} />
      )}
      {(state.phase === 'select' || state.phase === 'reveal') && (
        <GameBoard
          state={state}
          youId={youId}
          isHost={isHost}
          myPick={myPick}
          onSubmit={submit}
          onSkip={() => emit('skipCard')}
          onNext={() => emit('nextRound')}
        />
      )}
      {state.phase === 'gameover' && (
        <GameOver state={state} isHost={isHost} youId={youId} onRestart={() => emit('restart')} />
      )}
    </div>
  )
}

function TopBar({ state, connected, onLeave }) {
  const link = `${window.location.origin}${window.location.pathname}?room=${state.roomId}`
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__title">地球人观察日记</span>
        <span className="topbar__room" title="房间号">
          房间 <b>{state.roomId}</b>
        </span>
        <button className="btn btn--ghost btn--sm" onClick={copy}>
          {copied ? '已复制邀请链接 ✓' : '复制邀请链接'}
        </button>
      </div>
      <div className="topbar__right">
        <span className={`dot ${connected ? 'dot--on' : 'dot--off'}`} />
        <span className="topbar__status">{connected ? '已连接' : '连接中…'}</span>
        <button className="btn btn--ghost btn--sm" onClick={onLeave}>
          离开
        </button>
      </div>
    </header>
  )
}
