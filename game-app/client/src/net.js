import { io } from 'socket.io-client'

// 开发模式下前端跑在 vite(5174)，需显式连到 socket 服务端(3001)；
// 生产模式下前端由 Node 服务端托管，连同源即可。
const URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined

export const socket = io(URL, { autoConnect: true })

export function emit(event, payload, cb) {
  socket.emit(event, payload, cb)
}
