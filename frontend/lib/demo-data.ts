import type { Repo, Review, ReviewDetailData, Stats } from "./api"
import snapshot from "./demo-snapshot.json"

/**
 * Saved demo snapshot (lib/demo-snapshot.json) — a copy of real review data exported from the
 * local MergeMind backend. It is shown ONLY when the live backend can't be reached, and the UI
 * always labels it as demo data. Regenerate it with: node scripts/export-demo.mjs
 */
const reviews = snapshot.reviews as unknown as ReviewDetailData[]

export const demoReviews = (): Review[] =>
  reviews.map(r => ({
    id: r.id, repo: r.repo, pr_number: r.pr_number, pr_title: r.pr_title,
    filename: r.filename, quality_score: r.quality_score, status: r.status, created_at: r.created_at,
  }))

export const demoStats = (): Stats => ({
  ...snapshot.stats,
  recent_reviews: demoReviews().slice(0, 10),
})

export const demoRepos = (): Repo[] => snapshot.repos as Repo[]

export const demoReview = (id: string): ReviewDetailData | null => reviews.find(r => r.id === id) ?? null