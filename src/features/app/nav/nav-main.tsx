import { Link } from "@tanstack/react-router"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { NAV_ITEMS } from "@/features/app/nav/nav-items"
import type { INavItem } from "@/features/app/nav/nav-items"

export const NavMain = ({ items = NAV_ITEMS }: { items?: INavItem[] }) => (
  <SidebarMenu>
    {items.map((item) => (
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
