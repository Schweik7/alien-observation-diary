import ArtPlaceholder from './ArtPlaceholder'
import { exposureTheme } from '../data/cardTheme'

// 场景卡（模式乙）：突出第二人称画面感。
export default function SceneCard({ card }) {
  const theme = exposureTheme(card.exposure)
  // 从「属于反应卡【…】」里提取归属反应名
  const ownerMatch = (card.questionOrOwner || '').match(/【(.+?)】/)
  const owner = ownerMatch ? ownerMatch[1] : card.questionOrOwner
  return (
    <article
      className="card card--scene"
      style={{
        '--accent': theme.accent,
        '--accent-soft': theme.accentSoft,
        '--glow': theme.glow,
        '--ink-bg': theme.inkBg,
        '--band': theme.band
      }}
    >
      <div className="card__frame">
        <div className="corner-badge">
          <span className="corner-badge__type">场景</span>
          <span className="corner-badge__exp">{theme.dot}</span>
        </div>
        <div className="card__id">{card.id}</div>

        <div className="name-banner name-banner--scene">
          <span className="name-banner__ribbon name-banner__ribbon--l" />
          <h3 className="name-banner__text">{card.name}</h3>
          <span className="name-banner__ribbon name-banner__ribbon--r" />
        </div>

        <ArtPlaceholder card={card} theme={theme} />

        {/* 第二人称画面 */}
        <div className="desc-box desc-box--scene">
          <div className="scene-quote-mark" aria-hidden>“</div>
          <p className="desc-box__text desc-box__text--scene">{card.description}</p>
        </div>

        <div className="filebar filebar--scene">
          <span className="filebar__tag">场景卡 · {card.subtype}</span>
          <span className="filebar__exp">{theme.label}</span>
        </div>

        {/* 归属反应 */}
        <div className="owner-box">
          <span className="owner-box__label">归属反应</span>
          <span className="owner-box__name">{owner}</span>
        </div>

        {card.note && <div className="card__note">※ {card.note}</div>}
      </div>
    </article>
  )
}
