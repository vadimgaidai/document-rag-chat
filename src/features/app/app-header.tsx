import { useLocation } from "@tanstack/react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

const titleByPathname: Record<string, () => string> = {
  [ROUTES.knowledgeBase]: m.knowledge_base_title,
  [ROUTES.chat]: m.chat_title,
}

export const AppHeader = () => {
  const { pathname } = useLocation()
  const title = titleByPathname[pathname]?.() ?? m.app_title()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator className="mr-2 data-[orientation=vertical]:h-4" orientation="vertical" />
      <h1 className="flex-1 text-base font-medium">{title}</h1>
      <ThemeToggle />
    </header>
  )
}
