import { useState } from 'react'
import { emit } from '../net.js'

export default function Lobby({ state, decks, isHost, youId }) {
  const [rounds, setRounds] = useState(state.totalRounds)
  const canStart = state.connectedCount >= 2
  const deckLabel = (decks.find((d) => d.key === state.deckKey) || {}).label || state.deckKey

  return (
    <div className="lobby">
      <div className="panel">
        <h2 className="panel__title">观测室 · 等待观察员就位</h2>
        <p className="panel__hint">
          把房间号 <b className="code">{state.roomId}</b> 或顶部的邀请链接发给家人/朋友，他们打开就能加入。
        </p>

        <div className="players">
          {state.players.map((p) => (
            <div key={p.id} className={`player ${p.connected ? '' : 'player--off'}`}>
              <span className="player__avatar">{p.nickname.slice(0, 1)}</span>
              <span className="player__name">
                {p.nickname}
                {p.id === youId && <em className="player__you">（你）</em>}
              </span>
              {p.isHost && <span className="player__tag">房主</span>}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - state.players.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="player player--empty">
              等待加入…
            </div>
          ))}
        </div>

        {isHost ? (
          <div className="host-controls">
            <div className="ctrl">
              <span className="ctrl__label">牌库</span>
              <div className="seg">
                {(decks.length ? decks : [{ key: state.deckKey, label: deckLabel }]).map((d) => (
                  <button
                    key={d.key}
                    className={`seg__btn ${state.deckKey === d.key ? 'seg__btn--active' : ''}`}
                    onClick={() => emit('setDeck', { deckKey: d.key })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ctrl">
              <span className="ctrl__label">回合数</span>
              <div className="seg">
                {state.roundOptions.map((r) => (
                  <button
                    key={r}
                    className={`seg__btn ${rounds === r ? 'seg__btn--active' : ''}`}
                    onClick={() => setRounds(r)}
                  >
                    {r} 轮
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn--primary btn--block"
              disabled={!canStart}
              onClick={() => emit('startGame', { deckKey: state.deckKey, totalRounds: rounds })}
            >
              {canStart ? '开始观测 →' : '至少需要 2 人'}
            </button>
          </div>
        ) : (
          <div className="waiting">
            <span className="spinner" /> 等待房主开始（牌库：{deckLabel}）…
          </div>
        )}
      </div>

      <div className="panel panel--rules">
        <h3>怎么玩（30 秒）</h3>
        <ul>
          <li>每轮有一个人当 <b>样本</b>，其余人当 <b>观察员</b>。</li>
          <li>样本秘密选出"我真实的反应"，观察员秘密猜样本会怎样。</li>
          <li>同时翻牌：猜中越多，全家的 <b>理解值</b> 越高。</li>
          <li>理解值达标 = 合作胜利；没人猜中太多次 = 任务失败。</li>
          <li>翻牌后请记住：<b>先好奇，别辩解</b>。这才是这个游戏真正的意义。</li>
        </ul>
      </div>
    </div>
  )
}
