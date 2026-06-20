// 定制题库：调用 DeepSeek 生成专属夫妻题，落盘记录 + 生成牌库文件。
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { registerDeck } from './decks.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DECK_DIR = join(DATA_DIR, 'custom-decks')
const RECORDS = join(DATA_DIR, 'records.jsonl')
mkdirSync(DECK_DIR, { recursive: true })

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
if (!DEEPSEEK_API_KEY) throw new Error('未设置环境变量 DEEPSEEK_API_KEY，定制题库功能无法使用')
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

// 用户可选的两个模型（标签 -> 实际 API model id）
export const CUSTOM_MODELS = [
  { key: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash（快·便宜）', model: 'deepseek-v4-flash' },
  { key: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro（强·更走心）', model: 'deepseek-v4-pro' }
]

// 给前端的家庭情况模板
export const FAMILY_TEMPLATE =
  '结婚/在一起年限：\n' +
  '有无孩子（几个/年龄）：\n' +
  '双方职业 / 谁更忙：\n' +
  '常见的小摩擦（家务/作息/花钱/手机/亲戚等）：\n' +
  '各自的小习惯或雷区：\n' +
  '最近想增进了解的方面：'

const EXPOSURES = ['绿', '黄', '红']
const ROLES = ['丈夫为样本', '妻子为样本', '双方皆可为样本']

function buildPrompt(family) {
  return (
    '你是一款双人桌游《地球人观察日记·夫妻版》的出题官。请基于下面这对夫妻的真实家庭情况，' +
    '生成一套贴合他们生活的「事件卡」题目，用于他们互相猜测对方在某情境下的真实内心反应。\n\n' +
    '【这对夫妻的情况】\n' +
    family +
    '\n\n【出题要求】\n' +
    '1. 共生成 30 张事件卡，覆盖家务、作息、金钱、手机、亲戚、情绪、亲密、育儿等不同主题。\n' +
    '2. description 用「外星人观测地球人」的冷幽默旁观口吻描写一个具体生活场景（60-120字），' +
    '把夫妻称为「雄性样本/雌性样本」，不要直接点明情绪。\n' +
    '3. question 是一句直接发问，格式如「【问丈夫】……你真实的反应是？」或「【问妻子】……」。\n' +
    '4. exposure 暴露度从「绿(轻松)/黄(略尴尬)/红(掏心窝)」三档里选，三档都要有，红色约占四分之一。\n' +
    '5. role 取值「丈夫为样本」「妻子为样本」「双方皆可为样本」，让问丈夫的题 role=丈夫为样本。\n' +
    '6. 题目要具体、扎心、贴合他们的真实情况，避免空泛套话。\n\n' +
    '只输出 JSON，格式：{"cards":[{"exposure":"黄","subtype":"家务","name":"卡名","description":"……","question":"【问丈夫】……","role":"丈夫为样本"}]}'
  )
}

async function callDeepSeek(model, family) {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位擅长婚姻关系与桌游设计的中文出题官，只输出合法 JSON。' },
        { role: 'user', content: buildPrompt(family) }
      ],
      temperature: 1.1,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek 接口错误 ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('模型返回的内容不是合法 JSON')
  }
  const cards = Array.isArray(parsed) ? parsed : parsed.cards
  if (!Array.isArray(cards) || cards.length === 0) throw new Error('模型没有返回任何题目')
  return cards
}

const csvCell = (v = '') => {
  const s = String(v).replace(/"/g, '""')
  return /[",\n\r]/.test(s) ? `"${s}"` : s
}

// 把模型返回的卡片数组规范化并编译成 CSV 文本
function toCsv(cards) {
  const header = '卡牌ID,卡牌类型,暴露度,子类,卡名,外星观测/场景描述,提问或归属,备注'
  const rows = cards
    .filter((c) => c && c.name && c.description && c.question)
    .map((c, i) => {
      const exposure = EXPOSURES.includes(c.exposure) ? c.exposure : '黄'
      const role = ROLES.includes(c.role) ? c.role : '双方皆可为样本'
      const id = `C-CUS-E${String(i + 1).padStart(2, '0')}`
      return [id, '事件卡', exposure, c.subtype || '生活', c.name, c.description, c.question, role]
        .map(csvCell)
        .join(',')
    })
  return { csv: [header, ...rows].join('\n'), count: rows.length }
}

export async function generateCustomDeck({ family, modelKey, nickname, gender, ip }) {
  const safeFamily = String(family || '').trim().slice(0, 2000)
  if (safeFamily.length < 10) throw new Error('请先填写家庭情况（至少写几句）')
  const picked = CUSTOM_MODELS.find((m) => m.key === modelKey) || CUSTOM_MODELS[0]

  const cards = await callDeepSeek(picked.model, safeFamily)
  const { csv, count } = toCsv(cards)
  if (count < 8) throw new Error('生成的有效题目太少，请补充家庭情况后重试')

  const deckKey = 'cus-' + randomBytes(4).toString('hex')
  const label = `定制版 · ${(nickname || '专属').slice(0, 8)}家`

  // 落盘：牌库 CSV
  writeFileSync(join(DECK_DIR, `${deckKey}.csv`), csv, 'utf8')
  // 注册进运行时牌库，供开房使用
  registerDeck({ key: deckKey, label, csv })

  // 结构化记录
  const record = {
    ts: new Date().toISOString(),
    ip: ip || '',
    nickname: nickname || '',
    gender: gender || '',
    model: picked.key,
    deckKey,
    label,
    cardCount: count,
    family: safeFamily
  }
  appendFileSync(RECORDS, JSON.stringify(record) + '\n', 'utf8')

  return { deckKey, label, count }
}
