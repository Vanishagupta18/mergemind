"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { GitPullRequest, Search, ArrowUpRight, Clock, Filter } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Review {
  id: string
  repo: string
  pr_number: number
  pr_title: string
  filename: string
  quality_score: number | null   // was: number
  status: string
  created_at: string
}
function ScoreChip({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 bg-slate-500/10 ring-slate-500/20 text-slate-500">
        —
      </span>
    )
  }
  const cfg =
    score >= 7 ? { text: "text-emerald-400", bg: "bg-emerald-400/10 ring-emerald-400/20" } :
    score >= 4 ? { text: "text-amber-400",   bg: "bg-amber-400/10 ring-amber-400/20" } :
                 { text: "text-red-400",      bg: "bg-red-400/10 ring-red-400/20" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text}`}>
      {score.toFixed(1)}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const cfg =
    status === "completed" ? { text: "text-emerald-400", bg: "bg-emerald-400/10 ring-emerald-400/20", dot: "bg-emerald-400" } :
    status === "pending"   ? { text: "text-amber-400",   bg: "bg-amber-400/10 ring-amber-400/20",   dot: "bg-amber-400" } :
                             { text: "text-red-400",      bg: "bg-red-400/10 ring-red-400/20",      dot: "bg-red-400" }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  )
}

// function Navbar({ active }: { active: string }) {
//   return (
//     <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0B1120]/80 backdrop-blur-md">
//       <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
//             <span className="text-white text-xs font-bold">M</span>
//           </div>
//           <span className="font-semibold text-slate-100 tracking-tight">MergeMind</span>
//         </div>
//         <div className="flex items-center gap-1">
//           {[
//             { href: "/", label: "Overview" },
//             { href: "/reviews", label: "Reviews" },
//             { href: "/repos", label: "Repos" },
//           ].map(({ href, label }) => (
//             <Link key={href} href={href}
//               className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
//                 active === label
//                   ? "bg-slate-800 text-slate-100"
//                   : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
//               }`}
//             >
//               {label}
//             </Link>
//           ))}
//         </div>
//       </div>
//     </nav>
//   )
// }

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`${API}/api/reviews`)
      .then(r => r.json())
      .then(data => { setReviews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = reviews.filter(r =>
    r.pr_title.toLowerCase().includes(search.toLowerCase()) ||
    r.filename.toLowerCase().includes(search.toLowerCase()) ||
    r.repo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0B1120]">
      <Navbar active="Reviews" />
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3 tracking-wide uppercase">
            <GitPullRequest className="w-3 h-3" />
            <span>Pull Requests</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">All PR Reviews</h1>
              <p className="text-sm text-slate-500 mt-1">
                {loading ? "Loading..." : `${filtered.length} review${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 text-sm bg-slate-900/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-6 py-3 border-b border-slate-800 bg-slate-900/50">
            {["PR", "Title", "File", "Repo", "Score", "Status", "Date"].map((h, i) => (
              <div key={h}
                className={`text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 ${
                  i === 0 ? "col-span-1" :
                  i === 1 ? "col-span-3" :
                  i === 2 ? "col-span-2" :
                  i === 3 ? "col-span-2" :
                  i === 4 ? "col-span-1" :
                  i === 5 ? "col-span-2" :
                  "col-span-1"
                }`}
              >
                {h} {i === 4 && <Filter className="w-3 h-3" />}
              </div>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 px-6 py-4 border-b border-slate-800/40 animate-pulse">
                <div className="col-span-1"><div className="h-6 w-8 bg-slate-800 rounded" /></div>
                <div className="col-span-3"><div className="h-3 w-32 bg-slate-800 rounded" /></div>
                <div className="col-span-2"><div className="h-3 w-20 bg-slate-800/60 rounded" /></div>
                <div className="col-span-2"><div className="h-3 w-20 bg-slate-800/60 rounded" /></div>
                <div className="col-span-1"><div className="h-5 w-10 bg-slate-800 rounded" /></div>
                <div className="col-span-2"><div className="h-5 w-16 bg-slate-800 rounded" /></div>
                <div className="col-span-1"><div className="h-3 w-12 bg-slate-800/60 rounded" /></div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <GitPullRequest className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No reviews found</p>
              {search && <p className="text-xs text-slate-600 mt-1">Try a different search term</p>}
            </div>
          ) : (
            filtered.map((review, idx) => (
              <Link key={review.id} href={`/reviews/${review.id}`}
                className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-800/30 transition-colors group cursor-pointer ${
                  idx < filtered.length - 1 ? "border-b border-slate-800/40" : ""
                }`}
              >
                <div className="col-span-1">
                  <span className="inline-flex items-center justify-center w-8 h-7 rounded-md bg-slate-800 ring-1 ring-slate-700 text-xs font-mono text-slate-400">
                    #{review.pr_number}
                  </span>
                </div>
                <div className="col-span-3 pr-4">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                    {review.pr_title}
                  </p>
                </div>
                <div className="col-span-2 pr-4">
                  <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded truncate block max-w-[120px]">
                    {review.filename}
                  </span>
                </div>
                <div className="col-span-2 pr-4">
                  <p className="text-xs text-slate-500 truncate">{review.repo.split("/")[1]}</p>
                </div>
                <div className="col-span-1">
                  <ScoreChip score={review.quality_score} />
                </div>
                <div className="col-span-2">
                  <StatusChip status={review.status} />
                </div>
                <div className="col-span-1 flex items-center gap-1 justify-between">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}