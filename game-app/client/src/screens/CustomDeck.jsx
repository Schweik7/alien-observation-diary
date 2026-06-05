import { useEffect, useState } from 'react'

// 定制题库弹窗：填家庭情况 + 选模型 -> 调用后端生成专属牌库
export default function CustomDeck({ nickname, gender, onCreated, onClose }) {
  const [template, setTemplate] = useState('')
  const [models, setModels] = useState([])
  const [family, setFamily] = useState('')
  const [modelKey, setModelKey] = useState('deepseek-v4-flash')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/custom-meta')
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models || [])
        if (d.models?.[0]) setModelKey(d.models[0].key)
        setTemplate(d.template || '')
        setFamily((f) => f || d.template || '')
      })
      .catch(() => setError('无法连接服务器，稍后再试'))
  }, [])

  async function generate() {
    if (family.trim().length < 10) return setError('请先填写家庭情况（至少写几句）')
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/custom-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family, modelKey, nickname, gender })
      })
      const data = await res.json()
      if (data.ok) onCreated({ key: data.deckKey, label: data.label, count: data.count })
      else setError(data.error || '生成失败，请重试')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span className="diary__head">🎨 定制你们的专属题库</span>
          <button className="linkbtn" onClick={onClose}>
            关闭 ✕
          </button>
        </div>
        <p className="diary__intro">
          填写你们家的真实情况，AI 会生成 30 道贴合你们生活的夫妻题。资料仅用于本次出题。
        </p>

        <div className="block__label">家庭情况（照着模板填，越具体越扎心）</div>
        <textarea
          className="input custom-ta"
          rows={9}
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder={template}
        />

        <div className="block__label">选择生成模型</div>
        <div className="deck-pick">
          {models.map((m) => (
            <button
              key={m.key}
              className={`deck-opt ${modelKey === m.key ? 'deck-opt--active' : ''}`}
              onClick={() => setModelKey(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && <div className="error-bar">{error}</div>}
        <button className="btn btn--primary btn--block" disabled={busy} onClick={generate}>
          {busy ? '正在生成专属题库…（约 20-40 秒）' : '✨ 生成专属题库'}
        </button>
      </div>
    </div>
  )
}
