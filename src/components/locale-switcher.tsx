import { Button } from "@/components/ui/button"
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
    <div aria-label={m.language_label()} className="flex items-center gap-1" role="group">
      {locales.map((locale) => (
        <Button
          key={locale}
          aria-pressed={locale === currentLocale}
          onClick={() => {
            // Navigates away, so there is nothing left to await here.
            void setLocale(locale)
          }}
          size="sm"
          type="button"
          variant={locale === currentLocale ? "secondary" : "ghost"}
        >
          {locale.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}
