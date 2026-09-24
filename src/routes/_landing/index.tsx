import { createFileRoute } from "@tanstack/react-router"

import { LandingCtaBanner } from "@/features/landing/landing-cta-banner"
import { LandingFeaturesGrid } from "@/features/landing/landing-features-grid"
import { LandingFooter } from "@/features/landing/landing-footer"
import { LandingHero } from "@/features/landing/landing-hero"
import { LandingUseCases } from "@/features/landing/landing-use-cases"

const LandingHome = () => (
  <div className="flex flex-1 flex-col">
    <LandingHero />
    <LandingUseCases />
    <LandingFeaturesGrid />
    <LandingCtaBanner />
    <LandingFooter />
  </div>
)

export const Route = createFileRoute("/_landing/")({ component: LandingHome })
