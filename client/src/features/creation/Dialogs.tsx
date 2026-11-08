import { useState } from 'react';
import { Button, Dialog, Select } from '@mucsi96/react-ui';
import { LoadingArea } from '../../components/LoadingArea';
import { Link } from 'react-router-dom';
import { type Duplicate } from './api';
import { useCreationJob } from './pipeline';
import styles from './Creation.module.css';

export function CreationProgress({ onClose }: { onClose: () => void }) {
  const job = useCreationJob();
  return (
    <Dialog
      title={job.kind === 'audio' ? 'Creating Audio' : 'Creating Cards'}
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className={styles.progress}>
        {job.isProcessing && job.progress.length === 0 && <LoadingArea label="Preparing creation job" />}
        <ul className={styles.list}>
          {job.progress.map((entry, index) => (
            <li key={index}>
              <div role="status" aria-label={entry.label}>
                <strong>{entry.label}</strong>
                <p>
                  {entry.status}: {entry.tooltip}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {job.result && (
          <p>
            {job.result.succeeded} succeeded, {job.result.failed} failed
          </p>
        )}
        {job.result?.errors.map((error, index) => <p key={index} role="alert" className={styles.error}>{error}</p>)}
      </div>
      {!job.isProcessing && job.kind === 'image' && Boolean(job.result?.succeeded) && <Link to="/in-review-cards" onClick={onClose}>Review cards</Link>}
      <Button onPress={onClose}>{job.isProcessing ? 'Continue in background' : 'Close'}</Button>
    </Dialog>
  );
}
export function DuplicateReviewDialog({
  duplicates,
  sourceId,
  pageNumber,
  onClose,
}: {
  duplicates: Duplicate[];
  sourceId: string;
  pageNumber: number;
  onClose: (ignored: string[] | null) => void;
}) {
  const [ignored, setIgnored] = useState<string[]>([]);
  const groups = [...new Set(duplicates.map((item) => item.newId))].map((newId) => ({
    newId,
    matches: duplicates.filter((item) => item.newId === newId),
  }));
  return (
    <Dialog title="Potential Duplicates" isOpen isDismissable={false} isKeyboardDismissDisabled>
      <p>
        AI flagged {groups.length} new card(s) as potential duplicates of existing cards. Review each match and choose
        which new cards to skip.
      </p>
      <ul className={styles.list} aria-label="Potential duplicate matches">
        {groups.map((group) => (
          <li key={group.newId} aria-label={`Potential duplicate ${group.newId}`}>
            <span aria-label="New card ID">{group.newId}</span>
            <label className={styles.actions}>
              <input
                type="checkbox"
                checked={ignored.includes(group.newId)}
                onChange={(event) =>
                  setIgnored((current) =>
                    event.target.checked ? [...current, group.newId] : current.filter((id) => id !== group.newId)
                  )
                }
              />
              Skip new card {group.newId}
            </label>
            <ul aria-label="Matching existing cards">
              {group.matches.map((match, index) => (
                <li key={index}>
                  <Link
                    aria-label="Existing card ID"
                    to={`/sources/${sourceId}/page/${pageNumber}/cards/${match.existingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {match.existingId}
                  </Link>
                  <p>{match.reason}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button variant="text" aria-label="Cancel bulk creation" onPress={() => onClose(null)}>
          Cancel
        </Button>
        <Button aria-label="Continue with bulk creation" onPress={() => onClose(ignored)}>
          Continue ({groups.length - ignored.length} new, {ignored.length} skipped)
        </Button>
      </div>
    </Dialog>
  );
}
export function ImageContextDialog({ onClose }: { onClose: (context: string | null) => void }) {
  const [context, setContext] = useState('');
  return (
    <Dialog
      title="Image generation context"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose(null);
      }}
    >
      <label className={styles.field}>
        Image generation context
        <textarea value={context} onChange={(event) => setContext(event.target.value)} />
      </label>
      <div className={styles.actions}>
        <Button variant="text" onPress={() => onClose(null)}>
          Cancel
        </Button>
        <Button isDisabled={!context.trim()} onPress={() => onClose(context.trim())}>
          Generate
        </Button>
      </div>
    </Dialog>
  );
}

export function GrammarTopicDialog({
  topics,
  error,
  onClose,
}: {
  topics: { id: number; name: string }[];
  error?: string;
  onClose: (topic: string | null) => void;
}) {
  const [topic, setTopic] = useState('');
  return (
    <Dialog
      title="Choose Grammar Topic"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose(null);
      }}
    >
      <Select
        label="Grammar topic"
        options={topics.map((value) => ({ id: value.name, label: value.name }))}
        selectedKey={topic || null}
        onSelectionChange={(key) => setTopic(String(key))}
      />
      {error && <p role="alert">{error}</p>}
      {topics.length === 0 && <Link to="/settings/grammar-topics">Add a grammar topic in settings</Link>}
      <div className={styles.actions}>
        <Button variant="text" onPress={() => onClose(null)}>
          Cancel
        </Button>
        <Button isDisabled={!topic} onPress={() => onClose(topic)}>
          Continue
        </Button>
      </div>
    </Dialog>
  );
}
