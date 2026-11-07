import { Card } from '@mucsi96/react-ui';
import type { z } from 'zod';
import type { environmentSchema } from '../../api/schemas';
import { sendJson } from '../../api/http';
import { AutosaveNumber } from './AutosaveNumber';
import styles from '../../components/Forms.module.css';

export function RateLimits({ type, config }: { type: 'image' | 'audio'; config: z.infer<typeof environmentSchema> }) {
  const title = type === 'image' ? 'Image' : 'Audio';
  const limits = [
    { key: 'maxPerMinute', label: `${title} rate limit per minute`, value: config[`${type}RateLimitPerMinute`] },
    { key: 'maxConcurrent', label: `${title} max concurrent requests`, value: config[`${type}MaxConcurrentRequests`] },
    { key: 'dailyLimit', label: `${title} daily limit`, value: config[`${type}DailyLimit`] },
  ];
  return (
    <Card>
      <h2>Rate Limit</h2>
      <div className={styles.grid}>
        {limits.map((limit) => (
          <AutosaveNumber
            key={`${limit.key}-${limit.value}`}
            label={limit.label}
            value={limit.value}
            description={limit.key === 'dailyLimit' ? '0 = no limit' : undefined}
            save={(value) => sendJson('/api/rate-limit-settings', 'PUT', { type, [limit.key]: value })}
          />
        ))}
      </div>
    </Card>
  );
}
