import { getDeck } from './decks.js'

// 四色反应（玩法A的「表层」——表现出来的行为）
export const COLORS = [
  { key: '红', name: '炸毛', emoji: '🔴', desc: '对抗、宣泄' },
  { key: '蓝', name: '讲理', emoji: '🔵', desc: '逻辑、争辩' },
  { key: '绿', name: '求抱', emoji: '🟢', desc: '示弱、共情' },
  { key: '黄', name: '躲开', emoji: '🟡', desc: '回避、转移' }
]

// 夫妻版「里层」——心里真正的需要/感受（玩法A·成人牌库用，从夫妻版题卡归纳）
export const NEEDS = [
  { key: 'care', emoji: '🫂', name: '想被在乎', desc: '被放在心上、被珍视' },
  { key: 'approve', emoji: '👏', name: '想被认可', desc: '我的付出和价值被看见、被肯定' },
  { key: 'under', emoji: '🫶', name: '想被理解', desc: '先懂我的感受，别急着评判或讲道理' },
  { key: 'space', emoji: '🚪', name: '想要空间', desc: '让我喘口气、别逼太紧、给点边界' },
  { key: 'fear', emoji: '😨', name: '怕失去你', desc: '怕你不要我了、关系上的不安' },
  { key: 'unfair', emoji: '⚖️', name: '觉得不公平', desc: '我付出更多或被冤枉，心里憋屈' },
  { key: 'guilt', emoji: '🙇', name: '我有点愧疚', desc: '知道自己做得不够，只是没说出口' },
  { key: 'tired', emoji: '🫠', name: '我就是累了', desc: '耗竭，没别的意思，别多想' },
  { key: 'lost', emoji: '😟', name: '我也慌', desc: '怕做错、不知道怎么办才好' },
  { key: 'close', emoji: '💗', name: '想更亲近你', desc: '想被你想要、想靠近你' },
  { key: 'middle', emoji: '😣', name: '夹在中间', desc: '在父母和你之间为难' },
  { key: 'warm', emoji: '🤍', name: '其实心里是暖的', desc: '底下是爱、是感激、是想靠近你' }
]

// 里层选项：成人牌库用「需要/感受」，孩子牌库沿用四色（第一类）
function innerSetFor(deckKey) {
  return deckKey === 'couples' ? NEEDS : COLORS
}

const ROUND_OPTIONS = [6, 8, 10, 12]

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混字符
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export class GameManager {
  constructor() {
    this.rooms = new Map()
  }

  createRoom(deckKey = 'highgrade') {
    let id
    do {
      id = makeRoomId()
    } while (this.rooms.has(id))
    const room = {
      id,
      hostId: null,
      deckKey,
      phase: 'lobby', // lobby | select | reveal | gameover
      players: new Map(), // socketId -> {id, nickname, isHost, connected, correct, sampleTimes}
      order: [], // 入座顺序（socketId）
      totalRounds: 8,
      round: 0, // 已结算轮数
      understanding: 0,
      failures: 0,
      target: 0,
      failCap: 0,
      items: [],
      drawIndex: 0,
      sampleCursor: -1,
      sampleId: null,
      current: null,
      picks: new Map(), // socketId -> { surface?, inner?, scene?, sentence }
      reveal: null,
      pendingEnd: null,
      result: null,
      diary: [], // 本局「观察日记」：每轮的表里与那句话
      log: []
    }
    this.rooms.set(id, room)
    return room
  }

  getRoom(id) {
    return this.rooms.get((id || '').toUpperCase())
  }

  addPlayer(room, socketId, nickname) {
    const isFirst = room.players.size === 0
    room.players.set(socketId, {
      id: socketId,
      nickname,
      isHost: isFirst,
      connected: true,
      correct: 0,
      sampleTimes: 0
    })
    if (isFirst) room.hostId = socketId
    if (!room.order.includes(socketId)) room.order.push(socketId)
  }

  connectedPlayers(room) {
    return room.order.map((id) => room.players.get(id)).filter((p) => p && p.connected)
  }

  removePlayer(room, socketId) {
    const p = room.players.get(socketId)
    if (!p) return
    p.connected = false
    // 重新指派房主
    if (room.hostId === socketId) {
      const next = this.connectedPlayers(room)[0]
      room.hostId = next ? next.id : null
      for (const pl of room.players.values()) pl.isHost = pl.id === room.hostId
    }
    // 若房间空了，删除
    if (this.connectedPlayers(room).length === 0) {
      this.rooms.delete(room.id)
      return
    }
    // 游戏进行中：若离开的人是样本或正等待他出牌，做相应处理
    if (room.phase === 'select') {
      if (room.sampleId === socketId) {
        // 样本掉线 -> 本轮重抽（换样本）
        this.beginRound(room, true)
      } else {
        room.picks.delete(socketId)
        this.maybeReveal(room)
      }
    }
  }

  log(room, text) {
    room.log.unshift({ t: Date.now(), text })
    if (room.log.length > 30) room.log.pop()
  }

  start(room, opts = {}) {
    if (room.phase !== 'lobby') return
    if (this.connectedPlayers(room).length < 2) return
    if (opts.deckKey) room.deckKey = opts.deckKey
    if (ROUND_OPTIONS.includes(opts.totalRounds)) room.totalRounds = opts.totalRounds
    const n = this.connectedPlayers(room).length
    room.target = 5 + 3 * (n - 1)
    room.failCap = n + 1
    room.understanding = 0
    room.failures = 0
    room.round = 0
    room.sampleCursor = -1
    room.pendingEnd = null
    room.result = null
    room.diary = []
    room.log = []
    const deck = getDeck(room.deckKey)
    room.items = shuffle(deck.items)
    room.drawIndex = 0
    for (const p of room.players.values()) {
      p.correct = 0
      p.sampleTimes = 0
    }
    this.log(room, `观测任务开始 · 牌库「${deck.label}」· 目标理解值 ${room.target} · 共 ${room.totalRounds} 轮`)
    this.beginRound(room, false)
  }

  drawItem(room) {
    if (room.drawIndex >= room.items.length) {
      room.items = shuffle(room.items)
      room.drawIndex = 0
    }
    return room.items[room.drawIndex++]
  }

  beginRound(room, keepSample) {
    const conn = this.connectedPlayers(room)
    if (conn.length < 2) {
      // 人不够，结束
      this.finish(room, 'abort')
      return
    }
    if (!keepSample) {
      // 选下一个样本（按入座顺序跳过掉线者）
      let guard = 0
      do {
        room.sampleCursor = (room.sampleCursor + 1) % room.order.length
        guard++
      } while (
        guard < room.order.length * 2 &&
        !(room.players.get(room.order[room.sampleCursor]) || {}).connected
      )
      room.sampleId = room.order[room.sampleCursor]
      const sp = room.players.get(room.sampleId)
      if (sp) sp.sampleTimes++
    }
    room.current = this.drawItem(room)
    room.picks = new Map()
    room.reveal = null
    room.phase = 'select'
  }

  skipCard(room, socketId) {
    if (room.phase !== 'select') return
    // 任何人可在出牌阶段跳过（主要用于红卡）
    this.log(room, `有人跳过了一张「${room.current.exposure}」卡，重新抽取`)
    room.current = this.drawItem(room)
    room.picks = new Map()
  }

  submitPick(room, socketId, pick = {}) {
    if (room.phase !== 'select') return
    const p = room.players.get(socketId)
    if (!p || !p.connected) return
    const isSample = room.sampleId === socketId
    const innerSet = innerSetFor(room.deckKey)
    const clean = { sentence: (pick.sentence || '').toString().trim().slice(0, 140) }
    if (room.current.kind === 'A') {
      // 里层：所有人都要给（样本=真实里层，观察员=猜测的里层）
      if (!innerSet.some((c) => c.key === pick.inner)) return
      clean.inner = pick.inner
      if (isSample) {
        // 样本还要给「表层」行为反应（四色）
        if (!COLORS.some((c) => c.key === pick.surface)) return
        clean.surface = pick.surface
      }
    } else {
      if (!room.current.scenes.some((s) => s.id === pick.scene)) return
      clean.scene = pick.scene
    }
    room.picks.set(socketId, clean)
    this.maybeReveal(room)
  }

  maybeReveal(room) {
    const conn = this.connectedPlayers(room)
    const allIn = conn.every((p) => room.picks.has(p.id))
    if (allIn && conn.length >= 2) this.doReveal(room)
  }

  doReveal(room) {
    const conn = this.connectedPlayers(room)
    const isA = room.current.kind === 'A'
    const samplePick = room.picks.get(room.sampleId) || {}
    // 玩法A猜「里层」，玩法B猜「场景」
    const truth = isA ? samplePick.inner : samplePick.scene
    const observers = conn.filter((p) => p.id !== room.sampleId)
    const correctIds = observers
      .filter((p) => {
        const pk = room.picks.get(p.id) || {}
        return (isA ? pk.inner : pk.scene) === truth
      })
      .map((p) => p.id)

    let delta = 0
    let allCorrect = false
    let noneCorrect = false
    if (observers.length > 0) {
      if (correctIds.length === 0) {
        delta = -1
        noneCorrect = true
        room.failures += 1
      } else {
        delta = correctIds.length
        if (correctIds.length === observers.length) {
          delta += 1
          allCorrect = true
        }
      }
    }
    room.understanding = Math.max(0, Math.min(20, room.understanding + delta))
    room.round += 1
    for (const id of correctIds) room.players.get(id).correct += 1

    const picks = {}
    for (const [id, c] of room.picks) picks[id] = c

    const innerSet = innerSetFor(room.deckKey)
    const labelInner = (k) => {
      const c = innerSet.find((x) => x.key === k)
      return c ? `${c.emoji} ${c.name}` : k || '—'
    }
    const labelColor = (k) => {
      const c = COLORS.find((x) => x.key === k)
      return c ? `${c.emoji} ${c.name}` : k || '—'
    }
    const labelScene = (id) => {
      const s = (room.current.scenes || []).find((x) => x.id === id)
      return s ? s.name : id || '—'
    }
    const sampleName = room.players.get(room.sampleId)?.nickname || '样本'
    const surfaceLabel = isA && samplePick.surface ? labelColor(samplePick.surface) : null
    const innerLabel = isA ? labelInner(truth) : labelScene(truth)
    const gap = !!(isA && samplePick.surface && samplePick.surface !== samplePick.inner)

    room.reveal = {
      kind: isA ? 'A' : 'B',
      truth,
      surfaceLabel,
      innerLabel,
      gap,
      sampleSentence: samplePick.sentence || '',
      picks,
      correctIds,
      delta,
      allCorrect,
      noneCorrect,
      curiosity:
        '翻牌后第一句话，先好奇、别辩解：「原来你会这样？能说说为什么吗？」'
    }

    // 记入本局「观察日记」
    room.diary.push({
      round: room.round,
      title: isA ? room.current.name : room.current.reactionName,
      prompt: isA ? room.current.question : room.current.reactionDesc,
      sampleName,
      surface: surfaceLabel,
      inner: innerLabel,
      gap,
      sentence: samplePick.sentence || '',
      guessed: correctIds.length > 0
    })
    if (noneCorrect) this.log(room, `第 ${room.round} 轮：没人猜中「${sampleName}」，理解值 −1`)
    else if (allCorrect) this.log(room, `第 ${room.round} 轮：全员猜中「${sampleName}」！理解值 +${delta}`)
    else this.log(room, `第 ${room.round} 轮：${correctIds.length} 人猜中「${sampleName}」，理解值 +${delta}`)

    // 判断结局
    if (room.understanding >= room.target) room.pendingEnd = 'win'
    else if (room.failures >= room.failCap) room.pendingEnd = 'lose'
    else if (room.round >= room.totalRounds) room.pendingEnd = 'draw'
    else room.pendingEnd = null

    room.phase = 'reveal'
  }

  next(room) {
    if (room.phase !== 'reveal') return
    if (room.pendingEnd) {
      this.finish(room, room.pendingEnd)
    } else {
      this.beginRound(room, false)
    }
  }

  finish(room, type) {
    // MVP：猜中次数最多的观察员
    let mvp = null
    for (const p of room.players.values()) {
      if (!mvp || p.correct > mvp.correct) mvp = p
    }
    // 平局评级
    let grade = null
    if (type === 'draw') {
      const r = room.understanding / room.target
      if (r < 0.5) grade = 'C · 数据严重缺失，建议重新观测'
      else if (room.target - room.understanding > 2) grade = 'B · 初步建立信号通道'
      else grade = 'A · 观测接近成功，再来一局'
    }
    room.result = {
      type, // win | lose | draw | abort
      understanding: room.understanding,
      target: room.target,
      failures: room.failures,
      failCap: room.failCap,
      rounds: room.round,
      grade,
      mvp: mvp ? { nickname: mvp.nickname, correct: mvp.correct } : null
    }
    room.phase = 'gameover'
    const msg =
      type === 'win'
        ? '🎉 合作胜利！观测任务圆满完成'
        : type === 'lose'
        ? '💔 样本情绪过载，任务终止'
        : type === 'abort'
        ? '观测中断（人数不足）'
        : `🔭 八轮观测结束 · 评级 ${grade}`
    this.log(room, msg)
  }

  restart(room) {
    room.phase = 'lobby'
    room.current = null
    room.reveal = null
    room.result = null
    room.pendingEnd = null
  }

  // 生成发给客户端的「脱敏」状态：select 阶段不暴露他人选择，只给"是否已提交"
  serialize(room) {
    const conn = this.connectedPlayers(room)
    return {
      roomId: room.id,
      phase: room.phase,
      deckKey: room.deckKey,
      hostId: room.hostId,
      totalRounds: room.totalRounds,
      round: room.round,
      understanding: room.understanding,
      failures: room.failures,
      target: room.target,
      failCap: room.failCap,
      sampleId: room.sampleId,
      colors: COLORS,
      innerSet: innerSetFor(room.deckKey),
      innerKind: room.deckKey === 'couples' ? 'needs' : 'colors',
      roundOptions: ROUND_OPTIONS,
      players: room.order
        .map((id) => room.players.get(id))
        .filter(Boolean)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          connected: p.connected,
          correct: p.correct,
          sampleTimes: p.sampleTimes,
          submitted: room.phase === 'select' ? room.picks.has(p.id) : false
        })),
      current:
        room.current && room.phase !== 'lobby' && room.phase !== 'gameover'
          ? room.current
          : null,
      reveal: room.phase === 'reveal' ? room.reveal : null,
      pendingEnd: room.pendingEnd,
      result: room.result,
      diary: room.phase === 'gameover' ? room.diary : null,
      log: room.log.slice(0, 12),
      connectedCount: conn.length
    }
  }
}
