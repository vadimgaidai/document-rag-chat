import { Link, useLocation } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { DOCS_SECTIONS } from "@/features/docs/constants"
import { ROUTES } from "@/lib/routes"

export const DocsToc = () => {
  const { hash } = useLocation()

  return (
    <nav aria-label="On this page" className="flex flex-wrap gap-2">
      {DOCS_SECTIONS.map((section) => (
        <Badge asChild key={section.id} variant={section.id === hash ? "default" : "outline"}>
          <Link hash={section.id} to={ROUTES.docs}>
            {section.title}
          </Link>
        </Badge>
      ))}
    </nav>
  )
}
