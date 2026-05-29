import { buildArtPrompt } from '../data/cardTheme'

// 配图占位框：现阶段不放真实美术，放一段等宽小字的 art prompt。
export default function ArtPlaceholder({ card, theme }) {
  const prompt = buildArtPrompt(card)
  return (
    <div className="art-box" style={{ '--accent': theme.accent, '--glow': theme.glow }}>
      <div className="art-scanlines" aria-hidden />
      <div className="art-grid" aria-hidden />
      <div className="art-corner art-corner--tl" aria-hidden />
      <div className="art-corner art-corner--tr" aria-hidden />
      <div className="art-corner art-corner--bl" aria-hidden />
      <div className="art-corner art-corner--br" aria-hidden />
      <div className="art-label">ART PROMPT · 配图提示</div>
      <p className="art-prompt">{prompt}</p>
      <div className="art-watermark" aria-hidden>SAMPLE OBSERVED</div>
    </div>
  )
}
