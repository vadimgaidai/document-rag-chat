import { Outlet, createFileRoute } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <SiteHeader />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Outlet />
      </div>
    </SidebarInset>
  </SidebarProvider>
)

export const Route = createFileRoute("/_app")({ component: AppLayout })
