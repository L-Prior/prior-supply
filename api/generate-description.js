module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { category, brand, style, colourway, size, condition, platform, notes } = req.body || {}
  if (!brand && !style) return res.status(400).json({ error: 'Need at least brand or style' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI generation not configured' })

  const prompt = `Generate a compelling ${platform || 'general resale'} listing description for this item:
Category: ${category || ''}
Brand: ${brand || ''}
Model/Style: ${style || ''}
${colourway ? `Colourway: ${colourway}` : ''}
${size ? `Size: UK ${size}` : ''}
${condition ? `Condition: ${condition}` : ''}
${notes ? `Additional notes: ${notes}` : ''}

Write a concise, honest product description optimised for ${platform || 'online resale'}. Include key details buyers look for. No emoji spam. 3–5 sentences maximum.`

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!apiRes.ok) {
      const err = await apiRes.text()
      console.error('Anthropic error:', err)
      throw new Error(`Anthropic API ${apiRes.status}`)
    }
    const data = await apiRes.json()
    const description = data.content?.[0]?.text || ''
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ description })
  } catch (err) {
    console.error('Description gen error:', err.message)
    return res.status(503).json({ error: 'Description generation unavailable. Check ANTHROPIC_API_KEY is set in Vercel.' })
  }
}
