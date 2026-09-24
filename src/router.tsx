import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { createQueryClient } from "@/lib/query/client"
import { deLocalizeUrl, localizeUrl } from "@/paraglide/runtime"

import { routeTree } from "./routeTree.gen"

export const getRouter = () => {
  const queryClient = createQueryClient()

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // The locale lives in the URL (`/de/...`). The router matches routes
    // against the de-localized path and writes the localized one back to
    // history, so route files never spell out a locale segment.
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  // Official Start <-> Query wiring: it installs the single QueryClientProvider
  // and handles dehydration/hydration. Do not add a second provider or
  // serialise the cache by hand.
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
