import handler from "@tanstack/react-start/server-entry"

import { paraglideMiddleware } from "@/paraglide/server.js"

export default {
  fetch(request: Request) {
    // The router owns URL localization through its `rewrite` pair, so the
    // ORIGINAL request is handed on. Passing the middleware's de-localized
    // request instead would make both sides strip the prefix and loop.
    // Paraglide still resolves the locale here and puts it in async local
    // storage, which is what makes `getLocale()` work during SSR.
    return paraglideMiddleware(request, () => handler.fetch(request))
  },
}
