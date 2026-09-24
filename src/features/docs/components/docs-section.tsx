import { Link } from "@tanstack/react-router"
import { Hash } from "lucide-react"

import { DocsBlock } from "@/features/docs/components/docs-block"
import type { TDocsSection } from "@/features/docs/types"
import { ROUTES } from "@/lib/routes"

export const DocsSection = ({ section }: { section: TDocsSection }) => (
  <section className="flex scroll-mt-20 flex-col gap-3" id={section.id}>
    <h2 className="group text-xl font-semibold">
      <Link className="inline-flex items-center gap-2" hash={section.id} to={ROUTES.docs}>
        {section.title}
        <Hash
          aria-hidden="true"
          className="size-4 text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        />
      </Link>
    </h2>
    {section.blocks.map((block, index) => (
      <DocsBlock block={block} key={index} />
    ))}
  </section>
)
