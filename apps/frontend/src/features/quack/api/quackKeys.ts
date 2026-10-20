export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search?: string, isMine = false) =>
    [...quackKeys.lists(), { search: search ?? "", mine: isMine }] as const,
}
