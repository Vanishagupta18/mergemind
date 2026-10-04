import Link from "next/link"
import { AlertCircle, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions, crumb }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; crumb?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumb}
        <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] sm:text-[26px] sm:leading-8 sm:tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-ink-2">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)]", className)}>{children}</section>
}

export function PanelHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <h2 className="text-[15px] font-semibold leading-5">{title}</h2>
      {aside}
    </div>
  )
}

const TONES = {
  ok: "border-ok-line bg-ok-bg text-ok",
  warn: "border-warn-line bg-warn-bg text-warn",
  bad: "border-bad-line bg-bad-bg text-bad",
  high: "border-high-line bg-high-bg text-high",
  neutral: "border-neutral-line bg-neutral-bg text-neutral",
} as const
export type Tone = keyof typeof TONES

export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center whitespace-nowrap rounded border px-1.5 text-[11px] font-semibold leading-none", TONES[tone], className)}>
      {children}
    </span>
  )
}

export function StatusChip({ status }: { status: string }) {
  const tone: Tone = status === "completed" ? "ok" : status === "failed" ? "bad" : "warn"
  return <Tag tone={tone} className="capitalize">{status}</Tag>
}

export function ScoreChip({ score }: { score: number | null }) {
  if (score == null) return <Tag>—</Tag>
  const tone: Tone = score >= 7 ? "ok" : score >= 4 ? "warn" : "bad"
  return <Tag tone={tone} className="font-mono">{score.toFixed(1)}</Tag>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-neutral-bg", className)} />
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <Inbox className="mx-auto mb-3 h-6 w-6 text-ink-3" />
      <p className="text-[13px] font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">{hint}</p>}
    </div>
  )
}

export function ErrorState({ title = "Couldn’t load data", hint = "Make sure the backend is running and NEXT_PUBLIC_API_URL is correct." }: { title?: string; hint?: string }) {
  return (
    <div role="alert" className="px-4 py-14 text-center">
      <AlertCircle className="mx-auto mb-3 h-6 w-6 text-bad" />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">{hint}</p>
    </div>
  )
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-[13px] font-medium text-accent hover:text-accent-hover">{children}</Link>
}
