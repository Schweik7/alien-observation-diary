// 成就图鉴：定义 + 结算评估。从 game.js 解耦出来，便于单独维护成就内容。
// team:true 表示团队成就（持有者记为「全体」）；其余为个人成就。

export const ACHIEVEMENTS = [
  // 心意相通类
  { key: 'mindmeld', cat: '心意相通', emoji: '🧠', name: '心意相通', desc: '有一轮全体观察员都猜中了样本', team: true },
  { key: 'streak3', cat: '心意相通', emoji: '🔥', name: '读心连胜', desc: '连续 3 轮猜中样本' },
  { key: 'reader', cat: '心意相通', emoji: '🎯', name: '读心高手', desc: '本局累计猜中 5 次及以上' },
  // 真心话类
  { key: 'heartfelt', cat: '真心话', emoji: '💬', name: '走心发言', desc: '在至少 3 轮写下心里话' },
  { key: 'eloquent', cat: '真心话', emoji: '✍️', name: '字字珠玑', desc: '写下过一句不少于 40 字的真心话' },
  { key: 'everyword', cat: '真心话', emoji: '📝', name: '句句不落', desc: '参与的每一轮都留下了一句话' },
  // 角色/互动类
  { key: 'veteran', cat: '角色互动', emoji: '⭐', name: '资深样本', desc: '当样本 3 次及以上' },
  { key: 'twoface', cat: '角色互动', emoji: '🎭', name: '表里不一大师', desc: '作为样本被翻出「表里不一」2 次及以上' },
  { key: 'mvp', cat: '角色互动', emoji: '🏅', name: '最佳观察员', desc: '本局猜中次数最多（至少 1 次）' },
  // 破冰/暴露类
  { key: 'brave', cat: '破冰暴露', emoji: '❤️‍🔥', name: '敢于掏心窝', desc: '作为样本完成过一张红色（掏心窝）卡' },
  { key: 'noskip', cat: '破冰暴露', emoji: '🚫', name: '绝不退缩', desc: '整局没有任何人跳过卡', team: true },
  { key: 'deep', cat: '破冰暴露', emoji: '🌊', name: '深度暴露', desc: '作为样本面对红色卡 2 次及以上' }
]

// 结算时评估成就：返回 [{ key, holders: [昵称...] }]，只含已达成的
export function evaluateAchievements(room) {
  const players = room.order.map((id) => room.players.get(id)).filter(Boolean)
  const personalCond = {
    streak3: (p) => p.maxStreak >= 3,
    reader: (p) => p.correct >= 5,
    heartfelt: (p) => p.sentenceCount >= 3,
    eloquent: (p) => p.longestSentence >= 40,
    everyword: (p) => p.submits > 0 && p.sentenceCount >= p.submits,
    veteran: (p) => p.sampleTimes >= 3,
    twoface: (p) => p.gapAsSample >= 2,
    brave: (p) => p.redAsSample >= 1,
    deep: (p) => p.redAsSample >= 2
  }
  let topCorrect = 0
  for (const p of players) topCorrect = Math.max(topCorrect, p.correct)

  return ACHIEVEMENTS.map((a) => {
    let holders = []
    if (a.key === 'mindmeld') {
      holders = room.allCorrectRounds > 0 ? ['全体'] : []
    } else if (a.key === 'noskip') {
      holders = room.skipCount === 0 && room.round > 0 ? ['全体'] : []
    } else if (a.key === 'mvp') {
      holders = topCorrect >= 1 ? players.filter((p) => p.correct === topCorrect).map((p) => p.nickname) : []
    } else {
      const cond = personalCond[a.key]
      holders = cond ? players.filter(cond).map((p) => p.nickname) : []
    }
    return { key: a.key, holders }
  }).filter((a) => a.holders.length > 0)
}
