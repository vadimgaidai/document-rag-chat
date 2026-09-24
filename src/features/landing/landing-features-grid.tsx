import { Ban, Cloud, Layers, ListFilter, Quote, ShieldCheck } from "lucide-react"

import { LandingSection } from "@/features/landing/landing-section"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"

export const LandingFeaturesGrid = () => {
  const features = [
    {
      icon: Layers,
      title: m.landing_features_hybrid_title(),
      description: m.landing_features_hybrid_description(),
    },
    {
      icon: ListFilter,
      title: m.landing_features_rerank_title(),
      description: m.landing_features_rerank_description(),
    },
    {
      icon: Quote,
      title: m.landing_features_citations_title(),
      description: m.landing_features_citations_description(),
    },
    {
      icon: ShieldCheck,
      title: m.landing_features_verified_title(),
      description: m.landing_features_verified_description(),
    },
    {
      icon: Ban,
      title: m.landing_features_abstain_title(),
      description: m.landing_features_abstain_description(),
    },
    {
      icon: Cloud,
      title: m.landing_features_serverless_title(),
      description: m.landing_features_serverless_description(),
    },
  ]

  return (
    <LandingSection id="features" title={m.landing_features_kicker()}>
      <div className="border-x border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className={cn(
                "flex flex-col items-center justify-center gap-y-2 border-b px-4 py-8 transition-colors last:border-b-0 hover:bg-secondary/20",
                "md:nth-[2n+1]:border-r md:nth-[n+5]:border-b-0",
                "lg:border-r lg:nth-[3n]:border-r-0 lg:nth-[n+4]:border-b-0",
              )}
            >
              <div className="flex flex-col items-center gap-y-2">
                <div className="rounded-lg bg-linear-to-b from-primary to-primary/80 p-2 text-primary-foreground">
                  <Icon aria-hidden="true" className="size-6" />
                </div>
                <h2 className="text-center text-xl font-medium text-balance text-card-foreground">
                  {title}
                </h2>
              </div>
              <p className="mx-auto max-w-md text-center text-sm text-balance text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </LandingSection>
  )
}
