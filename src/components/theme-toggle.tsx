import { useTheme } from "next-themes"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { m } from "@/paraglide/messages"

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme()

  if (resolvedTheme === undefined) {
    return <div aria-hidden="true" className="size-9" />
  }

  return (
    <AnimatedThemeToggler
      aria-label={m.theme_toggle_label()}
      onThemeChange={setTheme}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  )
}
