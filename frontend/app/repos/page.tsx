"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Database, GitBranch, Zap, RefreshCw, FileCode, ArrowUpRight } from "lucide-react"
import { Navbar } from "@/components/ui/navbar"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Repo {
  repo_name: string
  api_calls_made: number
  cache_hits: number
  files_skipped: number
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/repos`)
      .then(r => r.json())
      .then(data => { setRepos(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const owner = (name: string) => name.split("/")[0] || name
  const repo  = (name: string) => name.split("/")[1] || name

  return (
    <div className="min-h-screen bg-[#0B1120]">
      <Navbar active="Repos" />
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3 tracking-wide uppercase">
            <Database className="w-3 h-3" />
            <span>Repositories</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Connected Repos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? "Loading..." : `${repos.length} repo${repos.length !== 1 ? "s" : ""} connected`}
          </p>
        </div>

        {/* Repo cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded mb-3" />
                <div className="h-3 w-20 bg-slate-800/60 rounded mb-6" />
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(j => <div key={j} className="h-10 bg-slate-800/60 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Database className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">No repositories connected</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
              Install the MergeMind GitHub App on a repo and open a PR to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map(r => (
              <div key={r.repo_name}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 hover:border-slate-700 hover:bg-slate-900/60 transition-all group"
              >
                {/* Repo identity */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20 flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100 group-hover:text-white">
                        {repo(r.repo_name)}
                      </p>
                      <p className="text-xs text-slate-500">{owner(r.repo_name)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    Active
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "API Calls",     value: r.api_calls_made, icon: Zap,       color: "text-amber-400" },
                    { label: "Cache Hits",    value: r.cache_hits,     icon: RefreshCw,  color: "text-violet-400" },
                    { label: "Files Skipped", value: r.files_skipped,  icon: FileCode,   color: "text-slate-400" },
                    {
                      label: "Cache Rate",
                      value: r.api_calls_made > 0
                        ? `${Math.round((r.cache_hits / (r.api_calls_made + r.cache_hits)) * 100)}%`
                        : "0%",
                      icon: ArrowUpRight,
                      color: "text-emerald-400"
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-lg bg-slate-800/60 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-3 h-3 ${color}`} />
                        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                      </div>
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <Link href="/reviews"
                    className="flex items-center justify-between text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    <span>View reviews for this repo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}