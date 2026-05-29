// 配色 / 主题 / 角标 / art-prompt 的统一逻辑。
// 暴露度色系：绿=轻松、黄=真实小事、红=掏心窝。
// 反应卡按情绪 emoji 映射四色系：🔴炸毛 🔵讲理 🟢求抱 🟡躲开 ➕正向。

// ---- 暴露度主题（事件卡 / 场景卡）----
export const EXPOSURE_THEMES = {
  绿: {
    label: '绿 · 低暴露',
    dot: '🟢',
    accent: '#3fbf7f',
    accentSoft: '#7fe0ab',
    inkBg: 'linear-gradient(160deg, #0f2a1e 0%, #143a28 55%, #0c2018 100%)',
    frame: '#3fbf7f',
    glow: 'rgba(63,191,127,0.45)',
    band: 'linear-gradient(90deg,#1d6b46,#34a86e,#1d6b46)'
  },
  黄: {
    label: '黄 · 中暴露',
    dot: '🟡',
    accent: '#e8b13a',
    accentSoft: '#f5d27a',
    inkBg: 'linear-gradient(160deg, #2c2410 0%, #3d3216 55%, #221b0c 100%)',
    frame: '#e8b13a',
    glow: 'rgba(232,177,58,0.45)',
    band: 'linear-gradient(90deg,#8a6614,#d49a2a,#8a6614)'
  },
  红: {
    label: '红 · 高暴露',
    dot: '🔴',
    accent: '#e0563f',
    accentSoft: '#f29178',
    inkBg: 'linear-gradient(160deg, #2e1310 0%, #421b16 55%, #23100d 100%)',
    frame: '#e0563f',
    glow: 'rgba(224,86,63,0.5)',
    band: 'linear-gradient(90deg,#8a2c1c,#cc4a32,#8a2c1c)'
  }
}

export const DEFAULT_THEME = {
  label: '未知',
  dot: '⚪',
  accent: '#8aa0b4',
  accentSoft: '#b9c8d6',
  inkBg: 'linear-gradient(160deg,#1a2330,#222e3d,#161e29)',
  frame: '#8aa0b4',
  glow: 'rgba(138,160,180,0.4)',
  band: 'linear-gradient(90deg,#3a4a5c,#5d7a94,#3a4a5c)'
}

export function exposureTheme(exposure) {
  return EXPOSURE_THEMES[exposure] || DEFAULT_THEME
}

// ---- 反应卡四色系：从卡名里的 emoji 推断 ----
export const REACTION_SERIES = [
  { emojis: ['💧', '😢', '😭'], key: '求抱系', tag: '🟢 求抱系（示弱）', icon: '💧', accent: '#3fbf7f', band: 'linear-gradient(90deg,#1d6b46,#34a86e,#1d6b46)', glow: 'rgba(63,191,127,0.5)', inkBg: 'linear-gradient(160deg,#0f2a1e,#143a28,#0c2018)' },
  { emojis: ['🔥', '😡', '😠'], key: '炸毛系', tag: '🔴 炸毛系（对抗）', icon: '🔥', accent: '#e0563f', band: 'linear-gradient(90deg,#8a2c1c,#cc4a32,#8a2c1c)', glow: 'rgba(224,86,63,0.5)', inkBg: 'linear-gradient(160deg,#2e1310,#421b16,#23100d)' },
  { emojis: ['🧊', '😶', '🤐'], key: '躲开系', tag: '🟡 躲开系（回避）', icon: '🧊', accent: '#5cc8e8', band: 'linear-gradient(90deg,#1a5a73,#2f93b8,#1a5a73)', glow: 'rgba(92,200,232,0.5)', inkBg: 'linear-gradient(160deg,#0d2730,#123845,#0a1f26)' },
  { emojis: ['😌', '😄', '😁', '😊'], key: '正向', tag: '➕ 正向（敞开）', icon: '😌', accent: '#e8b13a', band: 'linear-gradient(90deg,#8a6614,#d49a2a,#8a6614)', glow: 'rgba(232,177,58,0.5)', inkBg: 'linear-gradient(160deg,#2c2410,#3d3216,#221b0c)' },
  { emojis: ['😰', '😨', '😟'], key: '焦虑系', tag: '🟡 躲开系（紧绷）', icon: '😰', accent: '#b98cf0', band: 'linear-gradient(90deg,#4a2f73,#7b52b8,#4a2f73)', glow: 'rgba(185,140,240,0.5)', inkBg: 'linear-gradient(160deg,#1e1430,#2a1c45,#160e26)' },
  { emojis: ['😔', '😞'], key: '失落系', tag: '🟢 求抱系（低落）', icon: '😔', accent: '#7f93b0', band: 'linear-gradient(90deg,#33425c,#566e94,#33425c)', glow: 'rgba(127,147,176,0.5)', inkBg: 'linear-gradient(160deg,#161d2a,#222d40,#121826)' },
  { emojis: ['😤'], key: '委屈系', tag: '🔴 炸毛系（委屈）', icon: '😤', accent: '#e07fa0', band: 'linear-gradient(90deg,#73294a,#b8487b,#73294a)', glow: 'rgba(224,127,160,0.5)', inkBg: 'linear-gradient(160deg,#2a1019,#3d1726,#220d14)' }
]

export function reactionSeries(name = '') {
  for (const s of REACTION_SERIES) {
    if (s.emojis.some((e) => name.includes(e))) return s
  }
  // 兜底：用暴露度
  return { key: '未知', tag: '⚪ 未分类', icon: '🛸', accent: '#8aa0b4', band: 'linear-gradient(90deg,#3a4a5c,#5d7a94,#3a4a5c)', glow: 'rgba(138,160,180,0.45)', inkBg: 'linear-gradient(160deg,#1a2330,#222e3d,#161e29)' }
}

// 把反应卡卡名里的 emoji 单独抠出来当大图标，并返回去掉 emoji 的纯文字名
export function splitEmojiName(name = '') {
  const m = name.match(/^\s*([\p{Emoji_Presentation}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+)\s*(.*)$/u)
  if (m) return { icon: m[1], text: m[2] || name }
  return { icon: '', text: name }
}

// ---- art prompt 生成 ----
// 统一的外星观测档案视觉调性前缀
const STYLE = '复古科幻外星观测档案风，冷色调监控扫描线，胶片颗粒，档案夹标签质感'

/**
 * 为单张卡生成贴切的图像提示语（art prompt）。
 * 根据卡牌类型与内容定制画面、视角与情绪。
 */
export function buildArtPrompt(card) {
  const { type, name, description, exposure } = card

  if (type === '事件卡') {
    const mood =
      exposure === '红'
        ? '极简留白，幽闭的暖光孤岛，情绪克制而沉重，特写一个被观测的人类背影'
        : exposure === '黄'
          ? '居家真实场景，俯视监控视角，画面边缘有数据标注与测量框'
          : '略带荒诞幽默的日常瞬间，外星仪器一本正经地扫描记录'
    return `${STYLE}。画面：外星观测仪器正在记录——「${name}」。${condense(description)}。${mood}。叠加扫描线、坐标网格与"SAMPLE OBSERVED"档案水印。`
  }

  if (type === '反应卡') {
    const s = reactionSeries(name)
    const { text } = splitEmojiName(name)
    return `${STYLE}。一张大号情绪指示卡：中央是巨大的发光符号「${s.icon}」，象征「${text}」。${condense(description)}。${s.key}色光晕，能量从图标向四周辐射，背景是外星观测终端的全息界面。`
  }

  if (type === '场景卡') {
    return `${STYLE}。第二人称沉浸画面（"你"的主观视角）：${condense(description)} 镜头贴近人物情绪，景深虚化，角落有一枚小小的观测标记圆片。氛围真实、克制，留给观者代入空间。`
  }

  return `${STYLE}。一张《地球人观察日记》卡牌：「${name}」。${condense(description)}`
}

function condense(text = '') {
  const t = text.trim()
  if (t.length <= 70) return t
  return t.slice(0, 68) + '…'
}
