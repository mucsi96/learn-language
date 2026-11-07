import { useQuery } from '@tanstack/react-query';
import { Button, Card, Switch } from '@mucsi96/react-ui';
import { apiQuery, sendJson } from '../../api/http';
import { environmentSchema } from '../../api/schemas';
import { useModelSettings } from './useModelSettings';
import { QueryState } from '../../components/QueryState';
import { RateLimits } from './RateLimits';
import { AutosaveNumber } from './AutosaveNumber';
import styles from '../../components/Forms.module.css';

export default function Models({ kind }: { kind: 'image' | 'data' }) {
  const query = useQuery(apiQuery('/api/environment', environmentSchema));
  const settings = useModelSettings();
  return (
    <QueryState query={query} label="Loading model settings">
      {(config) =>
        kind === 'image' ? (
          <div className={styles.form}>
            <Card>
              <h2>Image Models</h2>
              <div className={styles.scroll}>
                <table className={styles.table} aria-label="Image model settings">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Images per card</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.imageModels.map((model) => (
                      <tr key={model.id}>
                        <td>{model.displayName}</td>
                        <td>
                          <AutosaveNumber
                            key={model.imageCount}
                            label={`Image count for ${model.displayName}`}
                            value={model.imageCount}
                            save={(imageCount) =>
                              sendJson('/api/image-model-settings', 'PUT', { modelName: model.id, imageCount })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <RateLimits type="image" config={config} />
          </div>
        ) : (
          <Card>
            <h2>Data Models</h2>
            <div className={styles.scroll}>
              <table className={styles.table} aria-label="Chat model settings matrix">
                <thead>
                  <tr>
                    <th>Model</th>
                    {config.operationTypes.map((operation) => (
                      <th key={operation.code}>
                        <span>{operation.displayName}</span>
                        <Button
                          variant="text"
                          aria-label={`Enable all models for ${operation.displayName}`}
                          onPress={() => settings.mutate({ kind: 'all', operationType: operation.code })}
                          isDisabled={settings.isPending}
                        >
                          Enable all
                        </Button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.chatModels.map((model) => (
                    <tr key={model.modelName}>
                      <th scope="row">{model.modelName}</th>
                      {config.operationTypes.map((operation) => {
                        const enabled =
                          config.enabledModelsByOperation[operation.code]?.includes(model.modelName) === true;
                        return (
                          <td key={operation.code}>
                            <Switch
                              children={null}
                              aria-label={`${model.modelName} for ${operation.displayName}`}
                              isSelected={enabled}
                              isDisabled={settings.isPending}
                              onChange={(isEnabled) =>
                                settings.mutate({
                                  kind: 'model',
                                  modelName: model.modelName,
                                  operationType: operation.code,
                                  isEnabled,
                                })
                              }
                            />
                            <input
                              type="radio"
                              name={`primary-${operation.code}`}
                              aria-label={`Set ${model.modelName} as primary for ${operation.displayName}`}
                              checked={config.primaryModelByOperation[operation.code] === model.modelName}
                              disabled={!enabled || settings.isPending}
                              onChange={() =>
                                settings.mutate({
                                  kind: 'model',
                                  modelName: model.modelName,
                                  operationType: operation.code,
                                  isEnabled: true,
                                  isPrimary: true,
                                })
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      }
    </QueryState>
  );
}
