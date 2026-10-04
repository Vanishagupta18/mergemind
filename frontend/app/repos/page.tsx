"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { FolderGit2 } from "lucide-react"
import { loadRepos, loadReviews, type Repo, type Review } from "@/lib/api"
import { DemoNotice } from "@/components/app/demo-notice"
import { PageHeader, Panel, EmptyState, ErrorState, Skeleton } from "@/components/app/ui"

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    Promise.allSettled([loadRepos(), loadReviews()]).then(([p, r]) => {
      if (p.status === "rejected") setError(true)
      else { setRepos(p.value.data); setDemo(p.value.demo) }
      if (r.status === "fulfilled") setReviews(r.value.data)
      setLoading(false)
    })
  }, [])

  // /api/repos has no review count, so count real review rows per repo from /api/reviews
  const reviewCount = (name: string) => (reviews ? reviews.filter(r => r.repo === name).length : "—")
  const cacheRate = (r: Repo) => {
    const total = r.api_calls_made + r.cache_hits
    return total > 0 ? `${Math.round((r.cache_hits / total) * 100)}%` : "—"
  }

  return (
    <>
      <PageHeader
        title="Repositories"
        description={loading ? "Loading…" : error ? "Unable to load repositories." : `${repos.length} repositor${repos.length !== 1 ? "ies" : "y"} with reviews`}
      />
      {demo && <DemoNotice />}
      <Panel className="overflow-hidden">
        {error ? <ErrorState title="Failed to load repositories" /> :
         loading ? (
           <div aria-busy="true" aria-label="Loading repositories">
             {Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="border-b border-line p-4 last:border-0"><Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-3 w-64" /></div>
             ))}
           </div>
         ) : repos.length === 0 ? (
           <EmptyState title="No repositories yet" hint="Install the MergeMind GitHub App on a repository and open a pull request to get started." />
         ) : (
          <ul>
            {repos.map(r => {
              const [owner, name] = r.repo_name.includes("/") ? r.repo_name.split("/") : ["", r.repo_name]
              const href = `/reviews?repo=${encodeURIComponent(r.repo_name)}`
              return (
                <li key={r.repo_name} className="flex flex-col gap-3 border-b border-line p-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                  <Link href={href} className="group flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line bg-subtle text-ink-2"><FolderGit2 className="h-4 w-4" /></span>
                    <p className="truncate text-[15px] font-semibold leading-5 group-hover:text-accent">
                      {owner && <span className="font-normal text-ink-2">{owner} / </span>}{name}
                    </p>
                  </Link>
                  <dl className="grid grid-cols-3 gap-4 text-[12px] sm:grid-cols-5 lg:flex lg:items-center lg:gap-6">
                    {[
                      ["Reviews", reviewCount(r.repo_name)],
                      ["API calls", r.api_calls_made],
                      ["Cache hits", r.cache_hits],
                      ["Files skipped", r.files_skipped],
                      ["Cache rate", cacheRate(r)],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <dt className="text-ink-3">{label}</dt>
                        <dd className="mt-0.5 font-mono text-[13px] font-medium">{value}</dd>
                      </div>
                    ))}
                    <Link href={href} className="col-span-3 text-[13px] font-medium text-accent hover:text-accent-hover sm:col-span-5 lg:col-span-1 lg:ml-2">View reviews</Link>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}