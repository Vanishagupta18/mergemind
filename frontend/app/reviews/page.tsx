"use client"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { loadReviews, type Review } from "@/lib/api"
import { DemoNotice } from "@/components/app/demo-notice"
import { PageHeader, Panel, EmptyState, ErrorState } from "@/components/app/ui"
import { ReviewTable, ReviewTableSkeleton } from "@/components/app/review-table"

function ReviewsList() {
  const repoFilter = useSearchParams().get("repo") // e.g. /reviews?repo=owner/name (from Repositories page)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState("")
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    loadReviews()
      .then(r => { setReviews(r.data); setDemo(r.demo) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const q = search.toLowerCase()
  const filtered = reviews.filter(r =>
    (!repoFilter || r.repo === repoFilter) &&
    (r.pr_title.toLowerCase().includes(q) || r.filename.toLowerCase().includes(q) || r.repo.toLowerCase().includes(q))
  )

  return (
    <>
      <PageHeader
        title="Reviews"
        description={loading ? "Loading…" : error ? "Unable to load reviews." : `${filtered.length} review${filtered.length !== 1 ? "s" : ""} found`}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              aria-label="Search reviews"
              placeholder="Search reviews…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-full rounded border border-line bg-surface pl-8 pr-3 text-[13px] placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
        }
      />
      {demo && <DemoNotice />}
      {repoFilter && (
        <p className="mb-4 inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2">
          Repository: <span className="font-medium text-ink">{repoFilter}</span>
          <Link href="/reviews" aria-label="Clear repository filter" className="text-ink-3 hover:text-ink"><X className="h-3.5 w-3.5" /></Link>
        </p>
      )}
      <Panel className="overflow-hidden">
        {error ? <ErrorState title="Failed to load reviews" /> :
         loading ? <ReviewTableSkeleton rows={6} /> :
         filtered.length === 0 ? <EmptyState title="No reviews found" hint={search || repoFilter ? "Try a different search or clear the filter." : undefined} /> :
         <ReviewTable reviews={filtered} />}
      </Panel>
    </>
  )
}

// useSearchParams requires a Suspense boundary or `next build` fails
export default function ReviewsPage() {
  return <Suspense fallback={null}><ReviewsList /></Suspense>
}