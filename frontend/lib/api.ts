import { demoRepos, demoReview, demoReviews, demoStats } from "./demo-data"

/**
 * Backend URL. On Vercel set NEXT_PUBLIC_API_URL to your Railway URL (or leave it unset to run
 * in pure demo mode). localhost is only used as a default during `npm run dev`.
 */
export const API = (
  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "")
).replace(/\/$/, "")

/* ---------- Types: mirror backend/main.py serialize_review() and worker.py ---------- */
export interface Review {
  id: string
  repo: string
  pr_number: number
  pr_title: string
  filename: string
  quality_score: number | null
  status: string
  created_at: string | null
}

export interface Stats {
  total_reviews: number
  total_api_calls: number
  total_cache_hits: number
  repos_count: number
  recent_reviews: Review[]
}

export interface Repo {
  repo_name: string
  api_calls_made: number
  cache_hits: number
  files_skipped: number
}

export interface Issue { line?: number | null; issue?: string; reasoning?: string; confidence?: string; severity?: string }
export interface Fix { issue?: string; fix?: string }
export interface ReviewJson {
  critical_bugs?: Issue[]
  logic_errors?: Issue[]
  security_issues?: Issue[]
  performance_issues?: Issue[]
  maintainability_notes?: Issue[]
  positive_observations?: string[]
  suggested_fixes?: Fix[]
  confidence_overall?: string
}
export interface ReviewDetailData extends Review {
  review_json?: ReviewJson | null
  retry_count?: number
  last_error?: string | null
}

/* ---------- Fetch (live backend first, saved demo snapshot as fallback) ---------- */
export class HttpError extends Error {
  status: number
  constructor(status: number) { super(String(status)); this.status = status }
}

const TIMEOUT_MS = 6000

async function fetchLive<T>(path: string): Promise<T> {
  if (!API) throw new Error("no-backend")
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API}${path}`, { signal: ctrl.signal, cache: "no-store" })
    if (!res.ok) throw new HttpError(res.status)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export interface Loaded<T> { data: T; demo: boolean }

/** Network failure, timeout or 5xx (asleep/offline backend) -> demo data. 4xx (e.g. 404) is a real answer and is rethrown. */
async function load<T>(path: string, demo: () => T): Promise<Loaded<T>> {
  try {
    return { data: await fetchLive<T>(path), demo: false }
  } catch (e) {
    if (e instanceof HttpError && e.status < 500) throw e
    return { data: demo(), demo: true }
  }
}

export const loadStats = () => load<Stats>("/api/stats", demoStats)
export const loadReviews = () => load<Review[]>("/api/reviews", demoReviews)
export const loadRepos = () => load<Repo[]>("/api/repos", demoRepos)
export const loadReview = (id: string) =>
  load<ReviewDetailData>(`/api/reviews/${encodeURIComponent(id)}`, () => {
    const r = demoReview(id)
    if (!r) throw new HttpError(404)
    return r
  })

/** Quick health ping for the status button. */
export async function checkBackend(): Promise<boolean> {
  if (!API) return false
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`${API}/`, { signal: ctrl.signal, cache: "no-store" })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/* ---------- Shared review rules (used by Overview, Reviews, Repos, Detail) ---------- */
export const ATTENTION_SCORE_THRESHOLD = 4

/** A review needs attention if it failed OR its score is below the threshold. */
export const needsAttention = (r: Review) =>
  r.status === "failed" || (r.quality_score != null && r.quality_score < ATTENTION_SCORE_THRESHOLD)

export const attentionReason = (r: Review): string | null =>
  r.status === "failed" ? "Failed" : r.quality_score != null && r.quality_score < ATTENTION_SCORE_THRESHOLD ? `Score ${r.quality_score.toFixed(1)}` : null

export function averageScore(reviews: Review[]): { avg: number | null; count: number } {
  const scores = reviews.map(r => r.quality_score).filter((s): s is number => s != null)
  return { avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, count: scores.length }
}

export const repoShortName = (full: string) => full.split("/")[1] || full

export function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/* ---------- Findings mapping (review_json -> flat list) ---------- */
export type CategoryKey = "critical" | "security" | "logic" | "performance" | "maintainability"
export const CATEGORIES: { key: CategoryKey; field: keyof ReviewJson; label: string; tone: "bad" | "high" | "warn" | "neutral" }[] = [
  { key: "critical", field: "critical_bugs", label: "Critical bug", tone: "bad" },
  { key: "security", field: "security_issues", label: "Security", tone: "high" },
  { key: "logic", field: "logic_errors", label: "Logic", tone: "warn" },
  { key: "performance", field: "performance_issues", label: "Performance", tone: "warn" },
  { key: "maintainability", field: "maintainability_notes", label: "Maintainability", tone: "neutral" },
]
export interface Finding { key: string; category: CategoryKey; item: Issue; fix?: Fix }

const words = (s?: string) => new Set((s ?? "").toLowerCase().match(/[a-z0-9_]+/g) ?? [])
function similarity(a?: string, b?: string) {
  const A = words(a), B = words(b)
  if (!A.size || !B.size) return 0
  let shared = 0
  A.forEach(w => { if (B.has(w)) shared++ })
  return shared / (A.size + B.size - shared)
}

/**
 * suggested_fixes[] has no ID linking it to an issue — the model just repeats the issue text,
 * often reworded. So we pair each finding with its most similar unused fix (>= 0.6 word overlap).
 * Anything unpaired is returned in `unmatchedFixes` and shown in its own section.
 */
export function buildFindings(rj: ReviewJson | null | undefined) {
  const json = rj ?? {}
  const fixes = json.suggested_fixes ?? []
  const used = new Set<number>()
  const findings: Finding[] = []
  for (const c of CATEGORIES) {
    const items = (json[c.field] as Issue[] | undefined) ?? []
    items.forEach((item, i) => {
      let best = -1, bestScore = 0.6
      fixes.forEach((fx, n) => {
        if (used.has(n)) return
        const s = similarity(item.issue, fx.issue)
        if (s >= bestScore) { best = n; bestScore = s }
      })
      if (best >= 0) used.add(best)
      findings.push({ key: `${c.key}-${i}`, category: c.key, item, fix: best >= 0 ? fixes[best] : undefined })
    })
  }
  return { findings, unmatchedFixes: fixes.filter((_, n) => !used.has(n)) }
}