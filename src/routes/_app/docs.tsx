import { createFileRoute } from "@tanstack/react-router"

import { DocsPage } from "@/features/docs"

const DocsRoute = () => <DocsPage />

export const Route = createFileRoute("/_app/docs")({ component: DocsRoute })
