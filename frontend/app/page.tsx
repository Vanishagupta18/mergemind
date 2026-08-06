"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  GitPullRequest, Database, Zap, RefreshCw,
  TrendingUp, ArrowUpRight, Clock, CheckCircle2,
  Activity, ChevronRight
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Review {
  id: string
  repo: string
  pr_number: number
  pr_title: string
  quality_score: number | null   // was: number
  status: string
  created_at: string
}

interface Stats {
  total_reviews: number
  total_api_calls: number
  total_cache_hits: number
  repos_count: number
  recent_reviews: Review[]
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

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
      <div className="h-3 w-20 bg-slate-800 rounded mb-4" />
      <div className="h-8 w-12 bg-slate-800 rounded" />
    </div>
  )
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0B1120]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
         <MergeMindLogo />
<span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
  BETA
</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { href: "/", label: "Overview" },
            { href: "/reviews", label: "Reviews" },
            { href: "/repos", label: "Repos" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 font-medium"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
function MergeMindLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1"/>
            <stop offset="100%" stopColor="#10B981"/>
          </linearGradient>
        </defs>
        {/* Hexagonal brain mesh */}
        <path d="M50 18 L62 25 L62 39 L50 46 L38 39 L38 25 Z" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M50 46 L62 53 L62 67 L50 74 L38 67 L38 53 Z" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M62 25 L74 18 L86 25 L86 39 L74 46 L62 39" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M38 25 L26 18 L14 25 L14 39 L26 46 L38 39" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        {/* Neural dots */}
        <circle cx="50" cy="18" r="3.5" fill="#6366F1"/>
        <circle cx="62" cy="25" r="3" fill="#6366F1"/>
        <circle cx="38" cy="25" r="3" fill="#6366F1"/>
        <circle cx="50" cy="74" r="4" fill="#10B981"/>
        <circle cx="14" cy="32" r="3" fill="#7C3AED"/>
        <circle cx="86" cy="32" r="3" fill="#7C3AED"/>
        {/* Connection arms */}
        <line x1="50" y1="74" x2="44" y2="88" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="50" y1="74" x2="56" y2="88" stroke="#10B981" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="14" y1="32" x2="4" y2="32" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="86" y1="32" x2="96" y2="32" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="4" cy="32" r="2.5" fill="#7C3AED"/>
        <circle cx="96" cy="32" r="2.5" fill="#7C3AED"/>
        <circle cx="44" cy="88" r="3" fill="#10B981"/>
        <circle cx="56" cy="88" r="2.5" fill="#10B981" opacity="0.7"/>
      </svg>
      <span className="font-bold text-base tracking-tight">
        <span className="text-slate-100">Merge</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Mind</span>
      </span>
    </div>
  )
}
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const kpiCards = [
    {
      label: "Total Reviews",
      value: stats?.total_reviews ?? 0,
      icon: GitPullRequest,
      color: "text-indigo-400",
      ring: "ring-indigo-500/20",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Repos Connected",
      value: stats?.repos_count ?? 0,
      icon: Database,
      color: "text-emerald-400",
      ring: "ring-emerald-500/20",
      bg: "bg-emerald-500/10",
    },
    {
      label: "API Calls",
      value: stats?.total_api_calls ?? 0,
      icon: Zap,
      color: "text-amber-400",
      ring: "ring-amber-500/20",
      bg: "bg-amber-500/10",
    },
    {
      label: "Cache Hits",
      value: stats?.total_cache_hits ?? 0,
      icon: RefreshCw,
      color: "text-violet-400",
      ring: "ring-violet-500/20",
      bg: "bg-violet-500/10",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0B1120]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3 tracking-wide uppercase">
            <Activity className="w-3 h-3" />
            <span>Overview</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered PR review analytics for your repositories
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : kpiCards.map(({ label, value, icon: Icon, color, ring, bg }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <div className={`w-7 h-7 rounded-lg ${bg} ring-1 ${ring} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                </div>
                <div className={`text-3xl font-bold tracking-tight ${color}`}>{value}</div>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>All time</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent Reviews */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Recent PR Reviews</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest AI-reviewed pull requests</p>
            </div>
            <Link
              href="/reviews"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {error ? (
            <div className="px-6 py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-red-400 text-lg">!</span>
              </div>
              <p className="text-sm text-slate-400">Failed to load reviews</p>
              <p className="text-xs text-slate-600 mt-1">Make sure the backend is running on port 8000</p>
            </div>
          ) : loading ? (
            <div className="divide-y divide-slate-800/50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg" />
                    <div>
                      <div className="h-3 w-32 bg-slate-800 rounded mb-2" />
                      <div className="h-2.5 w-24 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-14 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : stats?.recent_reviews?.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <GitPullRequest className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400">No reviews yet</p>
              <p className="text-xs text-slate-600 mt-1">Open a PR on your connected repo to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {stats?.recent_reviews?.map(review => (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-mono text-slate-400">#{review.pr_number}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                        {review.pr_title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{review.repo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <ScoreChip score={review.quality_score} />
                    <StatusChip status={review.status} />
                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600">
                      <Clock className="w-3 h-3" />
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short"
                      })}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}