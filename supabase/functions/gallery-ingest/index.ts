import { corsHeaders } from '../_shared/cors.ts'
import { verifyApiKey } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = req.headers.get('X-API-Key')
  if (!(await verifyApiKey(apiKey))) {
    return new Response(JSON.stringify({ error: 'Invalid or missing API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { author_id, project_id, work_log_id, file_base64, file_url, work_type, subtype, source = 'api' } = body

    if (!author_id) {
      return new Response(JSON.stringify({ error: 'author_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createSupabaseAdmin()

    let storagePath: string
    let mediaType: 'image' | 'gif' | 'video' = 'image'

    if (file_base64) {
      const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '')
      const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
      const ext = body.file_ext || 'jpg'
      const pubId = crypto.randomUUID()
      storagePath = `${author_id}/${project_id || '_unsorted'}/${pubId}/v1/${crypto.randomUUID()}.${ext}`
      if (ext === 'gif') mediaType = 'gif'
      else if (['mp4', 'webm'].includes(ext)) mediaType = 'video'

      const { error: uploadErr } = await supabase.storage.from('gallery-media').upload(storagePath, binary, {
        contentType: body.content_type || `image/${ext}`,
        upsert: false,
      })
      if (uploadErr) {
        return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else if (file_url) {
      const res = await fetch(file_url)
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch file from URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const blob = await res.blob()
      const ext = body.file_ext || file_url.split('.').pop()?.split('?')[0] || 'jpg'
      const pubId = crypto.randomUUID()
      storagePath = `${author_id}/${project_id || '_unsorted'}/${pubId}/v1/${crypto.randomUUID()}.${ext}`
      if (ext === 'gif') mediaType = 'gif'
      else if (['mp4', 'webm'].includes(ext)) mediaType = 'video'

      const { error: uploadErr } = await supabase.storage.from('gallery-media').upload(storagePath, blob, {
        upsert: false,
      })
      if (uploadErr) {
        return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      return new Response(JSON.stringify({ error: 'file_base64 or file_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validSources = ['web_ui', 'telegram', 'api', 'houdini', 'telegram_repost']
    const pubSource = validSources.includes(source) ? source : 'api'

    const { data: pub, error: pubErr } = await supabase.from('publications').insert({
      author_id,
      project_id: project_id || null,
      work_log_id: work_log_id || null,
      title: body.title || null,
      source: pubSource,
      external_id: body.external_id || null,
      telegram_chat_id: body.telegram_chat_id || null,
    }).select().single()

    if (pubErr || !pub) {
      return new Response(JSON.stringify({ error: `Publication create failed: ${pubErr?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pointsConfigId = body.points_config_id || null
    const pointsAssigned = body.points_assigned ?? null

    const { data: ver, error: verErr } = await supabase.from('publication_versions').insert({
      publication_id: pub.id,
      version_number: 1,
      storage_path: storagePath,
      storage_backend: 'supabase',
      media_type: mediaType,
      points_config_id: pointsConfigId,
      points_assigned: pointsAssigned,
      created_by: author_id,
    }).select().single()

    if (verErr || !ver) {
      return new Response(JSON.stringify({ error: `Version create failed: ${verErr?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        publication_id: pub.id,
        version_id: ver.id,
        version_number: 1,
        points: pointsAssigned,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
