import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"
import { LandingSection } from "@/features/landing/landing-section"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"

export const LandingCtaBanner = () => (
  <LandingSection id="cta">
    <div className="relative mx-auto overflow-hidden border py-16 text-center">
      <p className="mx-auto mb-6 max-w-3xl text-3xl font-medium text-balance text-foreground">
        {m.landing_cta_banner_heading()}
      </p>
      <div className="flex justify-center">
        <Link className={cn(buttonVariants({ variant: "default" }))} to={ROUTES.chat}>
          {m.landing_cta_banner_button()}
        </Link>
      </div>
    </div>
  </LandingSection>
)
