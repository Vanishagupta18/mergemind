"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ReviewDetail() {
  const params = useParams()
  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params?.id) return
    fetch(`${API}/api/reviews/${params.id}`)
      .then(r => r.json())
      .then(data => { setReview(data); setLoading(false) })
  }, [params?.id])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading review...</p>
    </div>
  )

  if (!review || review.error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400 text-sm">Review not found.</p>
    </div>
  )

  const rj = review.review_json || {}

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-xs font-bold">M</div>
          <span className="font-semibold">MergeMind</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <a href="/" className="hover:text-white">Overview</a>
          <a href="/reviews" className="hover:text-white">Reviews</a>
          <a href="/repos" className="hover:text-white">Repos</a>
        </div>
      </nav>

      <div className="px-8 py-8 max-w-4xl mx-auto">
        {/* Back */}
        <a href="/reviews" className="text-gray-500 text-sm hover:text-white mb-6 inline-block">
          ← Back to reviews
        </a>

        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{review.pr_title}</h1>
              <p className="text-gray-400 text-sm mt-1">{review.repo} · PR #{review.pr_number}</p>
              <p className="text-gray-500 text-xs font-mono mt-1">{review.filename}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-400">{review.quality_score.toFixed(1)}</p>
              <p className="text-gray-500 text-xs">/ 10</p>
            </div>
          </div>
        </div>

        {/* Critical Bugs */}
        {rj.critical_bugs?.length > 0 && (
          <Section title="🚨 Critical Bugs" color="red">
            {rj.critical_bugs.map((b: any, i: number) => (
              <IssueCard key={i} item={b} />
            ))}
          </Section>
        )}

        {/* Logic Errors */}
        {rj.logic_errors?.length > 0 && (
          <Section title="⚠️ Logic Errors" color="yellow">
            {rj.logic_errors.map((b: any, i: number) => (
              <IssueCard key={i} item={b} />
            ))}
          </Section>
        )}

        {/* Security */}
        {rj.security_issues?.length > 0 && (
          <Section title="🔒 Security Issues" color="orange">
            {rj.security_issues.map((b: any, i: number) => (
              <IssueCard key={i} item={b} />
            ))}
          </Section>
        )}

        {/* Suggested Fixes */}
        {rj.suggested_fixes?.length > 0 && (
          <Section title="💡 Suggested Fixes" color="blue">
            {rj.suggested_fixes.map((f: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 mb-2">
                <p className="text-sm text-white">{f.issue}</p>
                <p className="text-xs text-indigo-300 mt-1">Fix: {f.fix}</p>
              </div>
            ))}
          </Section>
        )}

        {/* Positive */}
        {rj.positive_observations?.length > 0 && (
          <Section title="✅ Positive Observations" color="green">
            <ul className="space-y-1">
              {rj.positive_observations.map((p: string, i: number) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-green-400">•</span> {p}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, color, children }: {
  title: string; color: string; children: React.ReactNode
}) {
  const borderMap: Record<string, string> = {
    red: "border-red-500/30", yellow: "border-yellow-500/30",
    orange: "border-orange-500/30", blue: "border-indigo-500/30",
    green: "border-green-500/30"
  }
  return (
    <div className={`bg-gray-900 border ${borderMap[color] || "border-gray-800"} rounded-xl p-6 mb-4`}>
      <h2 className="font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function IssueCard({ item }: { item: any }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white flex-1">{item.issue}</p>
        {item.line && (
          <span className="text-xs font-mono bg-gray-700 text-gray-400 px-2 py-0.5 rounded shrink-0">
            L{item.line}
          </span>
        )}
      </div>
      {item.reasoning && <p className="text-xs text-gray-400 mt-1">{item.reasoning}</p>}
      {item.confidence && (
        <span className="text-xs text-indigo-400 mt-1 inline-block">
          Confidence: {item.confidence}
        </span>
      )}
    </div>
  )
}