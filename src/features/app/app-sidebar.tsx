import { Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FOOTER_NAV_ITEMS } from "@/features/app/nav/nav-items"
import { NavMain } from "@/features/app/nav/nav-main"
import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

export const AppSidebar = () => (
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={m.app_title()}>
            <Link aria-label={m.app_title()} to={ROUTES.home}>
              <Bot aria-hidden="true" className="size-6!" />
              <span className="text-base font-semibold">Docs Hub.</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent className="p-2">
      <NavMain />
    </SidebarContent>
    <SidebarFooter>
      <NavMain items={FOOTER_NAV_ITEMS} />
      <LocaleSwitcher />
    </SidebarFooter>
  </Sidebar>
)
