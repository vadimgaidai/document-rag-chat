import { Outlet, createFileRoute } from "@tanstack/react-router"

import { LandingHeader } from "@/features/landing/landing-header"

const LandingLayout = () => (
  <div className="flex flex-1 flex-col">
    <LandingHeader />
    <Outlet />
  </div>
)

export const Route = createFileRoute("/_landing")({ component: LandingLayout })
