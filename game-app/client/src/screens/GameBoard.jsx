import { useEffect, useState } from 'react'

const EXP_LABEL = { 绿: '低暴露', 黄: '真实小事', 红: '掏心窝 · 可跳过' }

export default function GameBoard({ state, youId, isHost, myPick, onSubmit, onSkip, onNext }) {
  const [sel, setSel] = useState(null)
  const cur = state.current
  const me = state.players.find((p) => p.id === youId)
  const isSample = state.sampleId === youId
  const sample = state.players.find((p) => p.id === state.sampleId)
  const submitted = !!me?.submitted
  const reveal = state.reveal

  // 换卡/换阶段时重置本地选择
  useEffect(() => {
    setSel(null)
  }, [cur?.id, state.phase, state.round])

  if (!cur) return null

  const isA = cur.kind === 'A'
  const options = isA
    ? state.colors.map((c) => ({ id: c.key, title: `${c.emoji} ${c.name}`, sub: c.desc }))
    : cur.scenes.map((s) => ({ id: s.id, title: s.name, sub: s.description, exposure: s.exposure }))

  function labelOf(id) {
    const o = options.find((x) => x.id === id)
    return o ? o.title : id
  }

  return (
    <div className="board">
      <ScoreStrip state={state} />

      {/* 卡牌区 */}
      <div className={`stage exp-${cur.exposure}`}>
        <div className="stage__tag">
          <span className={`exp-pill exp-pill--${cur.exposure}`}>
            {cur.exposure} · {EXP_LABEL[cur.exposure] || ''}
          </span>
          <span className="stage__sub">{cur.subtype}</span>
        </div>

        {isA ? (
          <>
            <h2 className="stage__name">{cur.name}</h2>
            <p className="stage__obs">{cur.description}</p>
            <p className="stage__q">{cur.question}</p>
          </>
        ) : (
          <>
            <div className="stage__reaction">本轮既定反应</div>
            <h2 className="stage__name">{cur.reactionName}</h2>
            <p className="stage__obs">{cur.reactionDesc}</p>
          </>
        )}
      </div>

      {/* 角色提示 */}
      <div className={`role ${isSample ? 'role--sample' : ''}`}>
        {isSample ? (
          <>
            🎯 本轮你是 <b>样本</b>：{isA ? '选出你真实的反应' : '选出"真的最会让你这样"的那一张'}
          </>
        ) : (
          <>
            🔭 你在观察 <b>{sample?.nickname}</b>：猜猜 TA {isA ? '会是哪种反应' : '选了哪一张'}
          </>
        )}
      </div>

      {/* 选项区 */}
      <div className={`options ${isA ? 'options--colors' : 'options--scenes'}`}>
        {options.map((o) => {
          const chosen = state.phase === 'select' ? sel === o.id : false
          const isTruth = reveal && reveal.truth === o.id
          const pickers = reveal
            ? state.players.filter((p) => reveal.picks[p.id] === o.id)
            : []
          return (
            <button
              key={o.id}
              disabled={state.phase !== 'select' || submitted}
              className={[
                'opt',
                o.exposure ? `exp-border-${o.exposure}` : '',
                chosen ? 'opt--chosen' : '',
                isTruth ? 'opt--truth' : '',
                reveal && !isTruth ? 'opt--dim' : ''
              ].join(' ')}
              onClick={() => state.phase === 'select' && !submitted && setSel(o.id)}
            >
              <div className="opt__title">{o.title}</div>
              {o.sub && <div className="opt__sub">{o.sub}</div>}
              {isTruth && <div className="opt__truthtag">✓ 样本真实选择</div>}
              {reveal && pickers.length > 0 && (
                <div className="opt__pickers">
                  {pickers.map((p) => (
                    <span
                      key={p.id}
                      className={`pickchip ${reveal.correctIds.includes(p.id) ? 'pickchip--ok' : p.id === state.sampleId ? 'pickchip--self' : 'pickchip--miss'}`}
                    >
                      {p.nickname}
                      {p.id === state.sampleId ? ' ★' : reveal.correctIds.includes(p.id) ? ' ✓' : ' ✗'}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 操作区 */}
      {state.phase === 'select' && (
        <div className="actions">
          {submitted ? (
            <div className="submitted-note">
              <span className="spinner" /> 你已锁定（{labelOf(myPick || sel)}）· 等待其他人…
              <SubmitProgress state={state} />
            </div>
          ) : (
            <>
              <button className="btn btn--primary" disabled={!sel} onClick={() => onSubmit(sel)}>
                锁定我的选择
              </button>
              {cur.exposure === '红' && (
                <button className="btn btn--ghost" onClick={onSkip}>
                  这张太重了，跳过 🔴
                </button>
              )}
            </>
          )}
        </div>
      )}

      {state.phase === 'reveal' && reveal && (
        <div className="reveal">
          <div className={`reveal__verdict ${reveal.noneCorrect ? 'bad' : reveal.allCorrect ? 'great' : 'ok'}`}>
            {reveal.noneCorrect
              ? `没有人猜中 ${sample?.nickname} · 理解值 −1`
              : reveal.allCorrect
              ? `全员猜中 ${sample?.nickname}！理解值 +${reveal.delta}（含心意相通奖励）`
              : `${reveal.correctIds.length} 人猜中 · 理解值 +${reveal.delta}`}
          </div>
          <div className="reveal__curiosity">💬 {reveal.curiosity}</div>
          <button className="btn btn--primary" onClick={onNext}>
            {state.pendingEnd ? '查看观测结算 →' : '下一轮 →'}
          </button>
        </div>
      )}
    </div>
  )
}

function ScoreStrip({ state }) {
  const pct = Math.min(100, (state.understanding / state.target) * 100)
  return (
    <div className="score">
      <div className="score__item">
        <span className="score__k">第 {state.round + (state.phase === 'reveal' ? 0 : 1)}/{state.totalRounds} 轮</span>
      </div>
      <div className="score__bar">
        <div className="score__barfill" style={{ width: `${pct}%` }} />
        <span className="score__bartext">
          理解值 {state.understanding} / {state.target}
        </span>
      </div>
      <div className="score__item score__fail">
        失败 {state.failures} / {state.failCap}
      </div>
    </div>
  )
}

function SubmitProgress({ state }) {
  const done = state.players.filter((p) => p.connected && p.submitted).length
  const total = state.connectedCount
  return (
    <div className="progress">
      {state.players
        .filter((p) => p.connected)
        .map((p) => (
          <span key={p.id} className={`progdot ${p.submitted ? 'progdot--on' : ''}`} title={p.nickname} />
        ))}
      <span className="progress__text">
        {done}/{total} 已锁定
      </span>
    </div>
  )
}
