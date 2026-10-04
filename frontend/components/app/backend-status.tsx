"use client"
import { useCallback, useEffect, useState } from "react"
import { checkBackend } from "@/lib/api"
import { cn } from "@/lib/utils"

type State = "checking" | "live" | "offline"

/** Small status button. Pings the backend on load, every 30s, and on click. */
export function BackendStatus({ className }: { className?: string }) {
  const [state, setState] = useState<State>("checking")

  const check = useCallback(async () => {
    setState("checking")
    setState((await checkBackend()) ? "live" : "offline")
  }, [])

  useEffect(() => {
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [check])

  const label = state === "checking" ? "Checking backend…" : state === "live" ? "Backend live" : "Backend offline · demo data"
  const dot = state === "live" ? "bg-ok" : state === "offline" ? "bg-warn" : "bg-ink-3"

  return (
    <button
      type="button"
      onClick={check}
      title="Click to re-check the backend"
      className={cn("inline-flex h-7 items-center gap-2 rounded border border-line bg-surface px-2.5 text-[12px] text-ink-2 hover:bg-neutral-bg", className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </button>
  )
}