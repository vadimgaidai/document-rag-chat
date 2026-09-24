export type TChunk = {
  chunkId: string
  fileId: string
  seq: number
  headingPath: string[]
  startLine: number
  endLine: number
  text: string
}
