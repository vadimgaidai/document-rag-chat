import { Link } from "@tanstack/react-router"

import { NAV_ITEMS } from "@/components/nav/nav-items"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export const NavMain = () => (
  <SidebarMenu>
    {NAV_ITEMS.map((item) => (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild tooltip={item.label()}>
          <Link
            activeProps={{
              className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            }}
            to={item.to}
          >
            <item.icon aria-hidden="true" />
            <span>{item.label()}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </SidebarMenu>
)
