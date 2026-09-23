import { Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { NavMain } from "@/components/nav/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
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
              <span className="text-base font-semibold">Acme Inc.</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent className="p-2">
      <NavMain />
    </SidebarContent>
    <SidebarFooter>
      <LocaleSwitcher />
    </SidebarFooter>
  </Sidebar>
)
