import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TDocsBlock } from "@/features/docs/types"
import { InlineText } from "@/features/docs/utils/inline-text"

export const DocsBlock = ({ block }: { block: TDocsBlock }) => {
  if (block.kind === "heading") {
    return <h3 className="mt-2 text-base font-medium">{block.text}</h3>
  }

  if (block.kind === "list") {
    const items = block.items.map((item, index) => (
      <li key={index}>
        <InlineText text={item} />
      </li>
    ))

    return block.ordered ? (
      <ol className="list-decimal pl-5 text-sm/relaxed [&>li+li]:mt-2">{items}</ol>
    ) : (
      <ul className="list-disc pl-5 text-sm/relaxed [&>li+li]:mt-2">{items}</ul>
    )
  }

  if (block.kind === "table") {
    return (
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {block.head.map((cell) => (
                <TableHead key={cell}>{cell}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell className="align-top whitespace-normal" key={cellIndex}>
                    <InlineText text={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (block.kind === "code") {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        <code>{block.text}</code>
      </pre>
    )
  }

  return (
    <p className="text-sm/relaxed">
      <InlineText text={block.text} />
    </p>
  )
}
