import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openAiKey = Deno.env.get('OPENAI_API_KEY')

console.log(`Function "telegram-bot" up and running!`)

const MAIN_MENU_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Моя статистика" }, { text: "📝 Последние работы" }],
    [{ text: "⚙️ Профиль" }]
  ],
  resize_keyboard: true,
  persistent_keyboard: true
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    if (req.method === 'GET') {
      return new Response("Telegram Bot Webhook is active")
    }

    if (req.method !== 'POST') {
      return new Response("Method Not Allowed", { status: 405 })
    }

    const payload = await req.json()
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Log incoming update
    await logToDb(supabase, 'info', 'Incoming update', payload)

    // 1. Handle Database Webhook (Notification)
    if (payload.type === 'INSERT' && payload.table === 'work_logs') {
      // ... existing logic ...
      return new Response("OK")
    }

    // 2. Handle Telegram Update
    const update = payload
    
    // Handle Callback Query (Project Selection)
    if (update.callback_query) {
      const query = update.callback_query
      const chatId = query.message.chat.id
      const data = query.data

      if (data.startsWith('select_project:')) {
        const projectId = data.split(':')[1]
        await handleProjectSelection(supabase, chatId, projectId, query.id)
      } else if (data.startsWith('summary_project:')) {
        const projectId = data.split(':')[1]
        await handleProjectSummary(supabase, chatId, projectId, query.id)
      }

      return new Response("OK")
    }

    // Handle Message
    if (update.message) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const photo = update.message.photo
      const document = update.message.document
      const caption = update.message.caption
      const username = update.message.from.username
      const firstName = update.message.from.first_name

      // Check if user is linked
      const { data: linkData } = await supabase.from('telegram_links').select('user_id').eq('telegram_id', chatId).single()
      
      // Handle /start and /link (auth)
      if (text && (text.startsWith('/start') || text.startsWith('/link'))) {
         await handleAuth(supabase, chatId, text, username, firstName)
         return new Response("OK")
      }

      if (!linkData) {
         await sendMessage(chatId, "Ваш аккаунт не привязан. Используйте ссылку из приложения.")
         return new Response("OK")
      }

      // Handle Image/Document Upload
      if (photo || document) {
        const fileId = photo ? photo[photo.length - 1].file_id : document.file_id
        const fileUniqueId = photo ? photo[photo.length - 1].file_unique_id : document.file_unique_id
        
        // Save to pending
        await supabase.from('telegram_pending_uploads').insert({
          telegram_chat_id: chatId,
          file_id: fileId,
          file_unique_id: fileUniqueId,
          caption: caption || text, // text might be caption if it's a media message? No, caption is separate.
          media_group_id: update.message.media_group_id
        })

        // Ask for project (only if not already asked recently? For now, always ask)
        // We'll fetch active projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'Active')
          .order('created_at', { ascending: false })
          .limit(10)

        if (projects && projects.length > 0) {
          const keyboard = {
            inline_keyboard: projects.map(p => [{ text: p.name, callback_data: `select_project:${p.id}` }])
          }
          await sendMessage(chatId, "📸 Изображение получено. Выберите проект для сохранения:", keyboard)
        } else {
          await sendMessage(chatId, "Нет активных проектов.")
        }
        return new Response("OK")
      }

      // Handle Commands
      if (text === '/summary') {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'Active')
          .order('created_at', { ascending: false })
          .limit(10)

        if (projects && projects.length > 0) {
          const keyboard = {
            inline_keyboard: projects.map(p => [{ text: p.name, callback_data: `summary_project:${p.id}` }])
          }
          await sendMessage(chatId, "Выберите проект для генерации сводки:", keyboard)
        } else {
          await sendMessage(chatId, "Нет активных проектов.")
        }
        return new Response("OK")
      }

      // Handle Menu
      if (text === "📊 Моя статистика") {
        await logToDb(supabase, 'info', 'Menu: My Statistics', { userId: linkData.user_id })
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        
        // Fetch total points for current month
        const { data: scores, error: scoresError } = await supabase
            .from('detailed_scores')
            .select('score')
            .eq('user_id', linkData.user_id)
            .gte('date', startOfMonth)
            
        if (scoresError) {
            await logToDb(supabase, 'error', 'Stats query error', scoresError)
        } else {
            await logToDb(supabase, 'info', 'Stats query result', { count: scores?.length, scores })
        }

        let totalPoints = 0
        if (scores) {
            totalPoints = scores.reduce((sum: number, row: any) => sum + (row.score || 0), 0)
        }
        
        // Fetch salary for bonus forecast
        const { data: salaryData } = await supabase.from('user_salaries').select('monthly_salary').eq('user_id', linkData.user_id).single()
        const salary = salaryData?.monthly_salary || 0
        
        const norm = 500
        const ki = totalPoints / norm
        const bonusPool = salary
        const indivPart = bonusPool * 0.3 * ki
        
        const monthName = now.toLocaleString('ru-RU', { month: 'long' })
        
        await sendMessage(chatId, 
            `📅 *Статистика за ${monthName}*\n\n` +
            `🏆 Набрано баллов: *${totalPoints.toFixed(1)}* / ${norm}\n` +
            `📈 Эффективность (Ki): *${ki.toFixed(2)}*\n` +
            `💰 Прогноз личной части премии: *${Math.round(indivPart).toLocaleString('ru-RU')} ₽*`,
            MAIN_MENU_KEYBOARD
        )
        return new Response("OK")
      }

      if (text === "📝 Последние работы") {
        const { data: logs } = await supabase
            .from('work_logs')
            .select(`
                quantity,
                date,
                projects (name),
                work_types (name)
            `)
            .eq('user_id', linkData.user_id)
            .order('created_at', { ascending: false })
            .limit(5)
            
        if (!logs || logs.length === 0) {
            await sendMessage(chatId, "У вас пока нет добавленных работ.", MAIN_MENU_KEYBOARD)
            return new Response("OK")
        }
        
        let msg = "📝 *Последние 5 работ:*\n\n"
        logs.forEach((log: any) => {
            const date = new Date(log.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
            const projectName = log.projects?.name || '???'
            const workName = log.work_types?.name || '???'
            
            msg += `• ${date}: *${projectName}* — ${workName} (${log.quantity})\n`
        })
        
        await sendMessage(chatId, msg, MAIN_MENU_KEYBOARD)
        return new Response("OK")
      }
      
      if (text === "⚙️ Профиль") {
         const { data: profile } = await supabase.from('user_profiles').select('display_name, nickname').eq('user_id', linkData.user_id).single()
         const { data: salaryData } = await supabase.from('user_salaries').select('monthly_salary').eq('user_id', linkData.user_id).single()
         
         await sendMessage(chatId, 
            `👤 *Профиль*\n\n` +
            `Никнейм: ${profile?.nickname || 'Не задан'}\n` +
            `Имя: ${profile?.display_name || 'Не задано'}\n` +
            `Оклад: ${salaryData?.monthly_salary?.toLocaleString('ru-RU') || 0} ₽`,
            MAIN_MENU_KEYBOARD
         )
         return new Response("OK")
      }

      // Default
      await sendMessage(chatId, "Я получил ваше сообщение. Если это фото, я предложу сохранить его в проект.", MAIN_MENU_KEYBOARD)
      return new Response("OK")
    }

    return new Response("OK")
  } catch (error) {
    console.error(error)
    return new Response("Internal Server Error", { status: 500 })
  }
})

// --- Helpers ---

async function handleProjectSelection(supabase: any, chatId: number, projectId: string, queryId: string) {
  // 1. Get pending uploads
  const { data: uploads } = await supabase
    .from('telegram_pending_uploads')
    .select('*')
    .eq('telegram_chat_id', chatId)

  if (!uploads || uploads.length === 0) {
    await answerCallbackQuery(queryId, "Нет ожидающих загрузок.")
    return
  }

  await sendMessage(chatId, `⏳ Обрабатываю ${uploads.length} файлов...`)

  // 2. Get User ID
  const { data: linkData } = await supabase.from('telegram_links').select('user_id').eq('telegram_id', chatId).single()
  const userId = linkData.user_id

  // 3. Get Default Work Type (first one)
  const { data: workTypes } = await supabase.from('work_types').select('id').limit(1)
  const workTypeId = workTypes?.[0]?.id

  let successCount = 0

  for (const upload of uploads) {
    try {
      // Get File Path
      const fileInfo = await getTelegramFile(upload.file_id)
      if (!fileInfo || !fileInfo.file_path) continue

      // Download
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`
      const fileResp = await fetch(fileUrl)
      const fileBlob = await fileResp.blob()
      
      // Upload to Storage
      const ext = fileInfo.file_path.split('.').pop() || 'jpg'
      const filename = `${crypto.randomUUID()}.${ext}`
      const path = `${userId}/${projectId}/${filename}` 
      
      await logToDb(supabase, 'info', 'Attempting upload', { path, bucket: 'works' })

      const { error: uploadError } = await supabase.storage
        .from('works') 
        .upload(path, fileBlob, {
            contentType: fileBlob.type,
            upsert: false
        })

      if (uploadError) {
          await logToDb(supabase, 'error', 'Upload failed to works', uploadError)
          console.error('Storage upload error', uploadError)
          // Also try 'gallery_media' just in case
           const { error: uploadError2 } = await supabase.storage
            .from('gallery_media') 
            .upload(path, fileBlob, {
                contentType: fileBlob.type,
                upsert: false
            })
            
           if (uploadError2) {
               await logToDb(supabase, 'error', 'Upload failed to gallery_media', uploadError2)
               console.error('Storage upload error (gallery_media)', uploadError2)
               continue
           } else {
               await logToDb(supabase, 'info', 'Upload success to gallery_media', { path })
           }
      } else {
          await logToDb(supabase, 'info', 'Upload success to works', { path })
      }
      
      // Create Work Log
      const { data: workLog, error: wlError } = await supabase.from('work_logs').insert({
        user_id: userId,
        project_id: projectId,
        work_type_id: workTypeId,
        quantity: 1,
        date: new Date().toISOString().slice(0, 10),
        image_url: null // We'll update or use publication
      }).select().single()

      if (wlError) {
          console.error('Work log error', wlError)
          continue
      }

      // Create Publication
      const { data: pub, error: pubError } = await supabase.from('publications').insert({
        author_id: userId,
        project_id: projectId,
        work_log_id: workLog.id,
        title: upload.caption || 'Telegram Upload',
        source: 'telegram',
        telegram_chat_id: chatId.toString()
      }).select().single()

      if (pub) {
          // Create Version
          await supabase.from('publication_versions').insert({
              publication_id: pub.id,
              version_number: 1,
              storage_path: path,
              storage_backend: 'supabase',
              media_type: 'image',
              created_by: userId
          })
          
          // Update work_log image_url (optional, for legacy support)
          const { data: publicUrl } = supabase.storage.from('works').getPublicUrl(path)
          await supabase.from('work_logs').update({ image_url: publicUrl.publicUrl }).eq('id', workLog.id)
      }

      successCount++
      
      // Delete pending
      await supabase.from('telegram_pending_uploads').delete().eq('id', upload.id)

    } catch (e) {
      console.error('Processing error', e)
    }
  }

  await answerCallbackQuery(queryId, "Готово!")
  await sendMessage(chatId, `✅ Сохранено ${successCount} файлов в проект.`)
}

async function handleProjectSummary(supabase: any, chatId: number, projectId: string, queryId: string) {
    if (!openAiKey) {
        await sendMessage(chatId, "AI API key not configured.")
        return
    }

    await sendMessage(chatId, "🤖 Генерирую сводку по проекту...")

    // Fetch project info
    const { data: project } = await supabase.from('projects').select('name, drone_count').eq('id', projectId).single()
    
    // Fetch recent publications/logs
    const { data: publications } = await supabase
        .from('publications')
        .select('title, created_at, source')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

    const summaryPrompt = `
    Project: ${project?.name}
    Drone Count: ${project?.drone_count}
    
    Recent Activity:
    ${publications?.map((p: any) => `- ${p.created_at}: ${p.title} (${p.source})`).join('\n')}
    
    Please provide a concise summary of the recent activity and status of this project based on the logs above.
    `

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a project manager assistant." },
                { role: "user", content: summaryPrompt }
              ]
            })
        })
        
        const data = await response.json()
        const summary = data.choices[0].message.content
        
        await sendMessage(chatId, `📋 *Сводка по проекту ${project?.name}*\n\n${summary}`)

    } catch (e) {
        console.error(e)
        await sendMessage(chatId, "Ошибка при генерации сводки.")
    }
}

async function handleAuth(supabase: any, chatId: number, text: string, username: string, firstName: string) {
    if (text.startsWith('/start')) {
        const parts = text.split(' ')
        const token = parts[1]?.trim()
        
        if (!token) {
          // Check if already linked
          const { data: existingLink } = await supabase.from('telegram_links').select('user_id').eq('telegram_id', chatId).single()
          
          if (existingLink) {
             await sendMessage(chatId, "С возвращением! Выберите действие в меню.", MAIN_MENU_KEYBOARD)
          } else {
             await sendMessage(chatId, "Привет! Пожалуйста, используйте ссылку из приложения для привязки аккаунта.")
          }
          return
        }

        // Verify token
        const { data: tokenData, error: tokenError } = await supabase
          .from('telegram_link_tokens')
          .select('user_id, expires_at')
          .eq('token', token)
          .single()

        if (tokenError || !tokenData) {
          await sendMessage(chatId, "Неверный или устаревший токен. Пожалуйста, сгенерируйте новый в приложении.")
          return
        }

        if (new Date(tokenData.expires_at) < new Date()) {
          await sendMessage(chatId, "Токен истек. Пожалуйста, сгенерируйте новый в приложении.")
          // Cleanup expired token
          await supabase.from('telegram_link_tokens').delete().eq('token', token)
          return
        }

        // Link account
        const { error: linkError } = await supabase
          .from('telegram_links')
          .upsert({
            telegram_id: chatId,
            user_id: tokenData.user_id,
            username: username,
            first_name: firstName
          }, { onConflict: 'user_id' })

        if (linkError) {
          console.error('Link error:', linkError)
          await sendMessage(chatId, "Ошибка при привязке аккаунта. Попробуйте позже.")
          return
        }

        // Cleanup token
        await supabase.from('telegram_link_tokens').delete().eq('token', token)

        await sendMessage(chatId, "Аккаунт успешно привязан! Теперь вы можете использовать меню.", MAIN_MENU_KEYBOARD)
        return
      }
      
      // Handle /link <token> (legacy support)
      if (text.startsWith('/link')) {
        const parts = text.split(' ')
        const token = parts[1]?.trim()
        
        if (!token) {
          await sendMessage(chatId, "Пожалуйста, укажите токен после команды /link")
          return
        }
        
        const { data: tokenData, error: tokenError } = await supabase
          .from('telegram_link_tokens')
          .select('user_id, expires_at')
          .eq('token', token)
          .single()
          
        if (tokenError || !tokenData) {
          await sendMessage(chatId, "Неверный или устаревший токен.")
          return
        }
        
        // Link account
        const { error: linkError } = await supabase
          .from('telegram_links')
          .upsert({
            telegram_id: chatId,
            user_id: tokenData.user_id,
            username: username,
            first_name: firstName
          }, { onConflict: 'user_id' })

        if (linkError) {
           await sendMessage(chatId, "Ошибка при привязке.")
           return
        }
        
        await supabase.from('telegram_link_tokens').delete().eq('token', token)
        await sendMessage(chatId, "Аккаунт успешно привязан!", MAIN_MENU_KEYBOARD)
        return
      }
}

async function sendMessage(chatId: number, text: string, replyMarkup: any = null) {
  if (!botToken) return
  const body: any = { chat_id: chatId, text, parse_mode: 'Markdown' }
  if (replyMarkup) body.reply_markup = replyMarkup
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
    if (!botToken) return
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
}

async function getTelegramFile(fileId: string) {
    if (!botToken) return null
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const data = await res.json()
    if (data.ok) return data.result
    return null
}

async function logToDb(supabase: any, level: string, message: string, details: any = {}) {
  try {
    await supabase.from('bot_logs').insert({
      level,
      message,
      details
    })
  } catch (e) {
    console.error('Logging failed', e)
  }
}
