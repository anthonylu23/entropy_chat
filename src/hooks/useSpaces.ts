import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  SpacesCreateRequest,
  SpacesReorderRequest,
  SpacesUpdateRequest,
} from '@shared/types'
import { requireEntropyApi } from '@renderer/lib/ipc'
import { useUiStore } from '@renderer/stores/uiStore'

const SPACE_QUERY_KEYS = {
  spaces: ['spaces'] as const,
}

export function useSpaces() {
  return useQuery({
    queryKey: SPACE_QUERY_KEYS.spaces,
    queryFn: () => requireEntropyApi().spaces.list(),
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  const setActiveSpace = useUiStore((s) => s.setActiveSpace)

  return useMutation({
    mutationFn: (input: SpacesCreateRequest) => requireEntropyApi().spaces.create(input),
    onSuccess: (created) => {
      setActiveSpace(created.id)
      void queryClient.invalidateQueries({ queryKey: SPACE_QUERY_KEYS.spaces })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SpacesUpdateRequest) => requireEntropyApi().spaces.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SPACE_QUERY_KEYS.spaces })
    },
  })
}

export function useReorderSpaces() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SpacesReorderRequest) => requireEntropyApi().spaces.reorder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SPACE_QUERY_KEYS.spaces })
    },
  })
}

export { SPACE_QUERY_KEYS }
