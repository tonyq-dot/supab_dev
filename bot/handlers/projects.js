const { supabase } = require('../lib/supabase')
const { requireLinked } = require('../lib/auth')

const WORKFLOW_LABELS = {
  preview: 'Превью',
  preproduction: 'Препродакшн',
  assembly: 'Сборка',
  final_stretch: 'Финальный отрезок',
  show: 'Шоу',
  stop: 'Стоп',
  awaiting_response: 'Ожидание ответа',
}

/**
 * /projects — list active projects
 * @param {import('telegraf').Telegraf} bot
 */
module.exports = (bot) => {
  bot.command('projects', async (ctx) => {
    ctx.session = {}
    if (!(await requireLinked(ctx))) return

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, name, workflow_status, global_deadline, pitch_deadline,
        project_types ( name ),
        clients ( name )
      `)
      .eq('status', 'Active')
      .order('name')

    if (error) {
      console.error('projects fetch error:', error)
      await ctx.reply('❌ Не удалось загрузить проекты. Попробуйте позже.')
      return
    }

    if (!projects || projects.length === 0) {
      await ctx.reply('Нет активных проектов.')
      return
    }

    const lines = projects.map((p, i) => {
      const status = p.workflow_status ? WORKFLOW_LABELS[p.workflow_status] ?? p.workflow_status : '—'
      const deadline = p.global_deadline ? `⏰ ${p.global_deadline}` : ''
      const pitch = p.pitch_deadline ? `🎯 питч ${p.pitch_deadline}` : ''
      const client = p.clients?.name ? `👤 ${p.clients.name}` : ''
      const type = p.project_types?.name ? `[${p.project_types.name}]` : ''
      const meta = [client, deadline, pitch].filter(Boolean).join('  ')
      return `*${i + 1}. ${p.name}* ${type}\nСтатус: ${status}${meta ? '\n' + meta : ''}`
    })

    const chunks = chunkArray(lines, 15)
    for (const chunk of chunks) {
      await ctx.reply(chunk.join('\n\n'), { parse_mode: 'Markdown' })
    }
  })
}

function chunkArray(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
