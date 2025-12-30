const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'fireworks.db')

async function initDatabase () {
  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('数据库已加载，现有记录数:', getFireworksCount())
  } else {
    db = new SQL.Database()
    db.run(`
      CREATE TABLE IF NOT EXISTS fireworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        x REAL NOT NULL,
        targetY REAL NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      )
    `)
    saveDatabase()
    console.log('数据库已创建')
  }
}

function getFireworksCount () {
  const result = db.exec('SELECT COUNT(*) as count FROM fireworks')
  return result[0].values[0][0]
}

function saveDatabase () {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function addFirework (text, x, targetY, color) {
  const createdAt = Date.now()
  db.run(
    'INSERT INTO fireworks (text, x, targetY, color, createdAt) VALUES (?, ?, ?, ?, ?)',
    [text, x, targetY, color, createdAt]
  )
  saveDatabase()
}

function getRecentFireworks (limit = 50) {
  const result = db.exec(`
    SELECT text, x, targetY, color 
    FROM fireworks 
    ORDER BY createdAt DESC 
    LIMIT ?
  `, [limit])

  if (result.length === 0) return []

  return result[0].values.map(row => ({
    text: row[0],
    x: row[1],
    targetY: row[2],
    color: row[3]
  }))
}

function getRandomFirework () {
  const countResult = db.exec('SELECT COUNT(*) as count FROM fireworks WHERE LENGTH(text) <= 10')
  if (countResult.length === 0 || countResult[0].values[0][0] === 0) {
    return null
  }

  const count = countResult[0].values[0][0]
  const randomOffset = Math.floor(Math.random() * count)

  const result = db.exec(`
    SELECT text, x, targetY, color 
    FROM fireworks 
    WHERE LENGTH(text) <= 10
    LIMIT 1 OFFSET ?
  `, [randomOffset])

  if (result.length === 0) return null

  const row = result[0].values[0]
  return {
    text: row[0],
    x: row[1],
    targetY: row[2],
    color: row[3]
  }
}

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id)

  socket.on('firework-text', (data) => {
    if (data.text.length > 10) {
      console.log('拒绝超长文字:', data.text)
      return
    }
    console.log('收到烟花文字:', data.text)
    addFirework(data.text, data.x, data.targetY, data.color)
    socket.broadcast.emit('firework-text', data)
  })

  socket.on('get-history', () => {
    const history = getRecentFireworks(50)
    socket.emit('history', history)
    console.log('发送历史记录，数量:', history.length)
  })

  socket.on('get-random-firework', () => {
    const firework = getRandomFirework()
    if (firework) {
      socket.emit('random-firework', firework)
    }
  })

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id)
  })
})

const PORT = process.env.PORT || 3000

async function startServer () {
  await initDatabase()
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
}

startServer()
