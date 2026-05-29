import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 客户端源码在 client/，构建产物输出到 game-app/dist，由 Node 服务端在生产环境托管。
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5174
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
