import { useState } from 'react';
import { Button, Card } from '@mucsi96/react-ui';
import { sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export default function DailySessions() {
  const [confirm, setConfirm] = useState(false);
  const remove = useAction(
    () => sendJson('/api/study-sessions', 'DELETE'),
    () => setConfirm(false)
  );
  return (
    <Card>
      <h2>Daily Sessions</h2>
      <p>Delete all daily study sessions to start fresh. Cards and review history are preserved.</p>
      <Button tone="error" isDisabled={remove.isPending} onPress={() => setConfirm(true)}>
        Cleanup daily sessions
      </Button>
      {confirm && (
        <ConfirmDialog
          message="Delete all daily study sessions? This cannot be undone."
          onClose={() => setConfirm(false)}
          onConfirm={() => remove.mutate()}
          pending={remove.isPending}
        />
      )}
    </Card>
  );
}
