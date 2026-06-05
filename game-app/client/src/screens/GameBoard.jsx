import { useEffect, useState } from 'react'

const EXP_LABEL = { 绿: '低暴露', 黄: '真实小事', 红: '掏心窝 · 可跳过' }

export default function GameBoard({ state, youId, onSubmit, onUnlock, onSkip, onObjection, onNext }) {
  const cur = state.current
  const me = state.players.find((p) => p.id === youId)
  const isSample = state.sampleId === youId
  const sample = state.players.find((p) => p.id === state.sampleId)
  const submitted = !!me?.submitted
  const reveal = state.reveal
  const isA = cur?.kind === 'A'

  // 本地选择
  const [surface, setSurface] = useState(null) // 表层（四色，仅样本·玩法A）
  const [inner, setInner] = useState(null) // 里层（玩法A）或留空
  const [innerObj, setInnerObj] = useState(null) // 动词短语反应的对象（you/me）
  const [scene, setScene] = useState(null) // 场景（玩法B）
  const [sentence, setSentence] = useState('')

  useEffect(() => {
    setSurface(null)
    setInner(null)
    setInnerObj(null)
    setScene(null)
    setSentence('')
  }, [cur?.id, state.phase, state.round])

  if (!cur) return null

  const innerSet = state.innerSet || state.colors
  const surfaceOpts = state.colors.map((c) => ({ id: c.key, title: `${c.emoji} ${c.name}`, sub: c.desc }))
  const innerOpts = innerSet.map((c) => ({
    id: c.key,
    title: `${c.emoji} ${c.obj && c.tpl ? c.tpl.replace('{}', '＿') : c.name}`,
    sub: c.desc,
    obj: !!c.obj
  }))
  const sceneOpts = (cur.scenes || []).map((s) => ({ id: s.id, title: s.name, sub: s.description, exposure: s.exposure }))

  const innerNeed = innerSet.find((c) => c.key === inner)
  const needsObj = !!innerNeed?.obj
  // 选了动词短语反应后，必须再选对象（你/我）
  const innerReady = !!inner && (!needsObj || !!innerObj)

  // 选择某反应：换到非动词短语时清掉对象
  function pickInner(id) {
    setInner(id)
    const need = innerSet.find((c) => c.key === id)
    if (!need?.obj) setInnerObj(null)
  }

  // 锁定条件：一句话不再是必填项（可计入成就但不强制）
  const canLock = isA ? (isSample ? !!surface && innerReady : innerReady) : !!scene

  function lock() {
    if (isA) {
      const base = needsObj ? { inner, innerObj } : { inner }
      onSubmit(isSample ? { surface, ...base, sentence } : { ...base, sentence })
    } else onSubmit({ scene, sentence })
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
            🎯 本轮你是 <b>样本</b>：
            {isA ? '先选你表面的反应，再选心里其实想要的' : '选出"真的最会让你这样"的那一张'}
          </>
        ) : (
          <>
            🔭 你在观察 <b>{sample?.nickname}</b>：
            {isA ? '猜猜 TA 心里其实想要的是什么' : '猜猜 TA 选了哪一张'}
          </>
        )}
      </div>

      {/* ============ 选择阶段 ============ */}
      {state.phase === 'select' && !submitted && (
        <>
          {isA && isSample && (
            <Section step="①" title="你表面会怎么表现？" hint="别人能看到的那一面（四色）">
              <OptionGrid kind="colors" options={surfaceOpts} value={surface} onPick={setSurface} />
            </Section>
          )}

          {isA && (
            <Section
              step={isSample ? '②' : ''}
              title={isSample ? '你心里其实最想要的是？' : `猜：${sample?.nickname} 心里其实想要的是？`}
              hint={isSample ? '底下那层，往往才是真正的你' : '表面那层都看得见，难的是底下这层'}
            >
              <OptionGrid kind={state.innerKind === 'needs' ? 'needs' : 'colors'} options={innerOpts} value={inner} onPick={pickInner} />
              {needsObj && (
                <ObjectChooser need={innerNeed} value={innerObj} onPick={setInnerObj} isSample={isSample} />
              )}
            </Section>
          )}

          {!isA && (
            <Section title={isSample ? '哪一张真的最会让你这样？' : `猜：${sample?.nickname} 选了哪一张？`}>
              <OptionGrid kind="scenes" options={sceneOpts} value={scene} onPick={setScene} />
            </Section>
          )}

          {/* 一句话 */}
          <div className="saybox">
            <label className="saybox__label">
              💬 {isSample ? '说说你心里那一句真话' : '你为什么这么猜？'}
              <span className="saybox__opt">（选填 · 写了可点亮成就）</span>
            </label>
            <textarea
              className="saybox__input"
              maxLength={140}
              rows={2}
              placeholder={
                isSample
                  ? '例：我那天不是不在乎，是真的太累了，一句话都不想说……'
                  : '例：我赌你想要空间，因为你最近一累就想自己待着。'
              }
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            <div className="saybox__count">{sentence.length}/140</div>
          </div>

          <div className="actions">
            <button className="btn btn--primary" disabled={!canLock} onClick={lock}>
              锁定我的选择
            </button>
            {cur.exposure === '红' && (
              <button className="btn btn--ghost" onClick={onSkip}>
                这张太重了，跳过 🔴
              </button>
            )}
          </div>
        </>
      )}

      {state.phase === 'select' && submitted && (
        <div className="actions actions--col">
          <div className="submitted-note">
            <span className="spinner" /> 你已锁定，等待其他人…
            <SubmitProgress state={state} />
          </div>
          <button className="btn btn--ghost" onClick={onUnlock}>
            ↩ 取消锁定，重新选
          </button>
        </div>
      )}

      {/* ============ 翻牌阶段 ============ */}
      {state.phase === 'reveal' && reveal && (
        <div className="reveal">
          <div className={`reveal__verdict ${reveal.noneCorrect ? 'bad' : reveal.allCorrect ? 'great' : 'ok'}`}>
            {reveal.noneCorrect
              ? `没有人猜中 ${sample?.nickname} · 理解值 −1`
              : reveal.allCorrect
              ? `全员猜中 ${sample?.nickname}！理解值 +${reveal.delta}（含心意相通奖励）`
              : `${reveal.correctIds.length} 人猜中 · 理解值 +${reveal.delta}`}
          </div>

          {/* 表里揭晓 */}
          {reveal.kind === 'A' && (
            <div className={`layers ${reveal.gap ? 'layers--gap' : ''}`}>
              {reveal.surfaceLabel && (
                <span className="layer layer--surface">表面 {reveal.surfaceLabel}</span>
              )}
              {reveal.surfaceLabel && <span className="layer__arrow">⟶</span>}
              <span className="layer layer--inner">心里 {reveal.innerLabel}</span>
              {reveal.gap && <span className="layer__gap">表里不一</span>}
            </div>
          )}

          {/* 各自的猜测分布 */}
          <RevealGrid state={state} reveal={reveal} cur={cur} options={reveal.kind === 'A' ? innerOpts : sceneOpts} />

          {/* 每个人那句话 */}
          <Sentences state={state} reveal={reveal} />

          <ObjectionBox state={state} reveal={reveal} youId={youId} onObjection={onObjection} />

          <div className="reveal__curiosity">💬 {reveal.curiosity}</div>
          <button className="btn btn--primary" onClick={onNext}>
            {state.pendingEnd ? '查看观测结算 →' : '下一轮 →'}
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ step, title, hint, children }) {
  return (
    <div className="psection">
      <div className="psection__head">
        {step && <span className="psection__step">{step}</span>}
        <span className="psection__title">{title}</span>
        {hint && <span className="psection__hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function OptionGrid({ kind, options, value, onPick }) {
  return (
    <div className={`options options--${kind}`}>
      {options.map((o) => (
        <button
          key={o.id}
          className={['opt', o.exposure ? `exp-border-${o.exposure}` : '', value === o.id ? 'opt--chosen' : ''].join(' ')}
          onClick={() => onPick(o.id)}
        >
          <div className="opt__title">{o.title}</div>
          {o.sub && <div className="opt__sub">{o.sub}</div>}
        </button>
      ))}
    </div>
  )
}

// 动词短语反应的对象选择：你 / 我（你=对方，我=自己；判定时服务端会按绝对人称归一）
function ObjectChooser({ need, value, onPick, isSample }) {
  const fill = (ch) => (need.tpl ? need.tpl.replace('{}', ch) : need.name)
  const hint = isSample
    ? '「我」＝你自己，「你」＝对方'
    : `「你」＝${'你正在观察的那位'}，「我」＝你自己`
  return (
    <div className="objchooser">
      <span className="objchooser__label">填空 · 选个对象：</span>
      <button className={`objbtn ${value === 'you' ? 'objbtn--on' : ''}`} onClick={() => onPick('you')}>
        {fill('你')}
      </button>
      <button className={`objbtn ${value === 'me' ? 'objbtn--on' : ''}`} onClick={() => onPick('me')}>
        {fill('我')}
      </button>
      <span className="objchooser__hint">{hint}</span>
    </div>
  )
}

// 把某人选择的对象按「样本视角」翻译成可读字（样本本人选的直接显示；观察员的你↔我对调到样本视角）
function objChar(innerObj, isSamplePick) {
  if (innerObj !== 'me' && innerObj !== 'you') return ''
  const abs = isSamplePick ? (innerObj === 'me' ? 'self' : 'partner') : innerObj === 'you' ? 'self' : 'partner'
  return abs === 'self' ? '我' : '你'
}

function RevealGrid({ state, reveal, options }) {
  const field = reveal.kind === 'A' ? 'inner' : 'scene'
  const innerSet = state.innerSet || []
  const objNeed = (id) => innerSet.find((c) => c.key === id)?.obj
  return (
    <div className={`options options--${reveal.kind === 'A' ? (state.innerKind === 'needs' ? 'needs' : 'colors') : 'scenes'}`}>
      {options.map((o) => {
        const isTruth = reveal.truth === o.id
        const pickers = state.players.filter((p) => reveal.picks[p.id]?.[field] === o.id)
        // 没被猜中的格子里若有观察员选了它，单独高亮（让"对方选的"更醒目）
        const missPick = !isTruth && pickers.some((p) => p.id !== state.sampleId)
        return (
          <div
            key={o.id}
            className={['opt', 'opt--static', o.exposure ? `exp-border-${o.exposure}` : '', isTruth ? 'opt--truth' : missPick ? 'opt--otherpick' : 'opt--dim'].join(' ')}
          >
            <div className="opt__title">{o.title}</div>
            {o.sub && <div className="opt__sub">{o.sub}</div>}
            {isTruth && <div className="opt__truthtag">✓ 样本真实选择</div>}
            {pickers.length > 0 && (
              <div className="opt__pickers">
                {pickers.map((p) => (
                  <span
                    key={p.id}
                    className={`pickchip ${
                      p.id === state.sampleId
                        ? 'pickchip--self'
                        : reveal.correctIds.includes(p.id)
                        ? 'pickchip--ok'
                        : 'pickchip--miss'
                    }`}
                  >
                    {p.nickname}
                    {objNeed(o.id) && reveal.picks[p.id]?.innerObj
                      ? `·${objChar(reveal.picks[p.id].innerObj, p.id === state.sampleId)}`
                      : ''}
                    {p.id === state.sampleId ? ' ★' : reveal.correctIds.includes(p.id) ? ' ✓' : ' ✗'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Sentences({ state, reveal }) {
  const rows = state.players
    .filter((p) => p.connected && reveal.picks[p.id]?.sentence)
    .map((p) => ({ p, text: reveal.picks[p.id].sentence }))
  if (rows.length === 0) return null
  return (
    <div className="saidlist">
      <div className="saidlist__head">大家说的那句话</div>
      {rows.map(({ p, text }) => (
        <div key={p.id} className={`said ${p.id === state.sampleId ? 'said--sample' : ''}`}>
          <span className="said__who">
            {p.nickname}
            {p.id === state.sampleId ? '（样本）' : reveal.correctIds.includes(p.id) ? '（猜中）' : ''}
          </span>
          <span className="said__text">「{text}」</span>
        </div>
      ))}
    </div>
  )
}

// 异议：翻牌后若双方选择不同，可声明「其实我们想法一样」。双方都点则改判为猜中。
function ObjectionBox({ state, reveal, youId, onObjection }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileUrl, setFileUrl] = useState(null)
  const [fileName, setFileName] = useState('')

  const observers = state.players.filter((p) => p.connected && p.id !== state.sampleId)
  const missExists = observers.some((o) => !reveal.correctIds.includes(o.id))
  const objections = reveal.objections || []
  const iRaised = objections.includes(youId)
  const connCount = state.players.filter((p) => p.connected).length

  if (reveal.objectionResolved) {
    return (
      <div className="objection objection--done">
        🤝 异议达成：你们其实是一个意思，本轮改判为「彼此猜中」。这只是题库没覆盖到而已。
        {reveal.objectionInfo?.length > 0 && (
          <div className="objection__notes">
            {reveal.objectionInfo.map((n, i) => (
              <div key={i} className="objection__note">
                <b>{n.nickname}</b>
                {n.note && <span>：{n.note}</span>}
                {n.url && <a href={n.url} target="_blank" rel="noreferrer"> 📎 查看上传</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!missExists) return null

  async function confirm() {
    setBusy(true)
    try {
      let file = null
      if (fileUrl) file = { url: fileUrl }
      onObjection({ note: note.trim(), file })
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result })
        })
        const d = await res.json()
        if (d.ok) setFileUrl(d.url)
        else setFileName('上传失败：' + (d.error || ''))
      } catch {
        setFileName('上传失败，请重试')
      }
    }
    reader.readAsDataURL(f)
  }

  return (
    <div className="objection">
      {!open && (
        <button className="objection__btn" onClick={() => setOpen(true)} disabled={iRaised}>
          🙋 异议！<span className="objection__q" title="其实我们的想法是一样的">？</span>
          <span className="objection__sub">其实我们的想法是一样的</span>
        </button>
      )}
      <div className="objection__status">
        已提出异议：{objections.length}/{connCount}
        {iRaised && ' · 你已提出，等待对方'}
      </div>

      {open && (
        <div className="objection__panel">
          <div className="objection__tip">
            如果你们其实是一个意思、只是题目没覆盖到，双方都点「确认异议」即可改判为猜中。
          </div>
          <textarea
            className="saybox__input"
            rows={2}
            maxLength={280}
            placeholder="（选填）写下你们真实的反应是什么…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="objection__upload">
            <label className="btn btn--ghost btn--sm">
              📎 上传真实反应
              <input type="file" accept="image/*" hidden onChange={onFile} />
            </label>
            {fileName && <span className="objection__fname">{fileUrl ? '✓ ' : '… '}{fileName}</span>}
          </div>
          <div className="actions">
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={confirm}>
              确认异议（我们想法一致）
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
              取消
            </button>
          </div>
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
        <span className="score__k">
          第 {state.round + (state.phase === 'reveal' ? 0 : 1)}/{state.totalRounds} 轮
        </span>
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
