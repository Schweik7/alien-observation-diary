import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { GameManager } from './game.js'
import { DECK_LIST } from './decks.js'

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

  function joinSocketToRoom(room) {
    socket.join(room.id)
    socketRoom.set(socket.id, room.id)
  }

  socket.on('createRoom', ({ nickname, deckKey }, cb) => {
    const name = (nickname || '').trim().slice(0, 16) || '神秘观察员'
    const room = gm.createRoom(deckKey || 'highgrade')
    gm.addPlayer(room, socket.id, name)
    joinSocketToRoom(room)
    cb && cb({ ok: true, roomId: room.id, youId: socket.id })
    broadcast(room.id)
  })

  socket.on('joinRoom', ({ roomId, nickname }, cb) => {
    const room = gm.getRoom(roomId)
    if (!room) return cb && cb({ ok: false, error: '房间不存在，请检查房间号' })
    if (room.phase !== 'lobby') return cb && cb({ ok: false, error: '游戏已经开始，无法中途加入' })
    if (gm.connectedPlayers(room).length >= 8) return cb && cb({ ok: false, error: '房间已满（上限 8 人）' })
    const name = (nickname || '').trim().slice(0, 16) || '神秘观察员'
    gm.addPlayer(room, socket.id, name)
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

httpServer.listen(PORT, () => {
  console.log(`\n  地球人观察日记 · 在线版服务已启动`)
  console.log(`  http://localhost:${PORT}  (生产) / vite http://localhost:5174 (开发)`)
  console.log(`  注意：端口可用 PORT 环境变量覆盖（默认 4001，避开微信占用的 3001）\n`)
})
