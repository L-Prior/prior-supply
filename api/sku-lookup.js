// Vercel serverless function — product lookup via GOAT's Algolia search index
// GOAT exposes a public-facing Algolia app for their web search; these keys are
// loaded by every browser visiting goat.com and are intentionally read-only.
// Retail prices are converted from USD to GBP using the live rate from frankfurter.app.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { q } = req.query
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'No query provided', results: [] })
  }

  try {
    // Fetch live USD→GBP rate and Algolia results in parallel
    const algoliaUrl = 'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries'
    const params = `query=${encodeURIComponent(q.trim())}&hitsPerPage=6`

    const [algoliaRes, fxRes] = await Promise.all([
      fetch(algoliaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-algolia-application-id': '2FWOTDVM2O',
          'x-algolia-api-key': 'ac96de6fef0e02bb95d433d8d5c7038a',
        },
        body: JSON.stringify({
          requests: [{ indexName: 'product_variants_v2', params }]
        })
      }),
      fetch('https://api.frankfurter.app/latest?from=USD&to=GBP')
    ])

    if (!algoliaRes.ok) throw new Error(`Algolia returned ${algoliaRes.status}`)

    const [algoliaData, fxData] = await Promise.all([algoliaRes.json(), fxRes.json()])
    const usdToGbp = fxData?.rates?.GBP || 0.79 // fall back to a rough rate if FX call fails
    const hits = algoliaData?.results?.[0]?.hits || []

    const results = hits.map(hit => {
      const usdCents = hit.retail_price_cents
      const retailGBP = usdCents ? parseFloat((Math.round(usdCents) / 100 * usdToGbp).toFixed(2)) : null
      return {
        id: hit.objectID,
        title: hit.name || hit.title || null,
        brand: hit.brand_name || hit.brand || null,
        colorway: hit.color || hit.colorway || null,
        styleId: hit.sku || hit.style_id || null,
        retailPrice: retailGBP,
        year: hit.release_date_year || (hit.release_date ? new Date(hit.release_date * 1000).getFullYear() : null) || null,
        media: { imageUrl: hit.main_picture_url || hit.picture_url || null },
        links: {
          goat: hit.slug ? `https://www.goat.com/sneakers/${hit.slug}` : null,
          stockX: hit.sku
            ? `https://stockx.com/search?s=${encodeURIComponent(hit.sku)}`
            : hit.name ? `https://stockx.com/search?s=${encodeURIComponent(hit.name)}` : null,
        }
      }
    })

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ results })
  } catch (err) {
    console.error('SKU lookup error:', err.message)
    return res.status(503).json({ error: 'Lookup service unavailable', results: [] })
  }
}
