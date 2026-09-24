import { memo } from "react"

interface IAuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}

export const AuroraText = memo(
  ({
    children,
    className = "",
    colors = [
      "var(--color-1)",
      "var(--color-2)",
      "var(--color-3)",
      "var(--color-4)",
      "var(--color-5)",
    ],
    speed = 1,
  }: IAuroraTextProps) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${10 / speed}s`,
    }

    return (
      <span className={`relative inline-block ${className}`}>
        <span className="sr-only">{children}</span>
        <span
          aria-hidden="true"
          className="relative animate-aurora bg-size-[200%_auto] bg-clip-text text-transparent"
          style={gradientStyle}
        >
          {children}
        </span>
      </span>
    )
  },
)

AuroraText.displayName = "AuroraText"
