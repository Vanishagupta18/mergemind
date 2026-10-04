import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { Review } from "@/lib/api"
import { formatDate } from "@/lib/api"
import { ScoreChip, StatusChip } from "@/components/app/ui"

const repoName = (full: string) => full.split("/")[1] || full

/** Desktop: table. Mobile/tablet-portrait: stacked rows (not a shrunken table). */
export function ReviewTable({ reviews }: { reviews: Review[] }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-subtle text-[12px] font-medium text-ink-2">
              <th className="px-4 py-2.5 font-medium">Repository</th>
              <th className="px-4 py-2.5 font-medium">Pull request</th>
              <th className="px-4 py-2.5 font-medium">File</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Reviewed</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id} className="group border-b border-line last:border-0 hover:bg-subtle">
                <td className="px-4 py-3 align-top">
                  <Link href={`/reviews/${r.id}`} className="font-medium hover:text-accent">{repoName(r.repo)}</Link>
                </td>
                <td className="max-w-[320px] px-4 py-3 align-top">
                  <Link href={`/reviews/${r.id}`} className="block truncate">
                    <span className="mr-1.5 font-mono text-[12px] text-ink-3">#{r.pr_number}</span>{r.pr_title}
                  </Link>
                </td>
                <td className="max-w-[180px] px-4 py-3 align-top">
                  <span className="block truncate font-mono text-[12px] text-ink-2" title={r.filename}>{r.filename}</span>
                </td>
                <td className="px-4 py-3 align-top"><StatusChip status={r.status} /></td>
                <td className="px-4 py-3 align-top"><ScoreChip score={r.quality_score} /></td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-ink-2">{formatDate(r.created_at)}</td>
                <td className="pr-3 align-top pt-3.5">
                  <ChevronRight className="h-4 w-4 text-ink-3 group-hover:text-ink" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden">
        {reviews.map(r => (
          <li key={r.id} className="border-b border-line last:border-0">
            <Link href={`/reviews/${r.id}`} className="block px-4 py-3 active:bg-subtle">
              <p className="text-[13px] font-medium leading-[18px]">
                <span className="mr-1.5 font-mono text-[12px] font-normal text-ink-3">#{r.pr_number}</span>{r.pr_title}
              </p>
              <p className="mt-1 truncate text-[12px] text-ink-2">
                {r.repo} · <span className="font-mono">{r.filename}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusChip status={r.status} />
                <ScoreChip score={r.quality_score} />
                <span className="ml-auto text-[12px] text-ink-3">{formatDate(r.created_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export function ReviewTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading reviews">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-0">
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-bg" />
          <div className="h-3 flex-1 animate-pulse rounded bg-neutral-bg" />
          <div className="hidden h-5 w-16 animate-pulse rounded bg-neutral-bg sm:block" />
        </div>
      ))}
    </div>
  )
}
