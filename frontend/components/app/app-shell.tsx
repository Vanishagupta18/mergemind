"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, GitPullRequest, FolderGit2, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { BackendStatus } from "@/components/app/backend-status"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/reviews", label: "Reviews", icon: GitPullRequest },
  { href: "/repos", label: "Repositories", icon: FolderGit2 },
]

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="8" cy="7" r="3" fill="currentColor" stroke="none" />
      <circle cx="8" cy="21" r="3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="14" r="3" fill="currentColor" stroke="none" />
      <path d="M8 10v8" />
      <path d="M8 10a8 8 0 0 0 8 4h1" />
    </svg>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
      <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">Workspace</p>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded px-2 text-[13px] font-medium",
            isActive(href) ? "bg-neutral-bg text-ink" : "text-ink-2 hover:bg-neutral-bg hover:text-ink"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop / laptop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <Link href="/" className="flex h-14 items-center gap-2 border-b border-line px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-white"><Mark className="h-4 w-4" /></span>
          <span className="text-[15px] font-semibold tracking-tight">MergeMind</span>
        </Link>
        <div className="pt-4"><NavList /></div>
        <div className="mt-auto border-t border-line p-3"><BackendStatus className="w-full justify-start" /></div>
      </aside>

      <div className="min-w-0">
        {/* Tablet / mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-white"><Mark className="h-4 w-4" /></span>
            <span className="text-[15px] font-semibold tracking-tight">MergeMind</span>
          </Link>
          <div className="flex items-center gap-2">
            <BackendStatus />
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
              className="flex h-8 w-8 items-center justify-center rounded border border-line text-ink-2 hover:bg-neutral-bg"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </header>
        {open && (
          <div className="border-b border-line bg-surface py-3 lg:hidden">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        )}
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}