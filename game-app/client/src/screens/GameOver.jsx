export default function GameOver({ state, isHost, onRestart }) {
  const r = state.result || {}
  const title =
    r.type === 'win'
      ? '🎉 合作胜利'
      : r.type === 'lose'
      ? '💔 任务终止'
      : r.type === 'abort'
      ? '观测中断'
      : '🔭 观测结束'
  const subtitle =
    r.type === 'win'
      ? '观测任务圆满完成——你们比想象中更懂彼此。'
      : r.type === 'lose'
      ? '样本情绪过载了。别灰心，今天翻出来的那些"没猜中"，正是最值得聊的。'
      : r.type === 'abort'
      ? '人数不足，本局提前结束。'
      : `八轮观测完成 · 评级 ${r.grade || ''}`

  return (
    <div className="gameover">
      <div className={`panel result result--${r.type}`}>
        <h1 className="result__title">{title}</h1>
        <p className="result__sub">{subtitle}</p>

        <div className="result__stats">
          <div className="stat">
            <div className="stat__v">{r.understanding}</div>
            <div className="stat__k">最终理解值（目标 {r.target}）</div>
          </div>
          <div className="stat">
            <div className="stat__v">{r.rounds}</div>
            <div className="stat__k">完成轮数</div>
          </div>
          <div className="stat">
            <div className="stat__v">
              {r.failures}/{r.failCap}
            </div>
            <div className="stat__k">无人猜中次数</div>
          </div>
        </div>

        {r.mvp && (
          <div className="mvp">
            🏅 最佳观察员：<b>{r.mvp.nickname}</b>（猜中 {r.mvp.correct} 次）
          </div>
        )}

        <div className="result__ranks">
          {[...state.players]
            .sort((a, b) => b.correct - a.correct)
            .map((p, i) => (
              <div key={p.id} className="rankrow">
                <span className="rankrow__no">{i + 1}</span>
                <span className="rankrow__name">{p.nickname}</span>
                <span className="rankrow__val">猜中 {p.correct} · 当样本 {p.sampleTimes} 次</span>
              </div>
            ))}
        </div>

        <p className="result__note">
          真正的胜利，是你们把今晚翻出来的那几件事，<b>真的聊了一次</b>。
        </p>

        {isHost ? (
          <button className="btn btn--primary btn--block" onClick={onRestart}>
            再来一局（回到观测室）
          </button>
        ) : (
          <div className="waiting">等待房主开启下一局…</div>
        )}
      </div>
    </div>
  )
}
