"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { loadReview, formatDate, buildFindings, CATEGORIES, type CategoryKey, type Finding, type ReviewDetailData } from "@/lib/api"
import { Panel, PanelHeader, Tag, StatusChip, ScoreChip, Skeleton, ErrorState, EmptyState } from "@/components/app/ui"
import { cn } from "@/lib/utils"
import { DemoNotice } from "@/components/app/demo-notice"

/** Renders `backtick` segments as inline code; everything else as text. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.length > 1 && part.startsWith("`") && part.endsWith("`")
          ? <code key={i} className="rounded bg-neutral-bg px-1 py-0.5 font-mono text-[12px] text-ink">{part.slice(1, -1)}</code>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function FixBlock({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-accent bg-subtle px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Suggested remediation</p>
      <p className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-ink"><RichText text={text} /></p>
    </div>
  )
}

function FindingCard({ f, filename }: { f: Finding; filename: string }) {
  const cat = CATEGORIES.find(c => c.key === f.category)!
  const sev = f.item.severity?.toLowerCase()
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-subtle px-4 py-2.5">
        {/* Severity is only shown if the backend actually sent one for this finding */}
        {f.item.severity && <Tag tone={sev === "critical" ? "bad" : sev === "high" ? "high" : sev === "medium" ? "warn" : "neutral"} className="uppercase">{f.item.severity}</Tag>}
        <Tag tone={cat.tone} className="uppercase">{cat.label}</Tag>
        <span className="min-w-0 truncate font-mono text-[12px] text-ink-2" title={filename}>{filename}</span>
        {f.item.line != null && <span className="font-mono text-[12px] text-ink-3">line {f.item.line}</span>}
        {f.item.confidence && <span className="ml-auto text-[12px] text-ink-3">Confidence: {f.item.confidence}</span>}
      </div>
      <div className="px-4 py-4">
        <h3 className="text-[15px] font-semibold leading-5"><RichText text={f.item.issue ?? "Untitled finding"} /></h3>
        {f.item.reasoning && <p className="mt-1.5 text-[13px] leading-[18px] text-ink-2"><RichText text={f.item.reasoning} /></p>}
        {f.fix?.fix && <div className="mt-4"><FixBlock text={f.fix.fix} /></div>}
      </div>
    </Panel>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading review" className="space-y-4">
      <Skeleton className="h-4 w-28" />
      <Panel className="p-5"><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-6 w-2/3" /><Skeleton className="mt-4 h-3 w-1/2" /></Panel>
      <Panel className="p-5"><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-3 w-full" /></Panel>
    </div>
  )
}

function NoFindings({ review, demo }: { review: ReviewDetailData; demo: boolean }) {
  if (demo && !review.review_json)
    return <EmptyState title="Finding details aren’t included in this demo snapshot" hint="Run the backend to see the full AI review for this file." />
  if (review.status === "failed")
    return <EmptyState title="This review failed" hint="No findings were produced. See the error above for the reason." />
  if (review.status !== "completed")
    return <EmptyState title={`This review is ${review.status}`} hint="Findings will appear here once the review completes." />
  const suspicious = review.quality_score === 0 && review.review_json?.confidence_overall?.toLowerCase() === "low"
  return (
    <EmptyState
      title="No findings were reported for this review."
      hint={suspicious ? "The AI returned a score of 0.0 with low confidence and no itemised findings, which usually means it received little or no code to review." : undefined}
    />
  )
}

export default function ReviewDetail() {
  const params = useParams<{ id: string }>()
  const [review, setReview] = useState<ReviewDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<"notfound" | "failed" | null>(null)
  const [filter, setFilter] = useState<"all" | CategoryKey>("all")
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    loadReview(params.id)
      .then(r => { setReview(r.data); setDemo(r.demo) })
      .catch(e => setError(e instanceof Error && e.message === "404" ? "notfound" : "failed"))
      .finally(() => setLoading(false))
  }, [params?.id])

  const reviewJson = review?.review_json
  const { findings, unmatchedFixes } = useMemo(() => buildFindings(reviewJson), [reviewJson])

  if (loading) return <DetailSkeleton />
  if (error === "notfound") return <Panel><EmptyState title="Review not found" hint="It may have been removed, or the link is incorrect." /></Panel>
  if (error || !review) return <Panel><ErrorState title="Failed to load review" /></Panel>

  const rj = reviewJson ?? {}
  const count = (k: CategoryKey) => findings.filter(f => f.category === k).length
  const visible = filter === "all" ? findings : findings.filter(f => f.category === filter)
  const tabs = [
    { key: "all" as const, label: "All", n: findings.length },
    ...CATEGORIES.filter(c => count(c.key) > 0).map(c => ({ key: c.key, label: c.key === "critical" ? "Critical" : c.label, n: count(c.key) })),
  ]
  const hasContent = findings.length > 0 || unmatchedFixes.length > 0

  return (
    <>
      <Link href="/reviews" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to reviews
      </Link>

      {demo && <DemoNotice />}

      <Panel className="mb-6 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              <Link href={`/reviews?repo=${encodeURIComponent(review.repo)}`} className="font-medium text-ink hover:text-accent">{review.repo}</Link>
              <span className="font-mono text-[12px]">#{review.pr_number}</span>
              <StatusChip status={review.status} />
            </p>
            <h1 className="mt-2 text-[22px] font-semibold leading-7 tracking-[-0.015em] sm:text-[26px] sm:leading-8 sm:tracking-[-0.02em]">{review.pr_title}</h1>
          </div>
          <div className="shrink-0 text-right">
            <ScoreChip score={review.quality_score} />
            <p className="mt-1 text-[11px] text-ink-3">of 10</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
          <div className="col-span-2 min-w-0"><dt className="text-[12px] text-ink-3">Files analyzed</dt><dd className="mt-0.5 truncate font-mono text-[12px]" title={review.filename}>1 · {review.filename}</dd></div>
          <div><dt className="text-[12px] text-ink-3">Findings</dt><dd className="mt-0.5 font-medium">{findings.length}</dd></div>
          <div><dt className="text-[12px] text-ink-3">Reviewed</dt><dd className="mt-0.5">{formatDate(review.created_at)}</dd></div>
        </dl>
        {review.status === "failed" && (
          <p role="alert" className="mt-4 break-words rounded border border-bad-line bg-bad-bg px-3 py-2 text-[12px] text-bad">
            Review failed{review.last_error ? <>: <span className="font-mono">{review.last_error}</span></> : "."}
          </p>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-4">
          {findings.length > 0 && (
            <div role="tablist" aria-label="Filter findings" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {tabs.map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={filter === t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    "h-7 shrink-0 rounded border px-2.5 text-[12px] font-medium",
                    filter === t.key ? "border-accent bg-accent-tint text-accent" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                  )}
                >
                  {t.label} <span className="font-mono text-[11px] opacity-70">{t.n}</span>
                </button>
              ))}
            </div>
          )}

          {!hasContent ? <Panel><NoFindings review={review} demo={demo} /></Panel> : visible.map(f => <FindingCard key={f.key} f={f} filename={review.filename} />)}

          {filter === "all" && unmatchedFixes.length > 0 && (
            <Panel>
              <PanelHeader title="Suggested fixes" />
              <ul>
                {unmatchedFixes.map((fx, i) => (
                  <li key={i} className="space-y-2 border-b border-line px-4 py-3 last:border-0">
                    {fx.issue && <p className="text-[13px] font-medium"><RichText text={fx.issue} /></p>}
                    {fx.fix && <FixBlock text={fx.fix} />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader title="Details" />
            <dl className="space-y-3 px-4 py-3 text-[13px]">
              <div><dt className="text-[12px] text-ink-3">Repository</dt><dd className="mt-0.5 break-all">{review.repo}</dd></div>
              <div><dt className="text-[12px] text-ink-3">File</dt><dd className="mt-0.5 break-all font-mono text-[12px]">{review.filename}</dd></div>
              {rj.confidence_overall && <div><dt className="text-[12px] text-ink-3">Overall confidence</dt><dd className="mt-0.5">{rj.confidence_overall}</dd></div>}
              {(review.retry_count ?? 0) > 0 && <div><dt className="text-[12px] text-ink-3">Retries</dt><dd className="mt-0.5 font-mono">{review.retry_count}</dd></div>}
            </dl>
          </Panel>
          {(rj.positive_observations?.length ?? 0) > 0 && (
            <Panel>
              <PanelHeader title="Positive observations" />
              <ul className="space-y-2 px-4 py-3">
                {rj.positive_observations!.map((p, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-[18px] text-ink-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" /><span><RichText text={p} /></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  )
}