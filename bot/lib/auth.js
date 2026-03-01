const { supabase } = require('./supabase')

/**
 * Look up the Supabase user_id linked to a Telegram ID.
 * Returns null if not linked.
 * @param {number} telegramId
 * @returns {Promise<string|null>}
 */
async function getUserByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from('telegram_links')
    .select('user_id')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (error) {
    console.error('getUserByTelegramId error:', error.message)
    return null
  }
  return data?.user_id ?? null
}

/**
 * Require the Telegram user to be linked. Replies with an error message
 * and returns null if not linked.
 * @param {import('telegraf').Context} ctx
 * @returns {Promise<string|null>} user_id or null
 */
async function requireLinked(ctx) {
  const userId = await getUserByTelegramId(ctx.from.id)
  if (!userId) {
    const botUsername = process.env.BOT_USERNAME || 'this bot'
    await ctx.reply(
      '⛔ Ваш аккаунт Telegram не привязан к системе.\n\n' +
      'Откройте профиль в веб-приложении, сгенерируйте код и отправьте боту:\n' +
      '`/link ВАSH_КОД`',
      { parse_mode: 'Markdown' }
    )
    return null
  }
  return userId
}

/**
 * Fetch the display_name (or nickname / email fallback) for a user.
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getDisplayName(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, nickname')
    .eq('user_id', userId)
    .maybeSingle()

  if (data?.display_name) return data.display_name
  if (data?.nickname) return data.nickname
  return 'Аниматор'
}

module.exports = { getUserByTelegramId, requireLinked, getDisplayName }
