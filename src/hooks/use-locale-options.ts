import { getLocale, locales, setLocale } from "@/paraglide/runtime"

export const useLocaleOptions = () => {
  const currentLocale = getLocale()

  return {
    currentLocale,
    locales,
    selectLocale: (locale: (typeof locales)[number]) => {
      void setLocale(locale)
    },
  }
}
