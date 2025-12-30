<template>
  <div class="app">
    <canvas
      ref="canvas"
      class="canvas"
    ></canvas>

    <div class="title">
      <h1>2026</h1>
      <p>新年快乐</p>
    </div>

    <div class="countdown">
      <div class="countdown-item">
        <span class="countdown-number">{{ countdown.days }}</span>
        <span class="countdown-label">天</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">{{ countdown.hours }}</span>
        <span class="countdown-label">时</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">{{ countdown.minutes }}</span>
        <span class="countdown-label">分</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">{{ countdown.seconds }}</span>
        <span class="countdown-label">秒</span>
      </div>
    </div>

    <div class="input-container">
      <input
        v-model="inputText"
        @keyup.enter="launchTextFirework"
        type="text"
        class="transparent-input"
        placeholder="输入文字，按回车发射烟花..."
        maxlength="10"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const canvas = ref(null)
const inputText = ref('')
const countdown = ref({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
})
let countdownInterval = null
let randomFireworkInterval = null
let socket = null
let ctx = null
let animationId = null
let fireworks = []
let particles = []
let textParticles = []

const colors = [
  '#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff',
  '#0066ff', '#9900ff', '#ff00ff', '#ff0099', '#ff6600',
  '#00ff99', '#ffcc00', '#ff3366', '#66ffcc', '#cc99ff'
]

class Firework {
  constructor (x, y, targetY, color, isTextFirework = false, text = '') {
    this.x = x
    this.y = y
    this.targetY = targetY
    this.color = color
    this.speed = 8 + Math.random() * 4
    this.radius = 3
    this.trail = []
    this.isTextFirework = isTextFirework
    this.text = text
    this.exploded = false
  }

  update () {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 10) {
      this.trail.shift()
    }

    this.y -= this.speed
    this.speed *= 0.98

    if (this.y <= this.targetY || this.speed < 2) {
      this.explode()
      return false
    }
    return true
  }

  draw () {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()

    for (let i = 0; i < this.trail.length; i++) {
      const alpha = i / this.trail.length
      ctx.beginPath()
      ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * alpha, 0, Math.PI * 2)
      ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.fill()
    }
  }

  explode () {
    if (this.isTextFirework) {
      this.createTextExplosion()
    } else {
      this.createNormalExplosion()
    }
  }

  createNormalExplosion () {
    const particleCount = 80 + Math.random() * 40
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.2
      const speed = 2 + Math.random() * 6
      particles.push(new Particle(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        this.color
      ))
    }
  }

  createTextExplosion () {
    const fontSize = 100
    ctx.save()
    ctx.font = `${fontSize}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textWidth = ctx.measureText(this.text).width
    const textHeight = fontSize

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    tempCanvas.width = Math.ceil(textWidth) + 40
    tempCanvas.height = textHeight + 40
    tempCtx.font = `${fontSize}px Arial`
    tempCtx.fillStyle = '#ffffff'
    tempCtx.textAlign = 'center'
    tempCtx.textBaseline = 'middle'
    tempCtx.fillText(this.text, tempCanvas.width / 2, tempCanvas.height / 2)

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const data = imageData.data

    const step = 3
    for (let y = 0; y < tempCanvas.height; y += step) {
      for (let x = 0; x < tempCanvas.width; x += step) {
        const index = (y * tempCanvas.width + x) * 4
        if (data[index + 3] > 100) {
          const offsetX = x - tempCanvas.width / 2
          const offsetY = y - tempCanvas.height / 2
          const targetX = this.x + offsetX
          const targetY = this.y + offsetY
          const startX = this.x + (Math.random() - 0.5) * 300
          const startY = this.y + (Math.random() - 0.5) * 300
          textParticles.push(new TextParticle(
            startX,
            startY,
            targetX,
            targetY,
            this.color,
            Math.random() * 2 + 1.5
          ))
        }
      }
    }
    ctx.restore()
  }
}

class Particle {
  constructor (x, y, vx, vy, color) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.alpha = 1
    this.decay = 0.015 + Math.random() * 0.01
    this.gravity = 0.05
    this.radius = 2 + Math.random() * 2
  }

  update () {
    this.x += this.vx
    this.y += this.vy
    this.vy += this.gravity
    this.vx *= 0.98
    this.vy *= 0.98
    this.alpha -= this.decay
    return this.alpha > 0
  }

  draw () {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color + Math.floor(this.alpha * 255).toString(16).padStart(2, '0')
    ctx.fill()
  }
}

class TextParticle {
  constructor (x, y, targetX, targetY, color, size) {
    this.x = x
    this.y = y
    this.targetX = targetX
    this.targetY = targetY
    this.color = color
    this.size = size
    this.alpha = 1
    this.life = 0
    this.maxLife = 180 + Math.random() * 60
  }

  update () {
    this.life++

    const progress = this.life / this.maxLife

    if (progress < 0.4) {
      const easeProgress = progress / 0.4
      const eased = easeOutCubic(easeProgress)
      this.x = this.x + (this.targetX - this.x) * eased * 0.1
      this.y = this.y + (this.targetY - this.y) * eased * 0.1
    } else if (progress < 0.7) {
      this.x = this.targetX + (Math.random() - 0.5) * 2
      this.y = this.targetY + (Math.random() - 0.5) * 2
    } else {
      this.alpha -= 0.03
    }

    return this.alpha > 0
  }

  draw () {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = this.color + Math.floor(this.alpha * 255).toString(16).padStart(2, '0')
    ctx.fill()
  }
}

function easeOutCubic (t) {
  return 1 - Math.pow(1 - t, 3)
}

function updateCountdown () {
  const now = new Date()
  const newYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0)
  const diff = newYear - now

  if (diff > 0) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    countdown.value.days = days.toString().padStart(2, '0')
    countdown.value.hours = hours.toString().padStart(2, '0')
    countdown.value.minutes = minutes.toString().padStart(2, '0')
    countdown.value.seconds = seconds.toString().padStart(2, '0')
  } else {
    countdown.value.days = '00'
    countdown.value.hours = '00'
    countdown.value.minutes = '00'
    countdown.value.seconds = '00'
  }
}

function resizeCanvas () {
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
}

function launchRandomFirework () {
  const x = Math.random() * canvas.value.width
  const targetY = canvas.value.height * 0.2 + Math.random() * canvas.value.height * 0.3
  const color = colors[Math.floor(Math.random() * colors.length)]
  fireworks.push(new Firework(x, canvas.value.height, targetY, color))
}

function launchTextFirework () {
  if (!inputText.value.trim()) return

  if (inputText.value.length > 10) {
    alert('文字不能超过10个字')
    return
  }

  const x = Math.random() * canvas.value.width * 0.6 + canvas.value.width * 0.2
  const targetY = canvas.value.height * 0.2 + Math.random() * canvas.value.height * 0.3
  const color = colors[Math.floor(Math.random() * colors.length)]
  fireworks.push(new Firework(x, canvas.value.height, targetY, color, true, inputText.value))

  if (socket) {
    socket.emit('firework-text', {
      text: inputText.value,
      x: x,
      targetY: targetY,
      color: color
    })
  }

  inputText.value = ''
}

function launchRemoteFirework (data) {
  fireworks.push(new Firework(data.x, canvas.value.height, data.targetY, data.color, true, data.text))
}

function playHistoryFireworks (history) {
  history.forEach((item, index) => {
    setTimeout(() => {
      fireworks.push(new Firework(item.x, canvas.value.height, item.targetY, item.color, true, item.text))
    }, index * 500)
  })
}

function requestRandomFirework () {
  if (socket) {
    socket.emit('get-random-firework')
  }
}

function scheduleNextRandomFirework () {
  const randomDelay = Math.random() * 20000 + 10000
  randomFireworkInterval = setTimeout(() => {
    requestRandomFirework()
    scheduleNextRandomFirework()
  }, randomDelay)
}

function animate () {
  ctx.fillStyle = 'rgba(10, 10, 26, 0.2)'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

  fireworks = fireworks.filter(firework => {
    firework.draw()
    return firework.update()
  })

  particles = particles.filter(particle => {
    particle.draw()
    return particle.update()
  })

  textParticles = textParticles.filter(particle => {
    particle.draw()
    return particle.update()
  })

  if (Math.random() < 0.03) {
    launchRandomFirework()
  }

  animationId = requestAnimationFrame(animate)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  animate()
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)

  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    console.log('已连接到服务器')
    socket.emit('get-history')
    scheduleNextRandomFirework()
  })

  socket.on('firework-text', (data) => {
    launchRemoteFirework(data)
  })

  socket.on('history', (history) => {
    playHistoryFireworks(history)
  })

  socket.on('random-firework', (data) => {
    fireworks.push(new Firework(data.x, canvas.value.height, data.targetY, data.color, true, data.text))
  })

  socket.on('disconnect', () => {
    console.log('与服务器断开连接')
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(animationId)
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  if (randomFireworkInterval) {
    clearTimeout(randomFireworkInterval)
  }
  if (socket) {
    socket.disconnect()
  }
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.title {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  pointer-events: none;
}

.title h1 {
  font-size: 120px;
  font-weight: bold;
  background: linear-gradient(
    45deg,
    #ff6b6b,
    #ffd93d,
    #6bcb77,
    #4d96ff,
    #ff6b6b
  );
  background-size: 400% 400%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gradient 3s ease infinite;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

.title p {
  font-size: 36px;
  color: #ffffff;
  margin-top: 10px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  letter-spacing: 10px;
}

.countdown {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 30px;
  z-index: 10;
  pointer-events: none;
}

.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.countdown-number {
  font-size: 48px;
  font-weight: bold;
  color: #ffffff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
  min-width: 80px;
  text-align: center;
}

.countdown-label {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 5px;
  letter-spacing: 2px;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.input-container {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.transparent-input {
  width: 400px;
  padding: 15px 25px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  color: #ffffff;
  text-align: center;
  outline: none;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.transparent-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.transparent-input:focus {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .title {
    top: 10%;
  }

  .title h1 {
    font-size: 60px;
  }

  .title p {
    font-size: 20px;
    letter-spacing: 5px;
  }

  .countdown {
    top: 45%;
    gap: 15px;
  }

  .countdown-number {
    font-size: 28px;
    min-width: 50px;
  }

  .countdown-label {
    font-size: 12px;
  }

  .input-container {
    bottom: 10%;
    width: 90%;
    left: 50%;
    transform: translateX(-50%);
  }

  .transparent-input {
    width: 100%;
    padding: 12px 20px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .title h1 {
    font-size: 48px;
  }

  .title p {
    font-size: 16px;
  }

  .countdown {
    top: 40%;
    gap: 10px;
  }

  .countdown-number {
    font-size: 24px;
    min-width: 40px;
  }

  .countdown-label {
    font-size: 10px;
  }

  .input-container {
    bottom: 8%;
  }

  .transparent-input {
    padding: 10px 15px;
    font-size: 14px;
  }
}
</style>
