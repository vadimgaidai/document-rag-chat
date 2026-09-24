import { forwardRef } from "react"

import { cn } from "@/lib/utils"

interface IBorderTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string
}

export const BorderText = forwardRef<HTMLDivElement, IBorderTextProps>(
  ({ text, className, ...props }, ref) => (
    <div className="flex items-center justify-center">
      <span
        ref={ref}
        className={cn(
          "pointer-events-none relative text-center font-mono text-[6rem] leading-none font-bold",
          "before:bg-linear-to-b before:from-neutral-300 before:to-neutral-200/70 before:to-80% before:bg-clip-text before:text-transparent before:content-(--text)",
          "dark:before:from-neutral-700/70 dark:before:to-neutral-800/30",
          "after:absolute after:inset-0 after:bg-neutral-400/70 after:bg-clip-text after:text-transparent after:mix-blend-darken after:content-(--text) after:[text-shadow:0_1px_0_white]",
          "dark:after:bg-neutral-600/70 dark:after:mix-blend-lighten dark:after:[text-shadow:0_1px_0_black]",
          className,
        )}
        style={{ "--text": `'${text}'` } as React.CSSProperties}
        {...props}
      />
    </div>
  ),
)

BorderText.displayName = "BorderText"
