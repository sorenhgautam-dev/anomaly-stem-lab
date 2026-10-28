import Link from "next/link";
import landing from "@/content/landing.json";
import { Logo } from "./Logo";

/* The footer (DESIGN.md §7.1): logo, nav, credits. */

const NAV = [
  { href: "/start", label: "Labs" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#meet-ano", label: "Meet Ano" },
  { href: "/beliefs", label: "My ideas" },
  { href: "/credits", label: landing.footer.credits },
];

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-6 border-t border-ink-900/[0.08] px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <Logo />
        <p className="max-w-sm text-sm text-ink-500">{landing.footer.line}</p>
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/[0.06] hover:text-ink-900">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
