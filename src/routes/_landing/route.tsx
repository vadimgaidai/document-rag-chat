import { Outlet, createFileRoute } from "@tanstack/react-router"
import { Bot } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { m } from "@/paraglide/messages"

const LandingLayout = () => (
  <div className="flex flex-1 flex-col">
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Bot aria-hidden="true" className="size-5" />
        <span className="text-base font-medium">{m.app_title()}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LocaleSwitcher variant="inline" />
      </div>
    </header>
    <Outlet />
  </div>
)

export const Route = createFileRoute("/_landing")({ component: LandingLayout })
