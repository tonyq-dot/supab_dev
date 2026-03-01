/**
 * /start, /help, /cancel — general commands
 * @param {import('telegraf').Telegraf} bot
 */
module.exports = (bot) => {
  const HELP_TEXT =
    '*Команды KPI-бота:*\n\n' +
    '/start — приветствие\n' +
    '/help — список команд\n' +
    '/link `КОД` — привязать Telegram к аккаунту\n' +
    '/status — мой KPI за текущий квартал\n' +
    '/projects — список активных проектов\n' +
    '/addwork — добавить работу (мастер)\n' +
    '/myworks — мои последние записи\n' +
    '/cancel — отменить текущее действие'

  bot.command('start', async (ctx) => {
    ctx.session = {}
    await ctx.reply(
      'Привет! Я KPI-бот студии анимации. 🎬\n\n' +
      'Я помогу добавлять работы, смотреть статус и проекты прямо из Telegram.\n\n' +
      HELP_TEXT,
      { parse_mode: 'Markdown' }
    )
  })

  bot.command('help', async (ctx) => {
    ctx.session = {}
    await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown' })
  })

  bot.command('cancel', async (ctx) => {
    const wasActive = ctx.session && Object.keys(ctx.session).length > 0
    ctx.session = {}
    await ctx.reply(
      wasActive
        ? '✅ Действие отменено. Используйте /help для списка команд.'
        : 'Нет активного действия. Используйте /help для списка команд.'
    )
  })
}
