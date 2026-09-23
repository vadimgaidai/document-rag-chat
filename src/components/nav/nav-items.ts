import { FileText, MessagesSquare } from "lucide-react"

import { ROUTES } from "@/lib/routes"
import { m } from "@/paraglide/messages"

import type { LucideIcon } from "lucide-react"

export interface INavItem {
  to: typeof ROUTES.knowledgeBase | typeof ROUTES.chat
  label: () => string
  icon: LucideIcon
}

export const NAV_ITEMS: INavItem[] = [
  { to: ROUTES.knowledgeBase, label: m.knowledge_base_title, icon: FileText },
  { to: ROUTES.chat, label: m.chat_title, icon: MessagesSquare },
]
