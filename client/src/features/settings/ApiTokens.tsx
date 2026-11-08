import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Dialog, Select, TextField, useNotifications } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from '../../components/Forms.module.css';

const tokenSchema = z.object({
  id: z.number(),
  name: z.string(),
  scope: z.enum(['DICTIONARY', 'KNOWN_CARDS_EXPORT']),
  createdAt: z.string(),
});
const scopes = [
  { id: 'DICTIONARY', label: 'Dictionary (e-book reader)', fileName: 'ai-dictionary.token' },
  { id: 'KNOWN_CARDS_EXPORT', label: 'Known cards export', fileName: 'known-cards-export.token' },
];
export default function ApiTokens() {
  const query = useQuery(apiQuery('/api/api-tokens', z.array(tokenSchema)));
  const notifications = useNotifications();
  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [token, setToken] = useState<string>();
  const [deleting, setDeleting] = useState<z.infer<typeof tokenSchema>>();
  const create = useAction(async () => {
    const response = await request('/api/api-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), scope }),
    });
    const result = tokenSchema.extend({ token: z.string() }).parse(await response.json());
    const purpose = scopes.find((scope) => scope.id === result.scope);
    if (!purpose) throw new Error('Unknown token purpose');
    const url = URL.createObjectURL(new Blob([result.token], { type: 'text/plain' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = purpose.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setToken(result.token);
    setName('');
    setScope('');
  });
  const remove = useAction(
    (id: number) => sendJson(`/api/api-tokens/${id}`, 'DELETE'),
    () => setDeleting(undefined)
  );
  return (
    <Card>
      <h2>API Tokens</h2>
      <p>
        Generate API tokens for external tools. Dictionary tokens let e-book readers access the translation endpoint.
        Known cards export tokens allow downloading your known words as JSON.
      </p>
      <form
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && scope) create.mutate();
        }}
      >
        <TextField label="Token name" value={name} onChange={setName} isRequired isDisabled={create.isPending} />
        <Select
          label="Purpose"
          options={scopes}
          selectedKey={scope || null}
          onSelectionChange={(key) => setScope(String(key))}
          isRequired
          isDisabled={create.isPending}
        />
        <Button type="submit" aria-label="Generate token" isDisabled={!name.trim() || !scope || create.isPending}>
          Generate
        </Button>
      </form>
      <QueryState query={query} label="Loading API tokens">
        {(tokens) =>
          tokens.length === 0 ? (
            <p>No API tokens yet</p>
          ) : (
            <ul aria-label="API tokens">
              {tokens.map((item) => (
                <li key={item.id} className={styles.toolbar}>
                  <span>
                    {item.name} · {scopes.find((scope) => scope.id === item.scope)?.label} ·{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <Button variant="text" aria-label={`Delete ${item.name}`} onPress={() => setDeleting(item)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      {deleting && (
        <ConfirmDialog
          message={`Delete token "${deleting.name}"?`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => remove.mutate(deleting.id)}
          pending={remove.isPending}
        />
      )}
      {token && (
        <Dialog
          title="API Token Created"
          isOpen
          onOpenChange={(open) => {
            if (!open) setToken(undefined);
          }}
        >
          <p>Copy this token now. It will not be shown again.</p>
          <TextField label="API token" value={token} isReadOnly />
          <div className={styles.actions}>
            <Button
              onPress={() => {
                void navigator.clipboard.writeText(token).then(
                  () => notifications.success('Token copied'),
                  () => notifications.error('Could not copy token')
                );
              }}
            >
              Copy
            </Button>
            <Button variant="text" onPress={() => setToken(undefined)}>
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </Card>
  );
}
