import { Check, Languages } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useLocaleOptions } from "@/hooks/use-locale-options"
import { m } from "@/paraglide/messages"

interface ILocaleSwitcherProps {
  /** `"sidebar"` renders inside a `Sidebar`/`SidebarProvider` context; `"inline"` is a plain button, for contexts without one. */
  variant?: "sidebar" | "inline"
}

export const LocaleSwitcher = ({ variant = "sidebar" }: ILocaleSwitcherProps) => {
  const { currentLocale, locales, selectLocale } = useLocaleOptions()

  const dropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <SidebarMenuButton tooltip={m.language_label()}>
            <Languages aria-hidden="true" />
            <span>{currentLocale.toUpperCase()}</span>
          </SidebarMenuButton>
        ) : (
          <Button aria-label={m.language_label()} size="sm" variant="ghost">
            <Languages aria-hidden="true" />
            {currentLocale.toUpperCase()}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        className={variant === "sidebar" ? "min-w-40" : undefined}
        side={variant === "sidebar" ? "top" : undefined}
      >
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} onSelect={() => selectLocale(locale)}>
            {locale.toUpperCase()}
            {locale === currentLocale && <Check aria-hidden="true" className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (variant === "inline") return dropdown

  return (
    <SidebarMenu>
      <SidebarMenuItem>{dropdown}</SidebarMenuItem>
    </SidebarMenu>
  )
}
