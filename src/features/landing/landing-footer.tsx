import { Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"

import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

export const LandingFooter = () => (
  <footer className="container mx-auto flex max-w-container flex-col gap-y-5 rounded-lg p-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        <Bot aria-hidden="true" className="size-5" />
        <h2 className="text-lg font-bold text-foreground">{m.app_title()}</h2>
      </div>
      <ul className="flex gap-x-5 text-muted-foreground">
        <li>
          <Link
            className="text-sm font-medium transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
            to={ROUTES.knowledgeBase}
          >
            {m.knowledge_base_title()}
          </Link>
        </li>
        <li>
          <Link
            className="text-sm font-medium transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
            to={ROUTES.chat}
          >
            {m.chat_title()}
          </Link>
        </li>
        <li>
          <Link
            className="text-sm font-medium transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
            to={ROUTES.docs}
          >
            {m.docs_title()}
          </Link>
        </li>
      </ul>
    </div>
    <div className="flex items-center justify-between text-sm font-medium tracking-tight text-muted-foreground">
      <p>{m.landing_footer_bottom_text()}</p>
    </div>
  </footer>
)
