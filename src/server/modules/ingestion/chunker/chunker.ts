import { MarkdownTextSplitter } from "@langchain/textsplitters"
import { toString } from "mdast-util-to-string"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { location } from "vfile-location"

import { HEADING_MAX_CHARS, OVERLAP_CHARS, TARGET_CHARS } from "./chunker.constants"

import type { TChunk } from "./chunker.types"
import type { Root } from "mdast"

type THeading = {
  line: number
  depth: number
  text: string
}

const parser = unified().use(remarkParse).use(remarkGfm)

const headingsOf = (tree: Root): THeading[] =>
  tree.children.flatMap((node) =>
    node.type === "heading" && node.position
      ? [
          {
            line: node.position.start.line,
            depth: node.depth,
            text: toString(node).slice(0, HEADING_MAX_CHARS),
          },
        ]
      : [],
  )

const breadcrumbAt = (headings: readonly THeading[], line: number) => {
  const path: string[] = []
  let depth = Number.POSITIVE_INFINITY
  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings[index]
    if (heading.line > line || heading.depth >= depth) {
      continue
    }
    path.unshift(heading.text)
    depth = heading.depth
  }
  return path
}

export const normalizeNewlines = (source: string) => source.replace(/\r\n/g, "\n")

export const chunkMarkdown = async (source: string, fileId: string): Promise<TChunk[]> => {
  const normalized = normalizeNewlines(source)
  const splitter = new MarkdownTextSplitter({
    chunkSize: TARGET_CHARS,
    chunkOverlap: OVERLAP_CHARS,
  })

  const pieces = await splitter.splitText(normalized)
  const headings = headingsOf(parser.parse(normalized))
  const place = location(normalized)

  const chunks: TChunk[] = []
  let cursor = 0

  for (const piece of pieces) {
    const at = normalized.indexOf(piece, cursor)
    if (at === -1) {
      throw new Error(`${fileId}: chunk ${chunks.length} is not a substring of the source`)
    }

    cursor = at + 1

    const startLine = place.toPoint(at)?.line
    const endLine = place.toPoint(at + piece.length - 1)?.line

    if (startLine === undefined || endLine === undefined) {
      throw new Error(`${fileId}: chunk ${chunks.length} has no line range`)
    }

    chunks.push({
      chunkId: `${fileId}:${chunks.length}`,
      fileId,
      seq: chunks.length,
      headingPath: breadcrumbAt(headings, startLine),
      startLine,
      endLine,
      text: piece,
    })
  }

  return chunks
}
