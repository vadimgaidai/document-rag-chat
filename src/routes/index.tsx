import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/lib/routes"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: ROUTES.knowledgeBase })
  },
})
