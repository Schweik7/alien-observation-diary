import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 中文表头 -> 英文键
const HEADER_MAP = {
  卡牌ID: 'id',
  卡牌类型: 'type',
  暴露度: 'exposure',
  子类: 'subtype',
  卡名: 'name',
  '外星观测/场景描述': 'description',
  提问或归属: 'questionOrOwner',
  备注: 'note'
}
const FALLBACK_KEYS = ['id', 'type', 'exposure', 'subtype', 'name', 'description', 'questionOrOwner', 'note']

// 稳健 CSV 分词（处理引号、字段内逗号/换行、转义双引号、BOM、CRLF）
function tokenize(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch === '\r') {
      if (next !== '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
    } else field += ch
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function parseCsv(text) {
  const rows = tokenize(text).filter((r) => r.length > 0 && r.some((c) => c.trim() !== ''))
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  const looksLikeHeader = header.some((h) => HEADER_MAP[h])
  const keys = looksLikeHeader ? header.map((h, i) => HEADER_MAP[h] || FALLBACK_KEYS[i] || `col${i}`) : FALLBACK_KEYS
  const dataRows = looksLikeHeader ? rows.slice(1) : rows
  return dataRows
    .map((cols) => {
      const card = {}
      keys.forEach((k, i) => (card[k] = (cols[i] ?? '').trim()))
      return card
    })
    .filter((c) => c.id)
}

// 把一副牌（卡牌数组）编译成「可玩单元」：
//  - 事件卡 -> 玩法A（猜反应颜色）
//  - 反应卡(含>=2张配套场景卡) -> 玩法B（猜场景）
function groupPrefix(id) {
  return id.replace(/-R$/, '').replace(/-S\d+$/, '')
}

function buildPlayable(cards) {
  const items = []
  // 玩法A：事件卡
  for (const c of cards) {
    if (c.type === '事件卡') {
      items.push({
        kind: 'A',
        id: c.id,
        exposure: c.exposure,
        subtype: c.subtype,
        name: c.name,
        description: c.description,
        question: c.questionOrOwner,
        owner: c.note
      })
    }
  }
  // 玩法B：反应卡 + 其配套场景卡
  const scenesByGroup = {}
  for (const c of cards) {
    if (c.type === '场景卡') {
      const g = groupPrefix(c.id)
      ;(scenesByGroup[g] = scenesByGroup[g] || []).push(c)
    }
  }
  for (const c of cards) {
    if (c.type === '反应卡') {
      const g = groupPrefix(c.id)
      const scenes = (scenesByGroup[g] || []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        exposure: s.exposure
      }))
      if (scenes.length >= 2) {
        items.push({
          kind: 'B',
          id: c.id,
          exposure: c.exposure,
          subtype: c.subtype,
          reactionName: c.name,
          reactionDesc: c.description,
          owner: c.note,
          scenes
        })
      }
    }
  }
  return items
}

const DECK_DEFS = [
  { key: 'highgrade', label: '高年级版（9–12岁）', file: 'highgrade.csv' },
  { key: 'lowgrade', label: '低年级版（6–8岁）', file: 'lowgrade.csv' },
  { key: 'couples', label: '夫妻版（成人）', file: 'couples.csv' }
]

const decks = {}
for (const def of DECK_DEFS) {
  try {
    const text = readFileSync(join(__dirname, 'decks', def.file), 'utf8')
    const cards = parseCsv(text)
    decks[def.key] = { ...def, cards, items: buildPlayable(cards) }
    const a = decks[def.key].items.filter((i) => i.kind === 'A').length
    const b = decks[def.key].items.filter((i) => i.kind === 'B').length
    console.log(`[decks] ${def.label}: ${cards.length} 张卡 -> 玩法A ${a} / 玩法B ${b}`)
  } catch (e) {
    console.warn(`[decks] 加载 ${def.file} 失败:`, e.message)
  }
}

export const DECK_LIST = DECK_DEFS.map((d) => ({ key: d.key, label: d.label }))
export function getDeck(key) {
  return decks[key] || decks.highgrade
}
