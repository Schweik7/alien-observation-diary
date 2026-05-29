// 稳健的 CSV 解析器 + 卡牌库加载逻辑。
// 设计目标：能直接吃下《外星观察日记_高年级版卡牌库_v0.x.csv》，
// 字段顺序为：卡牌ID,卡牌类型,暴露度,子类,卡名,外星观测/场景描述,提问或归属,备注
// 支持：引号包裹字段、字段内逗号、字段内换行、转义双引号("")、CRLF/LF、BOM、表头容错。

// 中文表头 -> 英文键 的映射（按名匹配，不依赖列顺序）
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

// 兜底列顺序（万一表头缺失或乱了）
const FALLBACK_KEYS = [
  'id',
  'type',
  'exposure',
  'subtype',
  'name',
  'description',
  'questionOrOwner',
  'note'
]

/**
 * 把一段 CSV 文本切成二维数组（行 -> 字段），正确处理引号与换行。
 */
export function tokenizeCsv(text) {
  // 去掉 BOM
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
          field += '"' // 转义的双引号
          i++
        } else {
          inQuotes = false // 引号结束
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch === '\r') {
      // 忽略，交给后续 \n 处理；若是孤立 \r 也当作换行
      if (next !== '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
    } else {
      field += ch
    }
  }
  // 收尾
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * 解析完整 CSV 文本为卡牌对象数组。
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseCsv(text) {
  if (!text || !text.trim()) return []
  const rows = tokenizeCsv(text).filter(
    (r) => r.length > 0 && r.some((c) => c.trim() !== '')
  )
  if (rows.length === 0) return []

  const header = rows[0].map((h) => h.trim())
  // 用表头构造 列索引 -> 英文键
  const keysByIndex = header.map((h, idx) => HEADER_MAP[h] || FALLBACK_KEYS[idx] || `col${idx}`)
  // 若第一行看起来不像表头（没有任何已知列名），则把它当数据，套用兜底键
  const looksLikeHeader = header.some((h) => HEADER_MAP[h])
  const dataRows = looksLikeHeader ? rows.slice(1) : rows
  const keys = looksLikeHeader ? keysByIndex : FALLBACK_KEYS

  return dataRows
    .map((cols) => {
      const card = {}
      keys.forEach((key, idx) => {
        card[key] = (cols[idx] ?? '').trim()
      })
      return card
    })
    .filter((c) => c.id) // 丢掉没有 ID 的脏行
}

/**
 * 加载卡牌库：优先尝试外部 CSV，失败则回退到内置示例数据。
 * @param {string} csvUrl  CSV 的可访问 URL（放在 public/ 下即可）
 * @param {Array} fallback 内置示例卡
 * @returns {Promise<{cards: Array, source: 'csv'|'sample', error?: string}>}
 */
export async function loadCards(csvUrl, fallback) {
  try {
    const res = await fetch(csvUrl, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const cards = parseCsv(text)
    if (cards.length === 0) throw new Error('CSV 解析结果为空')
    return { cards, source: 'csv' }
  } catch (err) {
    return { cards: fallback, source: 'sample', error: String(err.message || err) }
  }
}
