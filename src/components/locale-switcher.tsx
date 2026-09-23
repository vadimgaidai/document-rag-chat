import { Check, Languages } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { m } from "@/paraglide/messages"
import { getLocale, locales, setLocale } from "@/paraglide/runtime"

/**
 * Switches the active locale. The locale lives in the URL, so `setLocale`
 * navigates to the localized address; the server resolves it again on the next
 * request and SSR keeps matching the client.
 */
export const LocaleSwitcher = () => {
  const currentLocale = getLocale()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={m.language_label()}>
              <Languages aria-hidden="true" />
              <span>{currentLocale.toUpperCase()}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40" side="top">
            {locales.map((locale) => (
              <DropdownMenuItem
                key={locale}
                onSelect={() => {
                  // Navigates away, so there is nothing left to await here.
                  void setLocale(locale)
                }}
              >
                {locale.toUpperCase()}
                {locale === currentLocale && (
                  <Check aria-hidden="true" className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
