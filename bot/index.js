require('dotenv').config()

const { Telegraf, session } = require('telegraf')

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// Session middleware — keeps wizard state between messages
bot.use(session({ defaultSession: () => ({}) }))

// Logging middleware
bot.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log(`[${ctx.updateType}] ${ctx.from?.username ?? ctx.from?.id} — ${Date.now() - start}ms`)
})

// Register handlers
require('./handlers/commands')(bot)
require('./handlers/auth')(bot)
require('./handlers/projects')(bot)
require('./handlers/work')(bot)

// Global error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => {})
})

// Graceful shutdown
const stop = (signal) => {
  console.log(`${signal} — stopping bot...`)
  bot.stop(signal)
  process.exit(0)
}
process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))

// Start long-polling
bot.launch().then(() => {
  console.log('KPI bot started (long-polling)')
})
