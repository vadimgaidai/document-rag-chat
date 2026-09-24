import { Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { LandingMobileNav } from "@/features/landing/landing-mobile-nav"
import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

export const LandingHeader = () => (
  <header className="sticky top-0 z-50 border-b bg-background/60 backdrop-blur-sm">
    <div className="container mx-auto flex items-center justify-between p-2">
      <Link className="relative mr-6 flex items-center gap-2" to={ROUTES.home}>
        <Bot aria-hidden="true" className="size-5" />
        <span className="text-lg font-semibold">{m.app_title()}</span>
      </Link>
      <div className="hidden items-center gap-2 lg:flex">
        <ThemeToggle />
        <LocaleSwitcher variant="inline" />
      </div>
      <div className="lg:hidden">
        <LandingMobileNav />
      </div>
    </div>
  </header>
)
