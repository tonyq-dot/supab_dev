const { supabase } = require('../lib/supabase')
const { requireLinked, getUserByTelegramId } = require('../lib/auth')

// Wizard steps
const STEP = {
  PROJECT: 'project',
  WORK_TYPE: 'work_type',
  QUANTITY: 'quantity',
  DATE: 'date',
  CONFIRM: 'confirm',
}

/**
 * /addwork — multi-step wizard to log work
 * /myworks  — list last 10 entries
 * @param {import('telegraf').Telegraf} bot
 */
module.exports = (bot) => {
  // --- /addwork: start wizard ---
  bot.command('addwork', async (ctx) => {
    const userId = await requireLinked(ctx)
    if (!userId) return

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'Active')
      .order('name')

    if (error || !projects?.length) {
      await ctx.reply('Нет активных проектов. Обратитесь к менеджеру.')
      return
    }

    ctx.session = {
      step: STEP.PROJECT,
      userId,
      projects,
    }

    await ctx.reply(
      '*Добавить работу — шаг 1/4*\n\nВыберите проект (введите номер):',
      {
        parse_mode: 'Markdown',
        reply_markup: buildNumberedKeyboard(projects.map((p) => p.name)),
      }
    )
  })

  // --- /myworks ---
  bot.command('myworks', async (ctx) => {
    ctx.session = {}
    const userId = await requireLinked(ctx)
    if (!userId) return

    const { data: logs, error } = await supabase
      .from('detailed_scores')
      .select('date, project_name, work_type_name, quantity, score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10)

    if (error) {
      console.error('myworks fetch error:', error)
      await ctx.reply('❌ Не удалось загрузить записи. Попробуйте позже.')
      return
    }

    if (!logs?.length) {
      await ctx.reply('У вас ещё нет записей о работах.')
      return
    }

    const lines = logs.map((l, i) => {
      const score = Number(l.score ?? 0).toFixed(1)
      return `*${i + 1}.* ${l.date} — ${l.project_name}\n   ${l.work_type_name} × ${l.quantity} = *${score} б.*`
    })

    await ctx.reply(
      '*Последние 10 записей:*\n\n' + lines.join('\n\n'),
      { parse_mode: 'Markdown' }
    )
  })

  // --- Wizard: handle text input step-by-step ---
  bot.on('text', async (ctx, next) => {
    const session = ctx.session
    if (!session?.step) return next()

    const text = ctx.message.text.trim()

    // Allow /cancel mid-wizard (handled by commands.js, but catch here for safety)
    if (text.startsWith('/')) return next()

    switch (session.step) {
      case STEP.PROJECT:
        return handleProjectStep(ctx, text)
      case STEP.WORK_TYPE:
        return handleWorkTypeStep(ctx, text)
      case STEP.QUANTITY:
        return handleQuantityStep(ctx, text)
      case STEP.DATE:
        return handleDateStep(ctx, text)
      case STEP.CONFIRM:
        return handleConfirmStep(ctx, text)
      default:
        return next()
    }
  })

  // --- Step handlers ---

  async function handleProjectStep(ctx, text) {
    const { projects } = ctx.session
    const idx = parseChoice(text, projects.length)
    if (idx === null) {
      await ctx.reply(`Введите число от 1 до ${projects.length}.`)
      return
    }
    const project = projects[idx]
    ctx.session.projectId = project.id
    ctx.session.projectName = project.name

    const { data: workTypes, error } = await supabase
      .from('work_types')
      .select('id, name, base_value')
      .order('name')

    if (error || !workTypes?.length) {
      await ctx.reply('❌ Не удалось загрузить типы работ. Попробуйте позже.')
      ctx.session = {}
      return
    }

    ctx.session.workTypes = workTypes
    ctx.session.step = STEP.WORK_TYPE

    await ctx.reply(
      `Проект: *${project.name}*\n\n*Шаг 2/4* — Тип работы:`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildNumberedKeyboard(workTypes.map((w) => `${w.name} (${w.base_value} б/ед)`)),
      }
    )
  }

  async function handleWorkTypeStep(ctx, text) {
    const { workTypes, projectName } = ctx.session
    const idx = parseChoice(text, workTypes.length)
    if (idx === null) {
      await ctx.reply(`Введите число от 1 до ${workTypes.length}.`)
      return
    }
    const wt = workTypes[idx]
    ctx.session.workTypeId = wt.id
    ctx.session.workTypeName = wt.name
    ctx.session.step = STEP.QUANTITY

    await ctx.reply(
      `Тип: *${wt.name}*\n\n*Шаг 3/4* — Введите количество единиц (целое число > 0):`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    )
  }

  async function handleQuantityStep(ctx, text) {
    const qty = parseInt(text, 10)
    if (!Number.isInteger(qty) || qty <= 0) {
      await ctx.reply('Введите целое положительное число.')
      return
    }
    ctx.session.quantity = qty
    ctx.session.step = STEP.DATE

    const today = new Date().toISOString().slice(0, 10)
    await ctx.reply(
      `Количество: *${qty}*\n\n*Шаг 4/4* — Дата работы (ГГГГ-ММ-ДД):\n\nСегодня — нажмите кнопку или введите свою дату.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: today }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    )
  }

  async function handleDateStep(ctx, text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || isNaN(Date.parse(text))) {
      await ctx.reply('Формат даты: ГГГГ-ММ-ДД (например 2025-03-15).')
      return
    }
    ctx.session.date = text
    ctx.session.step = STEP.CONFIRM

    const { projectName, workTypeName, quantity, date } = ctx.session

    await ctx.reply(
      '*Подтвердите запись:*\n\n' +
      `📁 Проект: *${projectName}*\n` +
      `🔧 Тип: *${workTypeName}*\n` +
      `🔢 Количество: *${quantity}*\n` +
      `📅 Дата: *${date}*\n\n` +
      'Введите *да* для сохранения или *нет* для отмены.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: 'да' }, { text: 'нет' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    )
  }

  async function handleConfirmStep(ctx, text) {
    const normalized = text.toLowerCase()
    if (normalized !== 'да' && normalized !== 'нет') {
      await ctx.reply('Введите *да* или *нет*.', { parse_mode: 'Markdown' })
      return
    }

    if (normalized === 'нет') {
      ctx.session = {}
      await ctx.reply('Отменено. Используйте /addwork чтобы начать заново.', {
        reply_markup: { remove_keyboard: true },
      })
      return
    }

    const { userId, projectId, workTypeId, quantity, date } = ctx.session

    const { error } = await supabase.from('work_logs').insert({
      user_id: userId,
      project_id: projectId,
      work_type_id: workTypeId,
      quantity,
      date,
    })

    ctx.session = {}

    if (error) {
      console.error('work_logs insert error:', error)
      await ctx.reply('❌ Не удалось сохранить запись. Попробуйте позже.', {
        reply_markup: { remove_keyboard: true },
      })
      return
    }

    await ctx.reply(
      '✅ Работа записана! Используйте /status чтобы посмотреть KPI или /addwork чтобы добавить ещё.',
      { reply_markup: { remove_keyboard: true } }
    )
  }
}

// --- Helpers ---

/**
 * Parse "1", "2", etc. into 0-based index.
 * Returns null if invalid.
 */
function parseChoice(text, maxCount) {
  const n = parseInt(text, 10)
  if (!Number.isInteger(n) || n < 1 || n > maxCount) return null
  return n - 1
}

/**
 * Build a Telegram reply keyboard with numbered rows.
 * Groups into rows of 2 to keep it tidy.
 */
function buildNumberedKeyboard(labels) {
  const buttons = labels.map((label, i) => ({ text: `${i + 1}. ${label}` }))
  const rows = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2))
  }
  return {
    keyboard: rows,
    resize_keyboard: true,
    one_time_keyboard: true,
  }
}
