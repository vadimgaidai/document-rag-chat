import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"

import appCss from "../styles.css?url"

import type { QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"

interface IRouterContext {
  queryClient: QueryClient
}

const RootDocument = ({ children }: { children: ReactNode }) => (
  <html lang={getLocale()}>
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <TanStackDevtools
        config={{ position: "bottom-right" }}
        plugins={[
          { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
          { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
        ]}
      />
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRouteWithContext<IRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: m.app_title() },
      { name: "description", content: m.app_intro() },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
})
