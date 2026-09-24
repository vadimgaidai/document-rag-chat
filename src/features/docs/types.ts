export type TDocsParagraphBlock = { kind: "paragraph"; text: string }

export type TDocsHeadingBlock = { kind: "heading"; text: string }

export type TDocsListBlock = { kind: "list"; items: string[]; ordered?: boolean }

export type TDocsTableBlock = { kind: "table"; head: string[]; rows: string[][] }

export type TDocsCodeBlock = { kind: "code"; text: string }

export type TDocsBlock =
  TDocsCodeBlock | TDocsHeadingBlock | TDocsListBlock | TDocsParagraphBlock | TDocsTableBlock

export type TDocsSection = { id: string; title: string; blocks: TDocsBlock[] }

export type TDocsIntro = { title: string; lead: string }
