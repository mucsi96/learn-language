import { Button, Dialog } from '@mucsi96/react-ui';
import styles from './Forms.module.css';

export function ConfirmDialog({
  message,
  onConfirm,
  onClose,
  pending = false,
}: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog
      title="Confirmation"
      isOpen
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <p>{message}</p>
      <div className={styles.actions}>
        <Button variant="text" onPress={onClose} isDisabled={pending}>
          Cancel
        </Button>
        <Button tone="error" onPress={onConfirm} isDisabled={pending}>
          Yes
        </Button>
      </div>
    </Dialog>
  );
}
