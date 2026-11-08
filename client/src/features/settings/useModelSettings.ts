import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@mucsi96/react-ui';
import type { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { environmentSchema } from '../../api/schemas';

type Environment = z.infer<typeof environmentSchema>;
type Change = { operationType: string } & (
  { kind: 'all' } | { kind: 'model'; modelName: string; isEnabled: boolean; isPrimary?: boolean }
);

function applyChange(config: Environment, change: Change): Environment {
  const current = config.enabledModelsByOperation[change.operationType] ?? [];
  const enabled =
    change.kind === 'all'
      ? config.chatModels.map((model) => model.modelName)
      : change.isEnabled
        ? [...new Set([...current, change.modelName])]
        : current.filter((name) => name !== change.modelName);
  return {
    ...config,
    enabledModelsByOperation: { ...config.enabledModelsByOperation, [change.operationType]: enabled },
    primaryModelByOperation:
      change.kind === 'model' && change.isPrimary
        ? { ...config.primaryModelByOperation, [change.operationType]: change.modelName }
        : config.primaryModelByOperation,
  };
}

export function useModelSettings() {
  const client = useQueryClient();
  const notifications = useNotifications();
  const options = apiQuery('/api/environment', environmentSchema);
  return useMutation({
    mutationFn: (change: Change) =>
      change.kind === 'all'
        ? sendJson(`/api/chat-model-settings/enable-all/${change.operationType}`, 'POST')
        : sendJson('/api/chat-model-settings', 'PUT', {
            modelName: change.modelName,
            operationType: change.operationType,
            isEnabled: change.isEnabled,
            isPrimary: change.isPrimary,
          }),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: options.queryKey });
      const previous = client.getQueryData(options.queryKey);
      if (previous) client.setQueryData(options.queryKey, applyChange(previous, change));
      return previous;
    },
    onError: (error, _change, previous) => {
      if (previous) client.setQueryData(options.queryKey, previous);
      notifications.error(error.message);
    },
    onSettled: () => client.invalidateQueries({ queryKey: options.queryKey }),
  });
}
