import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Dialog, TextField } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from '../../components/Forms.module.css';

const entrySchema = z.object({ id: z.union([z.string(), z.number()]), name: z.string() });
type Entry = z.infer<typeof entrySchema>;
const kinds = {
  'source-groups': {
    title: 'Source Groups',
    singular: 'group',
    label: 'Group name',
    description:
      'Group sources together to share known words. A word added to any source in a group is treated as already known across every source in the same group.',
  },
  'learning-partners': {
    title: 'Learning Partners',
    singular: 'partner',
    label: 'Partner name',
    description:
      'Add learning partners who study with you. Assign a partner to a source to study together - cards will alternate between you and your partner.',
  },
  'grammar-topics': {
    title: 'Grammar Topics',
    singular: 'topic',
    label: 'Topic name',
    description:
      'Maintain the list of grammar topics. When creating grammar cards in bulk, pick a topic so cards can later be grouped or filtered by topic.',
  },
};
export default function NamedList({ kind }: { kind: keyof typeof kinds }) {
  const config = kinds[kind];
  const path = `/api/${kind}`;
  const query = useQuery(apiQuery(path, z.array(entrySchema)));
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Entry>();
  const [editing, setEditing] = useState<Entry>();
  const add = useAction(
    () =>
      sendJson(path, 'POST', {
        name: name.trim(),
        ...(kind === 'source-groups'
          ? {
              id: name
                .normalize('NFKD')
                .replace(/ß/g, 'ss')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 50)
                .replace(/-+$/g, ''),
            }
          : {}),
      }),
    () => setName('')
  );
  const remove = useAction(
    (entry: Entry) => sendJson(`${path}/${entry.id}`, 'DELETE'),
    () => setDeleting(undefined)
  );
  const update = useAction(
    (entry: Entry) => sendJson(`${path}/${entry.id}`, 'PUT', { name: entry.name.trim() }),
    () => setEditing(undefined)
  );
  return (
    <Card>
      <h2>{config.title}</h2>
      <p>{config.description}</p>
      <form
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) add.mutate();
        }}
      >
        <TextField label={config.label} value={name} onChange={setName} isRequired />
        <Button type="submit" aria-label={`Add ${config.singular}`} isDisabled={!name.trim() || add.isPending}>
          Add
        </Button>
      </form>
      <QueryState query={query} label={`Loading ${config.title.toLowerCase()}`}>
        {(entries) =>
          entries.length === 0 ? (
            <p>No {config.title.toLowerCase()} yet</p>
          ) : (
            <ul aria-label={config.title}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.toolbar}>
                  <span>{entry.name}</span>
                  {kind === 'grammar-topics' && (
                    <Button variant="text" aria-label={`Edit ${entry.name}`} onPress={() => setEditing(entry)}>
                      Edit
                    </Button>
                  )}
                  <Button variant="text" aria-label={`Delete ${entry.name}`} onPress={() => setDeleting(entry)}>
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
          message={`Delete ${config.singular} "${deleting.name}"?`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => remove.mutate(deleting)}
          pending={remove.isPending}
        />
      )}
      {editing && (
        <Dialog
          title="Edit Grammar Topic"
          isOpen
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
        >
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate(editing);
            }}
          >
            <TextField
              label="Topic name"
              value={editing.name}
              onChange={(value) => setEditing({ ...editing, name: value })}
              isRequired
            />
            <div className={styles.actions}>
              <Button variant="text" onPress={() => setEditing(undefined)}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={!editing.name.trim() || update.isPending}>
                Save
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Card>
  );
}
