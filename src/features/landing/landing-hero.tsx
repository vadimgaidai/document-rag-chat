import { Link } from "@tanstack/react-router"
import { Bot } from "lucide-react"
import { motion } from "motion/react"

import { AuroraText } from "@/components/ui/aurora-text"
import { buttonVariants } from "@/components/ui/button"
import { LandingSection } from "@/features/landing/landing-section"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { m } from "@/paraglide/messages"

const ease = [0.16, 1, 0.3, 1] as const

const HeroTitles = () => (
  <div className="flex w-full max-w-3xl flex-col items-center overflow-hidden pt-8">
    <motion.h1
      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      className="text-center text-4xl/tight font-semibold tracking-tighter text-foreground sm:text-5xl md:text-6xl"
      initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
      transition={{ duration: 1, ease }}
    >
      <AuroraText className="font-bold">{m.app_title()}</AuroraText> — {m.landing_hero_heading()}
    </motion.h1>
    <motion.p
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl text-center leading-normal text-balance text-muted-foreground sm:text-lg/normal"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.6, duration: 0.8, ease }}
    >
      {m.landing_hero_subheading()}
    </motion.p>
  </div>
)

const HeroCta = () => (
  <motion.div
    animate={{ opacity: 1, y: 0 }}
    className="relative mt-6 flex justify-center"
    initial={{ opacity: 0, y: 20 }}
    transition={{ delay: 0.8, duration: 0.8, ease }}
  >
    <Link
      className={cn(buttonVariants({ variant: "default" }), "flex gap-2 rounded-lg")}
      to={ROUTES.chat}
    >
      <Bot aria-hidden="true" className="size-5" />
      {m.landing_hero_cta()}
    </Link>
  </motion.div>
)

export const LandingHero = () => (
  <LandingSection id="hero">
    <div className="flex w-full flex-col items-center overflow-hidden border-x p-6 lg:p-12">
      <HeroTitles />
      <HeroCta />
    </div>
  </LandingSection>
)
