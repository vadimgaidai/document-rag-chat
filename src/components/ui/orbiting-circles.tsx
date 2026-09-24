import { cn } from "@/lib/utils"

export interface IOrbitingCirclesProps {
  className?: string
  children?: React.ReactNode
  reverse?: boolean
  duration?: number
  delay?: number
  radius?: number
  path?: boolean
}

export default function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: IOrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          className="pointer-events-none absolute inset-0 size-full"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle className="stroke-border stroke-1" cx="50%" cy="50%" fill="none" r={radius} />
        </svg>
      )}

      <div
        className={cn(
          "absolute flex size-8 transform-gpu animate-orbit items-center justify-center rounded-full border border-border bg-background [animation-delay:calc(var(--delay)*1000ms)]",
          { "[animation-direction:reverse]": reverse },
          className,
        )}
        style={
          { "--duration": duration, "--radius": radius, "--delay": -delay } as React.CSSProperties
        }
      >
        {children}
      </div>
    </>
  )
}
