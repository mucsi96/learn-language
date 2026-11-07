import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@mucsi96/react-ui';

export function useAction<T>(action: (input: T) => Promise<unknown>, onSuccess?: () => void) {
  const client = useQueryClient();
  const notifications = useNotifications();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await client.invalidateQueries();
      onSuccess?.();
    },
    onError: (error: Error) => notifications.error(error.message),
  });
}
