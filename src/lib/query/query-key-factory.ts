type TQueryKeyFactory<T extends Record<string, (...args: never[]) => readonly unknown[]>> = {
  [K in keyof T]: T[K]
} & {
  all: () => readonly [string]
}

export const createQueryKeyFactory = <
  T extends Record<string, (...args: never[]) => readonly unknown[]>,
>(
  entity: string,
  keys: (all: () => readonly [string]) => T,
): TQueryKeyFactory<T> => {
  const all = () => [entity] as const
  return { all, ...keys(all) }
}
