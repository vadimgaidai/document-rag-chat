import { createFileRoute } from "@tanstack/react-router"
import { FileText, MessagesSquare } from "lucide-react"

import { LandingCtaCard } from "@/features/landing/landing-cta-card"
import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

const LandingHome = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4 md:p-6">
    <div className="max-w-2xl text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {m.landing_hero_heading()}
      </h1>
      <p className="mt-4 text-muted-foreground">{m.landing_hero_subheading()}</p>
    </div>
    <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
      <LandingCtaCard
        ctaLabel={m.landing_knowledge_base_cta()}
        description={m.landing_knowledge_base_description()}
        href={ROUTES.knowledgeBase}
        icon={FileText}
        title={m.knowledge_base_title()}
      />
      <LandingCtaCard
        ctaLabel={m.landing_chat_cta()}
        description={m.landing_chat_description()}
        href={ROUTES.chat}
        icon={MessagesSquare}
        title={m.chat_title()}
      />
    </div>
  </div>
)

export const Route = createFileRoute("/_landing/")({ component: LandingHome })
