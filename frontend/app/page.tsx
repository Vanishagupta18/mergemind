"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { loadStats, loadReviews, needsAttention, attentionReason, averageScore, repoShortName, type Review, type Stats } from "@/lib/api"
import { DemoNotice } from "@/components/app/demo-notice"
import { PageHeader, Panel, PanelHeader, TextLink, EmptyState, ErrorState, Skeleton, Tag } from "@/components/app/ui"
import { ReviewTable, ReviewTableSkeleton } from "@/components/app/review-table"

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    Promise.allSettled([loadStats(), loadReviews()]).then(([s, r]) => {
      if (s.status === "rejected") { setError(true); setLoading(false); return }
      setStats(s.value.data)
      setDemo(s.value.demo)
      // /api/reviews (up to 100) is the broadest data; fall back to the 10 in /api/stats if it fails
      setReviews(r.status === "fulfilled" ? r.value.data : s.value.data.recent_reviews)
      setLoading(false)
    })
  }, [])

  const total = stats?.total_reviews ?? 0
  const scope = reviews.length < total ? `latest ${reviews.length}` : `${reviews.length}`
  const completed = reviews.filter(r => r.status === "completed").length
  const failed = reviews.filter(r => r.status === "failed").length
  const attention = reviews.filter(needsAttention)
  const { avg, count: scored } = averageScore(reviews)

  const metrics: { label: string; value: string | number; note: string; danger?: boolean }[] = [
    { label: "Total reviews", value: total, note: `${completed} completed · ${failed} failed` },
    { label: "Needs attention", value: attention.length, note: `of ${scope} reviews failed or scored below 4`, danger: attention.length > 0 },
    { label: "Average score", value: avg != null ? avg.toFixed(1) : "—", note: `out of 10 · ${scored} scored review${scored !== 1 ? "s" : ""}` },
    { label: "Repositories", value: stats?.repos_count ?? 0, note: "With reviews" },
    { label: "API calls", value: stats?.total_api_calls ?? 0, note: "AI review requests made" },
    { label: "Cache hits", value: stats?.total_cache_hits ?? 0, note: "Reused earlier results" },
  ]

  return (
    <>
      <PageHeader title="Overview" description="Monitor your recent pull request reviews." />
      {demo && <DemoNotice />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map(m => (
          <Panel key={m.label} className="p-4">
            <p className="text-[13px] text-ink-2">{m.label}</p>
            {loading ? <Skeleton className="mt-2 h-8 w-12" /> : (
              <p className={`mt-1 text-[26px] font-semibold leading-8 tracking-[-0.02em] ${m.danger ? "text-bad" : ""}`}>{error ? "—" : m.value}</p>
            )}
            <p className="mt-1 text-[12px] leading-4 text-ink-3">{error ? "" : m.note}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-6 overflow-hidden">
        <PanelHeader title="Recent reviews" aside={<TextLink href="/reviews">View all</TextLink>} />
        {error ? <ErrorState title="Failed to load reviews" /> :
         loading ? <ReviewTableSkeleton /> :
         !stats || stats.recent_reviews.length === 0 ? <EmptyState title="No reviews yet" hint="Open a pull request on a connected repository to get started." /> :
         <ReviewTable reviews={stats.recent_reviews} />}
      </Panel>

      {!loading && !error && attention.length > 0 && (
        <Panel className="border-l-2 border-l-warn">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warn" />
              <h2 className="text-[15px] font-semibold leading-5">Needs attention</h2>
            </div>
            <span className="text-[12px] text-ink-3">Failed, or score below 4</span>
          </div>
          <ul>
            {attention.slice(0, 5).map(r => (
              <li key={r.id} className="border-b border-line last:border-0">
                <Link href={`/reviews/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-subtle">
                  <Tag tone={r.status === "failed" ? "bad" : "warn"} className="shrink-0">{attentionReason(r)}</Tag>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-[12px] text-ink-3">{repoShortName(r.repo)} #{r.pr_number}</span>{" "}
                    {r.pr_title} <span className="font-mono text-[12px] text-ink-2">· {r.filename}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
          {attention.length > 5 && <p className="px-4 py-2.5 text-[12px] text-ink-3">+ {attention.length - 5} more in <Link href="/reviews" className="text-accent hover:text-accent-hover">Reviews</Link></p>}
        </Panel>
      )}
    </>
  )
}