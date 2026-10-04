import { Info } from "lucide-react"

/** Shown whenever a page is rendering the saved demo snapshot instead of live backend data. */
export function DemoNotice() {
  return (
    <div role="status" className="mb-5 flex items-start gap-2.5 rounded border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-2">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p>
        <span className="font-medium text-ink">Demo data.</span> The review backend is offline, so this page shows a saved snapshot of real
        reviews. Live data appears automatically when the backend is running.
      </p>
    </div>
  )
}