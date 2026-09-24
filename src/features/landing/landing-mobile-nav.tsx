import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"

export const LandingMobileNav = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button aria-label={m.landing_mobile_nav_open()} size="icon" variant="ghost">
        <Menu aria-hidden="true" className="size-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>{m.app_title()}</SheetTitle>
        <SheetDescription>{m.landing_mobile_nav_description()}</SheetDescription>
      </SheetHeader>
      <nav className="flex flex-col gap-1 px-4">
        <Link
          className="rounded-md p-2 text-sm font-medium hover:bg-accent"
          to={ROUTES.knowledgeBase}
        >
          {m.knowledge_base_title()}
        </Link>
        <Link className="rounded-md p-2 text-sm font-medium hover:bg-accent" to={ROUTES.chat}>
          {m.chat_title()}
        </Link>
        <Link className="rounded-md p-2 text-sm font-medium hover:bg-accent" to={ROUTES.docs}>
          {m.docs_title()}
        </Link>
      </nav>
      <div className="mt-2 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher variant="inline" />
        </div>
        <Link className={cn(buttonVariants({ variant: "default" }))} to={ROUTES.chat}>
          {m.landing_header_cta()}
        </Link>
      </div>
    </SheetContent>
  </Sheet>
)
