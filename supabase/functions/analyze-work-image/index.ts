import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const openAiKey = Deno.env.get('OPENAI_API_KEY')
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

console.log(`Function "analyze-work-image" up and running!`)

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    if (req.method !== 'POST') {
      return new Response("Method Not Allowed", { status: 405 })
    }

    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // 1. Try Anthropic (Claude 3 Haiku)
    if (anthropicKey) {
      console.log('Using Anthropic Claude 3 Haiku')
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          system: "You are a VFX studio assistant. Analyze the image and determine the work type (e.g., '3D Scene', '2D Scene', 'Animation', 'Compositing') and quantity (usually 1, unless multiple distinct items are visible). Also generate 3-5 relevant tags reflecting the content (e.g., 'character', 'environment', 'explosion', 'vehicle', 'lighting'). Return ONLY valid JSON: { \"work_type\": string, \"quantity\": number, \"tags\": string[] }.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType || "image/jpeg",
                    data: imageBase64
                  }
                },
                {
                  type: "text",
                  text: "Analyze this work screenshot and return the JSON with tags."
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Anthropic API error:', errText)
        throw new Error(`Anthropic API error: ${errText}`)
      }

      const data = await response.json()
      const content = data.content[0].text
      
      const result = parseJson(content)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 2. Fallback to OpenAI
    if (openAiKey) {
      console.log('Using OpenAI GPT-4o-mini')
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a VFX studio assistant. Analyze the image and determine the work type (e.g., '3D Scene', '2D Scene', 'Animation', 'Compositing') and quantity (usually 1, unless multiple distinct items are visible). Also generate 3-5 relevant tags reflecting the content. Return JSON: { \"work_type\": string, \"quantity\": number, \"tags\": string[] }."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this work screenshot and generate tags." },
                { type: "image_url", image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${imageBase64}` } }
              ]
            }
          ],
          max_tokens: 300
        })
      })

      const data = await response.json()
      if (data.error) {
          throw new Error(data.error.message)
      }
      const content = data.choices[0].message.content
      
      const result = parseJson(content)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 3. Mock Response
    console.log('No API keys found, returning mock response')
    return new Response(JSON.stringify({
      work_type: '3D Scene',
      quantity: 1,
      tags: ['mock', '3d', 'no-api-key']
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})

function parseJson(content: string) {
  let jsonStr = content
  // Remove markdown code blocks if present
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim()
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim()
  }
  return JSON.parse(jsonStr)
}
