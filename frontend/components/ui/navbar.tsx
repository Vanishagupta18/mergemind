import Link from "next/link"

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
        <path d="M50 18 L62 25 L62 39 L50 46 L38 39 L38 25 Z" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M50 46 L62 53 L62 67 L50 74 L38 67 L38 53 Z" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M62 25 L74 18 L86 25 L86 39 L74 46 L62 39" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <path d="M38 25 L26 18 L14 25 L14 39 L26 46 L38 39" stroke="url(#logoGrad)" strokeWidth="3" fill="none"/>
        <circle cx="50" cy="18" r="3.5" fill="#6366F1"/>
        <circle cx="62" cy="25" r="3" fill="#6366F1"/>
        <circle cx="38" cy="25" r="3" fill="#6366F1"/>
        <circle cx="50" cy="74" r="4" fill="#10B981"/>
        <circle cx="14" cy="32" r="3" fill="#7C3AED"/>
        <circle cx="86" cy="32" r="3" fill="#7C3AED"/>
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

const NAV_LINKS = [
  { href: "/",        label: "Overview" },
  { href: "/reviews", label: "Reviews"  },
  { href: "/repos",   label: "Repos"    },
]

export function Navbar({ active }: { active: string }) {
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
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active === label
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}