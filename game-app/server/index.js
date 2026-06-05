import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { GameManager, ACHIEVEMENTS } from './game.js'
import { DECK_LIST } from './decks.js'
import { generateCustomDeck, CUSTOM_MODELS, FAMILY_TEMPLATE } from './custom.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4001

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] }
})

const gm = new GameManager()
// 记录每个 socket 当前所在房间
const socketRoom = new Map()

app.set('trust proxy', true)
app.use(express.json({ limit: '8mb' }))

// 异议时上传的「真实反应」文件存放目录，并对外静态托管
const UPLOAD_DIR = join(__dirname, 'data', 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR))

const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }

// 真实反应上传：接收 dataURL（图片），落盘后返回可访问 url
app.post('/api/upload', (req, res) => {
  try {
    const { dataUrl } = req.body || {}
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '')
    if (!m) return res.status(400).json({ ok: false, error: '文件格式不支持' })
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ ok: false, error: '文件过大（上限 6MB）' })
    const ext = EXT_BY_MIME[m[1]] || 'bin'
    const name = `${Date.now()}-${randomBytes(3).toString('hex')}.${ext}`
    writeFileSync(join(UPLOAD_DIR, name), buf)
    res.json({ ok: true, url: `/uploads/${name}` })
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || '上传失败' })
  }
})

// 定制题库：返回可选模型 + 家庭情况模板
app.get('/api/custom-meta', (req, res) => {
  res.json({ models: CUSTOM_MODELS.map(({ key, label }) => ({ key, label })), template: FAMILY_TEMPLATE })
})

// 定制题库：调用 DeepSeek 生成专属牌库
app.post('/api/custom-deck', async (req, res) => {
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').trim()
  try {
    const { family, modelKey, nickname, gender } = req.body || {}
    const out = await generateCustomDeck({ family, modelKey, nickname, gender, ip })
    res.json({ ok: true, ...out })
  } catch (e) {
    console.warn('[custom-deck] 失败:', e.message)
    res.status(400).json({ ok: false, error: e.message || '生成失败' })
  }
})

// 生产环境：托管已构建的前端
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => res.sendFile(join(distDir, 'index.html')))
} else {
  app.get('/', (req, res) =>
    res.send('开发模式：请运行 vite（pnpm dev:client）访问前端，本服务仅处理 socket.io。')
  )
}

function broadcast(roomId) {
  const room = gm.getRoom(roomId)
  if (!room) return
  io.to(roomId).emit('roomState', gm.serialize(room))
}

io.on('connection', (socket) => {
  socket.emit('decks', DECK_LIST)
  socket.emit('achievements', ACHIEVEMENTS)

  function joinSocketToRoom(room) {
    socket.join(room.id)
    socketRoom.set(socket.id, room.id)
  }

  socket.on('createRoom', ({ nickname, deckKey, gender }, cb) => {
    const name = (nickname || '').trim().slice(0, 16) || '神秘观察员'
    const room = gm.createRoom(deckKey || 'highgrade')
    gm.addPlayer(room, socket.id, name, gender)
    joinSocketToRoom(room)
    cb && cb({ ok: true, roomId: room.id, youId: socket.id })
    broadcast(room.id)
  })

  socket.on('joinRoom', ({ roomId, nickname, gender }, cb) => {
    const room = gm.getRoom(roomId)
    if (!room) return cb && cb({ ok: false, error: '房间不存在，请检查房间号' })
    if (room.phase !== 'lobby') return cb && cb({ ok: false, error: '游戏已经开始，无法中途加入' })
    if (gm.connectedPlayers(room).length >= 8) return cb && cb({ ok: false, error: '房间已满（上限 8 人）' })
    const name = (nickname || '').trim().slice(0, 16) || '神秘观察员'
    gm.addPlayer(room, socket.id, name, gender)
    joinSocketToRoom(room)
    cb && cb({ ok: true, roomId: room.id, youId: socket.id })
    broadcast(room.id)
  })

  function withRoom(fn) {
    const roomId = socketRoom.get(socket.id)
    const room = roomId && gm.getRoom(roomId)
    if (room) fn(room)
  }

  socket.on('setDeck', ({ deckKey }) =>
    withRoom((room) => {
      if (room.hostId === socket.id && room.phase === 'lobby') {
        room.deckKey = deckKey
        broadcast(room.id)
      }
    })
  )

  socket.on('startGame', ({ deckKey, totalRounds }) =>
    withRoom((room) => {
      if (room.hostId === socket.id) {
        gm.start(room, { deckKey, totalRounds })
        broadcast(room.id)
      }
    })
  )

  socket.on('submitPick', (pick) =>
    withRoom((room) => {
      gm.submitPick(room, socket.id, pick || {})
      broadcast(room.id)
    })
  )

  socket.on('skipCard', () =>
    withRoom((room) => {
      gm.skipCard(room, socket.id)
      broadcast(room.id)
    })
  )

  socket.on('unlockPick', () =>
    withRoom((room) => {
      gm.unlockPick(room, socket.id)
      broadcast(room.id)
    })
  )

  socket.on('raiseObjection', ({ note, file } = {}) =>
    withRoom((room) => {
      gm.raiseObjection(room, socket.id, { note, file })
      broadcast(room.id)
    })
  )

  socket.on('nextRound', () =>
    withRoom((room) => {
      gm.next(room)
      broadcast(room.id)
    })
  )

  socket.on('restart', () =>
    withRoom((room) => {
      if (room.hostId === socket.id) {
        gm.restart(room)
        broadcast(room.id)
      }
    })
  )

  socket.on('leaveRoom', () =>
    withRoom((room) => {
      gm.removePlayer(room, socket.id)
      socket.leave(room.id)
      socketRoom.delete(socket.id)
      broadcast(room.id)
    })
  )

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id)
    if (!roomId) return
    const room = gm.getRoom(roomId)
    socketRoom.delete(socket.id)
    if (room) {
      gm.removePlayer(room, socket.id)
      broadcast(room.id)
    }
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  地球人观察日记 · 在线版服务已启动`)
  console.log(`  http://localhost:${PORT}  (生产) / vite http://localhost:5174 (开发)`)
  console.log(`  注意：端口可用 PORT 环境变量覆盖（默认 4001，避开微信占用的 3001）\n`)
})
