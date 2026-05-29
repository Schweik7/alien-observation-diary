import ArtPlaceholder from './ArtPlaceholder'
import { exposureTheme } from '../data/cardTheme'

// 事件卡（模式甲）：突出「外星观测报告」档案感。
export default function EventCard({ card }) {
  const theme = exposureTheme(card.exposure)
  return (
    <article
      className="card card--event"
      style={{
        '--accent': theme.accent,
        '--accent-soft': theme.accentSoft,
        '--glow': theme.glow,
        '--ink-bg': theme.inkBg,
        '--band': theme.band
      }}
    >
      <div className="card__frame">
        {/* 左上角角标：类型 + 暴露度 */}
        <div className="corner-badge">
          <span className="corner-badge__type">事件</span>
          <span className="corner-badge__exp">{theme.dot}</span>
        </div>
        <div className="card__id">{card.id}</div>

        {/* 卡名横幅 */}
        <div className="name-banner">
          <span className="name-banner__ribbon name-banner__ribbon--l" />
          <h3 className="name-banner__text">{card.name}</h3>
          <span className="name-banner__ribbon name-banner__ribbon--r" />
        </div>

        {/* 配图区 */}
        <ArtPlaceholder card={card} theme={theme} />

        {/* 档案标签条 */}
        <div className="filebar">
          <span className="filebar__tag">外星观测报告</span>
          <span className="filebar__sub">{card.subtype}</span>
          <span className="filebar__exp">{theme.label}</span>
        </div>

        {/* 描述框：外星观测记录 */}
        <div className="desc-box desc-box--archive">
          <div className="desc-box__head">观测记录 · OBSERVATION LOG</div>
          <p className="desc-box__text">{card.description}</p>
        </div>

        {/* 提问框 */}
        <div className="ask-box">
          <span className="ask-box__icon">❓</span>
          <p className="ask-box__text">{card.questionOrOwner}</p>
        </div>

        {card.note && <div className="card__note">※ {card.note}</div>}
      </div>
    </article>
  )
}
