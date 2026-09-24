import { forwardRef, useRef } from "react"

import FlickeringGrid from "@/components/ui/flickering-grid"
import { cn } from "@/lib/utils"

interface ILandingSectionProps {
  id?: string
  title?: string
  subtitle?: string
  description?: string
  children?: React.ReactNode
  className?: string
  align?: "left" | "center" | "right"
}

export const LandingSection = forwardRef<HTMLElement, ILandingSectionProps>(
  ({ id, title, subtitle, description, children, className, align = "center" }, forwardedRef) => {
    const internalRef = useRef<HTMLElement>(null)
    const ref = forwardedRef || internalRef
    const alignmentClass =
      align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"

    return (
      <section ref={ref} id={id}>
        <div className={cn("relative container mx-auto max-w-container", className)}>
          {(title || subtitle || description) && (
            <div
              className={cn(
                alignmentClass,
                "relative mx-auto overflow-hidden border-x border-t p-2 py-8 md:p-12",
              )}
            >
              {title && (
                <h2 className="text-sm font-semibold tracking-tight text-balance text-muted-foreground uppercase">
                  {title}
                </h2>
              )}
              {subtitle && (
                <h3
                  className={cn(
                    "mx-0 mt-4 max-w-lg text-5xl leading-[1.2] font-bold tracking-tighter text-balance text-foreground lowercase sm:max-w-none sm:text-4xl md:text-5xl lg:text-6xl",
                    align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "",
                  )}
                >
                  {subtitle}
                </h3>
              )}
              {description && (
                <p
                  className={cn(
                    "mt-6 max-w-2xl text-lg/8 text-balance text-muted-foreground",
                    align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "",
                  )}
                >
                  {description}
                </p>
              )}
              <div className="pointer-events-none absolute inset-0 -z-10 size-full bg-linear-to-t from-background from-50%" />
              <FlickeringGrid
                className="absolute inset-0 -z-20 size-full"
                color="#6B7280"
                flickerChance={0.1}
                gridGap={4}
                maxOpacity={0.2}
                squareSize={4}
              />
            </div>
          )}
          {children}
        </div>
      </section>
    )
  },
)

LandingSection.displayName = "LandingSection"
