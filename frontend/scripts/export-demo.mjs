// Exports REAL data from your running local backend into lib/demo-snapshot.json.
// Usage (backend running on :8000):   node scripts/export-demo.mjs
// Optional: BACKEND_URL=http://localhost:8000 node scripts/export-demo.mjs
import { writeFileSync } from "node:fs"

const API = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "")
const get = async path => {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json()
}

const [stats, repos, list] = await Promise.all([get("/api/stats"), get("/api/repos"), get("/api/reviews")])

const reviews = []
for (const r of list) {
  const d = await get(`/api/reviews/${r.id}`)
  // Internal error text is not published: keep only the fact that it failed.
  reviews.push({ ...d, last_error: null })
}

const snapshot = {
  generated_at: new Date().toISOString(),
  stats: {
    total_reviews: stats.total_reviews,
    total_api_calls: stats.total_api_calls,
    total_cache_hits: stats.total_cache_hits,
    repos_count: stats.repos_count,
  },
  repos,
  reviews,
}

writeFileSync(new URL("../lib/demo-snapshot.json", import.meta.url), JSON.stringify(snapshot, null, 2) + "\n")
console.log(`Saved ${reviews.length} reviews, ${repos.length} repos -> lib/demo-snapshot.json`)