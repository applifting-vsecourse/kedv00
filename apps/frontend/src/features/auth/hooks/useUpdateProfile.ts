import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"

export type UpdateProfileInput = {
  name: string
  // Left out when unchanged, so saving other fields never touches it.
  username?: string
  bio: string
  // "none" means no default mood; the server stores that as empty.
  defaultMood: string
}

export class UpdateProfileError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { error } = await authClient.updateUser(input)
      if (error) throw new UpdateProfileError(error.message ?? "Could not save", error.code)
    },
    onSuccess: async () => {
      // The new @username shows in the header menu and on every quack. Features
      // may not import each other's query keys, so refresh everything; inactive
      // queries refetch when they are next shown.
      await queryClient.invalidateQueries()
    },
  })
}
