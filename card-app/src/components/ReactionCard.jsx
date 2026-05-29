import ArtPlaceholder from './ArtPlaceholder'
import { reactionSeries, splitEmojiName } from '../data/cardTheme'

// 反应卡（模式乙的反应指示卡）：突出大号情绪图标。
export default function ReactionCard({ card }) {
  const s = reactionSeries(card.name)
  const { icon, text } = splitEmojiName(card.name)
  const theme = {
    accent: s.accent,
    accentSoft: s.accent,
    glow: s.glow,
    inkBg: s.inkBg,
    band: s.band
  }
  return (
    <article
      className="card card--reaction"
      style={{
        '--accent': s.accent,
        '--accent-soft': s.accent,
        '--glow': s.glow,
        '--ink-bg': s.inkBg,
        '--band': s.band
      }}
    >
      <div className="card__frame">
        <div className="corner-badge">
          <span className="corner-badge__type">反应</span>
          <span className="corner-badge__exp">{s.tag.split(' ')[0]}</span>
        </div>
        <div className="card__id">{card.id}</div>

        {/* 四色系标签 */}
        <div className="series-tag">{s.tag}</div>

        {/* 大号情绪图标 */}
        <div className="emoji-stage">
          <div className="emoji-stage__halo" aria-hidden />
          <div className="emoji-stage__icon">{icon || s.icon}</div>
        </div>

        {/* 反应名 */}
        <div className="name-banner name-banner--reaction">
          <span className="name-banner__ribbon name-banner__ribbon--l" />
          <h3 className="name-banner__text">{text}</h3>
          <span className="name-banner__ribbon name-banner__ribbon--r" />
        </div>

        {/* 配图区 */}
        <ArtPlaceholder card={card} theme={theme} />

        {/* 描述框 */}
        <div className="desc-box">
          <p className="desc-box__text">{card.description}</p>
        </div>

        <div className="ask-box ask-box--reaction">
          <span className="ask-box__icon">🛸</span>
          <p className="ask-box__text">{card.questionOrOwner}</p>
        </div>

        <div className="filebar filebar--reaction">
          <span className="filebar__tag">反应指示卡 · 模式乙</span>
          <span className="filebar__sub">{card.subtype}</span>
        </div>

        {card.note && <div className="card__note">※ {card.note}</div>}
      </div>
    </article>
  )
}
