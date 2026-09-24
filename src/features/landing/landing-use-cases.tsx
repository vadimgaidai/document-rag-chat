import {
  AlertTriangle,
  BrainCircuit,
  FileUp,
  Info,
  Layers,
  ListFilter,
  MessagesSquare,
  Quote,
  Search,
  XCircle,
} from "lucide-react"
import { cubicBezier, motion } from "motion/react"

import OrbitingCircles from "@/components/ui/orbiting-circles"
import { LandingSection } from "@/features/landing/landing-section"
import { m } from "@/paraglide/messages"

const containerVariants = {
  initial: {},
  whileHover: { transition: { staggerChildren: 0.1 } },
}

const stackItemVariants = {
  initial: (index: number) => ({
    y: 0,
    scale: index === 2 ? 0.9 : 1,
    opacity: 1,
    transition: { delay: 0.05, duration: 0.2, ease: cubicBezier(0.22, 1, 0.36, 1) },
  }),
  whileHover: (index: number) => ({
    y: -50,
    opacity: index === 2 ? 1 : 0.6,
    scale: index === 0 ? 0.85 : index === 2 ? 1.1 : 1,
    transition: { delay: 0.05, duration: 0.2, ease: cubicBezier(0.22, 1, 0.36, 1) },
  }),
}

const GroundedCard = () => (
  <div className="border-b lg:border-r lg:border-b-0">
    <motion.div
      animate="initial"
      className="flex size-full cursor-pointer flex-col items-center justify-between gap-y-5"
      initial="initial"
      variants={containerVariants}
      whileHover="whileHover"
    >
      <div className="flex h-4/5 w-full items-center justify-center overflow-hidden border-b bg-transparent">
        <motion.div className="flex h-[220px] w-full flex-col justify-center gap-y-3 overflow-hidden p-5">
          {[
            { icon: MessagesSquare, text: m.landing_usecases_grounded_question() },
            { icon: BrainCircuit, text: m.landing_usecases_grounded_answer() },
            { icon: Quote, text: m.landing_usecases_grounded_source() },
          ].map(({ icon: Icon, text }, index) => (
            <motion.div
              key={text}
              className="flex w-full origin-bottom items-center rounded-md border border-border bg-transparent p-4 shadow-[0px_0px_40px_-25px_rgba(0,0,0,0.25)] backdrop-blur-md"
              custom={index}
              variants={stackItemVariants}
            >
              <div className="mr-3 shrink-0">
                <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-foreground">{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="flex w-full flex-col items-start gap-y-1 px-5 pb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {m.landing_usecases_grounded_title()}
        </h2>
        <p className="text-sm text-muted-foreground">{m.landing_usecases_grounded_description()}</p>
      </div>
    </motion.div>
  </div>
)

const IngestionCard = () => {
  const ingestionLogs = [
    { icon: Info, color: "bg-blue-500", text: m.landing_usecases_ingestion_log_queued() },
    { icon: Layers, color: "bg-green-500", text: m.landing_usecases_ingestion_log_chunking() },
    {
      icon: BrainCircuit,
      color: "bg-purple-500",
      text: m.landing_usecases_ingestion_log_embedding(),
    },
    { icon: AlertTriangle, color: "bg-yellow-500", text: m.landing_usecases_ingestion_log_slow() },
    { icon: XCircle, color: "bg-red-500", text: m.landing_usecases_ingestion_log_failed() },
  ]

  return (
    <div className="border-b lg:border-r lg:border-b-0">
      <motion.div
        animate="initial"
        className="flex size-full cursor-pointer flex-col items-center justify-between gap-y-5"
        initial="initial"
        variants={containerVariants}
        whileHover="whileHover"
      >
        <div className="flex h-4/5 w-full items-center justify-center overflow-hidden border-b bg-transparent">
          <motion.div className="flex h-[270px] w-full flex-col gap-y-3.5 overflow-hidden rounded-t-md p-5">
            {ingestionLogs.map(({ icon: Icon, color, text }, index) => (
              <motion.div
                key={text}
                className="flex w-full origin-right items-center rounded-md border border-border bg-transparent p-4 shadow-[0px_0px_40px_-25px_rgba(0,0,0,0.25)] backdrop-blur-md"
                custom={index}
                transition={{ type: "spring", damping: 40, stiffness: 600 }}
                variants={stackItemVariants}
              >
                <div
                  className={`mr-3 flex size-8 shrink-0 items-center justify-center rounded-full ${color}`}
                >
                  <Icon aria-hidden="true" className="size-5 text-white" />
                </div>
                <p className="grow text-xs text-muted-foreground">{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <div className="flex w-full flex-col items-start gap-y-1 px-5 pb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {m.landing_usecases_ingestion_title()}
          </h2>
          <p className="text-sm text-muted-foreground">
            {m.landing_usecases_ingestion_description()}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const pipelineOrbits = [
  { icon: FileUp, color: "bg-blue-500", radius: 40, duration: 15, delay: 0, reverse: true },
  { icon: Layers, color: "bg-green-500", radius: 80, duration: 15, delay: 20 },
  { icon: Search, color: "bg-purple-500", radius: 120, duration: 20, delay: 20 },
  { icon: ListFilter, color: "bg-yellow-500", radius: 160, duration: 40, delay: 20 },
  { icon: MessagesSquare, color: "bg-red-500", radius: 200, duration: 30, delay: 0 },
]

const PipelineCard = () => (
  <div className="min-h-[500px] overflow-hidden lg:min-h-fit">
    <div className="flex size-full flex-col items-center justify-between gap-y-5">
      <div className="flex h-4/5 w-full items-center justify-center overflow-hidden rounded-t-xl border-b">
        <div className="relative flex size-full items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--accent)/0.3)_0%,transparent_100%)]" />
          {pipelineOrbits.map(({ icon: Icon, color, radius, duration, delay, reverse }) => (
            <OrbitingCircles
              key={radius}
              delay={delay}
              duration={duration}
              radius={radius}
              reverse={reverse}
            >
              <div className={`flex size-8 items-center justify-center rounded-full ${color}`}>
                <Icon aria-hidden="true" className="size-5 text-white" />
              </div>
            </OrbitingCircles>
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-y-1 px-5 pb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {m.landing_usecases_pipeline_title()}
        </h2>
        <p className="text-sm text-muted-foreground">{m.landing_usecases_pipeline_description()}</p>
      </div>
    </div>
  </div>
)

export const LandingUseCases = () => (
  <LandingSection id="use-cases" title={m.landing_usecases_kicker()}>
    <div className="grid h-full border border-b-0 lg:grid-cols-3">
      <GroundedCard />
      <IngestionCard />
      <PipelineCard />
    </div>
  </LandingSection>
)
