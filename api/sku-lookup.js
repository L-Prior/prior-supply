// Vercel serverless function — proxies sneaker DB API to avoid CORS
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { q } = req.query
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'No query provided', results: [] })
  }

  try {
    const url = `https://api.thesneakerdatabase.com/v1/sneakers?limit=6&search=${encodeURIComponent(q.trim())}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockTrack/1.0)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Upstream API returned ${response.status}`)
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch (err) {
    console.error('SKU lookup error:', err.message)
    return res.status(503).json({ error: 'Lookup service unavailable', results: [] })
  }
}
