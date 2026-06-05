import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// 兼容非 HTTPS（局域网 http）环境的复制文本
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 退回 execCommand */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function copyImage(dataUrl) {
  try {
    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })])
      return true
    }
  } catch {
    /* 不支持则提示长按保存 */
  }
  return false
}

export default function Invite({ link, roomId, onClose }) {
  const [qr, setQr] = useState('')
  const [linkMsg, setLinkMsg] = useState('')
  const [imgMsg, setImgMsg] = useState('')

  useEffect(() => {
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#0b0e1a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [link])

  async function onCopyLink() {
    const ok = await copyText(link)
    setLinkMsg(ok ? '已复制链接 ✓' : '复制失败，请手动选择上方链接')
    setTimeout(() => setLinkMsg(''), 2200)
  }

  async function onCopyImg() {
    if (!qr) return
    const ok = await copyImage(qr)
    setImgMsg(ok ? '已复制二维码图片 ✓' : '当前环境不支持直接复制图片，请长按/右键图片保存')
    setTimeout(() => setImgMsg(''), 3000)
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box modal__box--invite" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span className="diary__head">📨 邀请家人 / 朋友加入</span>
          <button className="linkbtn" onClick={onClose}>
            关闭 ✕
          </button>
        </div>
        <p className="diary__intro">
          房间号 <b>{roomId}</b> · 把下面的链接或二维码发给对方，TA 打开就能加入。
        </p>

        {qr && (
          <div className="invite__qrwrap">
            <img className="invite__qr" src={qr} alt="房间二维码" />
            <div className="invite__qrhint">手机扫码直接进房 · 可长按 / 右键保存图片</div>
          </div>
        )}

        <div className="invite__linkrow">
          <input className="input invite__link" readOnly value={link} onFocus={(e) => e.target.select()} />
        </div>

        <div className="invite__btns">
          <button className="btn btn--primary" onClick={onCopyLink}>
            🔗 复制链接
          </button>
          <button className="btn btn--ghost" onClick={onCopyImg} disabled={!qr}>
            🖼 复制二维码图片
          </button>
        </div>
        {(linkMsg || imgMsg) && <div className="invite__msg">{linkMsg || imgMsg}</div>}
      </div>
    </div>
  )
}
