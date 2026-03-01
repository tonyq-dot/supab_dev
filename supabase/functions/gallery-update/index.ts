import { corsHeaders } from '../_shared/cors.ts'
import { verifyApiKey } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'PATCH') {
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
    const { publication_id, version_description, file_base64, file_url, file_ext } = body
    const publicationId = publication_id
    if (!publicationId) {
      return new Response(JSON.stringify({ error: 'publication_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createSupabaseAdmin()

    const { data: pub, error: pubErr } = await supabase.from('publications').select('id, author_id, project_id').eq('id', publicationId).single()
    if (pubErr || !pub) {
      return new Response(JSON.stringify({ error: 'Publication not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: lastVer } = await supabase.from('publication_versions').select('version_number').eq('publication_id', publicationId).order('version_number', { ascending: false }).limit(1).single()
    const nextVersion = (lastVer?.version_number ?? 0) + 1

    let storagePath: string | null = null
    let mediaType: 'image' | 'gif' | 'video' = 'image'

    if (file_base64 || file_url) {
      const ext = file_ext || 'jpg'
      storagePath = `${pub.author_id}/${pub.project_id || '_unsorted'}/${publicationId}/v${nextVersion}/${crypto.randomUUID()}.${ext}`
      if (ext === 'gif') mediaType = 'gif'
      else if (['mp4', 'webm'].includes(ext)) mediaType = 'video'

      if (file_base64) {
        const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '')
        const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
        const { error: uploadErr } = await supabase.storage.from('gallery-media').upload(storagePath, binary, { upsert: false })
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
        const { error: uploadErr } = await supabase.storage.from('gallery-media').upload(storagePath, blob, { upsert: false })
        if (uploadErr) {
          return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'file_base64 or file_url required for new version' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: ver, error: verErr } = await supabase.from('publication_versions').insert({
      publication_id: publicationId,
      version_number: nextVersion,
      storage_path: storagePath,
      storage_backend: 'supabase',
      media_type: mediaType,
      created_by: pub.author_id,
    }).select().single()

    if (verErr || !ver) {
      return new Response(JSON.stringify({ error: `Version create failed: ${verErr?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (version_description) {
      await supabase.from('publication_version_history').insert({
        publication_id: publicationId,
        version_number: nextVersion,
        changed_by: pub.author_id,
        change_description: version_description,
      })
    }

    await supabase.from('publications').update({ updated_at: new Date().toISOString() }).eq('id', publicationId)

    return new Response(
      JSON.stringify({
        publication_id: publicationId,
        new_version_number: nextVersion,
        version_id: ver.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
