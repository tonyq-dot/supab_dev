const { supabase } = require('../lib/supabase')
const { getUserByTelegramId, getDisplayName } = require('../lib/auth')

/**
 * /link <token> — link Telegram account to Supabase user
 * /status       — show current quarter KPI
 * @param {import('telegraf').Telegraf} bot
 */
module.exports = (bot) => {
  // /link ABC123
  bot.command('link', async (ctx) => {
    ctx.session = {}
    const parts = ctx.message.text.trim().split(/\s+/)
    const token = parts[1]

    if (!token) {
      await ctx.reply(
        '⚠️ Укажите код: `/link ВАШ_КОД`\n\n' +
        'Код можно получить на странице Профиль в веб-приложении.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Check if already linked
    const existingUserId = await getUserByTelegramId(ctx.from.id)
    if (existingUserId) {
      const name = await getDisplayName(existingUserId)
      await ctx.reply(`✅ Ваш аккаунт уже привязан (${name}). Ничего не изменилось.`)
      return
    }

    // Validate token and check expiry
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('telegram_link_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (tokenErr || !tokenRow) {
      await ctx.reply('❌ Код не найден. Сгенерируйте новый в профиле веб-приложения.')
      return
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      await ctx.reply('⏰ Срок кода истёк. Сгенерируйте новый в профиле веб-приложения.')
      // Clean up expired token
      await supabase.from('telegram_link_tokens').delete().eq('token', token)
      return
    }

    // Check if this Supabase user already linked another Telegram account
    const { data: existingLink } = await supabase
      .from('telegram_links')
      .select('telegram_id')
      .eq('user_id', tokenRow.user_id)
      .maybeSingle()

    if (existingLink) {
      // Update the existing link to new Telegram ID
      await supabase
        .from('telegram_links')
        .update({ telegram_id: ctx.from.id, linked_at: new Date().toISOString() })
        .eq('user_id', tokenRow.user_id)
    } else {
      // Create new link
      const { error: insertErr } = await supabase.from('telegram_links').insert({
        telegram_id: ctx.from.id,
        user_id: tokenRow.user_id,
      })
      if (insertErr) {
        console.error('telegram_links insert error:', insertErr)
        await ctx.reply('❌ Не удалось привязать аккаунт. Попробуйте позже.')
        return
      }
    }

    // Consume the token
    await supabase.from('telegram_link_tokens').delete().eq('token', token)

    const name = await getDisplayName(tokenRow.user_id)
    await ctx.reply(
      `✅ Аккаунт привязан!\n\nДобро пожаловать, *${name}*.\n\n` +
      'Теперь вы можете использовать:\n' +
      '/status — мой KPI\n' +
      '/projects — проекты\n' +
      '/addwork — добавить работу',
      { parse_mode: 'Markdown' }
    )
  })

  // /status — current quarter KPI
  bot.command('status', async (ctx) => {
    ctx.session = {}
    const userId = await getUserByTelegramId(ctx.from.id)
    if (!userId) {
      await ctx.reply(
        '⛔ Аккаунт не привязан.\n\nПолучите код в профиле веб-приложения и отправьте `/link КОД`.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const now = new Date()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0)

    const startStr = quarterStart.toISOString().slice(0, 10)
    const endStr = quarterEnd.toISOString().slice(0, 10)

    // Fetch points via the DB function
    const { data: pointsData, error: pointsErr } = await supabase.rpc('get_user_points', {
      p_user_id: userId,
      p_start_date: startStr,
      p_end_date: endStr,
    })

    if (pointsErr) {
      console.error('get_user_points error:', pointsErr)
      await ctx.reply('❌ Не удалось получить данные. Попробуйте позже.')
      return
    }

    // Fetch period norm
    const periodName = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
    const { data: periodData } = await supabase
      .from('period_configs')
      .select('norm_points, company_profit_coef_q1')
      .ilike('period_name', `%${now.getFullYear()}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const totalPoints = Number(pointsData ?? 0)
    const norm = periodData?.norm_points ?? 500
    const progress = norm > 0 ? Math.round((totalPoints / norm) * 100) : 0

    const name = await getDisplayName(userId)
    const bar = buildProgressBar(progress)

    await ctx.reply(
      `*KPI — ${name}*\n\n` +
      `Квартал: *${periodName}*\n` +
      `${startStr} — ${endStr}\n\n` +
      `Баллы: *${totalPoints.toFixed(1)}* / ${norm}\n` +
      `Прогресс: ${bar} ${progress}%\n\n` +
      (progress >= 100
        ? '🏆 Норма выполнена!'
        : `До нормы: *${Math.max(0, norm - totalPoints).toFixed(1)}* баллов`),
      { parse_mode: 'Markdown' }
    )
  })
}

/** Build a simple 10-cell progress bar string */
function buildProgressBar(percent) {
  const filled = Math.min(10, Math.round(percent / 10))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}
