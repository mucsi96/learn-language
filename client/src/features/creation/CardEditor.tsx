import { useState } from 'react';
import { Button, Dialog, useNotifications } from '@mucsi96/react-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cardSchema, type Card, type CardData } from '../../api/cards';
import { apiQuery, getJson, sendJson } from '../../api/http';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { enrichCardData, generateCardAudio, generateImages } from './pipeline';
import { ImageContextDialog } from './Dialogs';
import { CardFields } from './CardFields';
import { canReviewCard, normalizeCardData } from './cardValidation';
import styles from './Creation.module.css';

export function CardEditorPage() {
  const { cardId } = useParams();
  if (!cardId) throw new Error('Missing card ID');
  const query = useQuery(apiQuery(`/api/card/${cardId}`, cardSchema));
  return (
    <QueryState query={query} label="Card">
      {(card) => <CardEditor key={card.id} card={card} />}
    </QueryState>
  );
}
export function CardEditor({ card }: { card: Card }) {
  const [data, setData] = useState(card.data);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contextIndex, setContextIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const notifications = useNotifications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const action = useMutation({
    mutationFn: async (work: () => Promise<void>) => {
      await work();
      await queryClient.invalidateQueries();
    },
  });
  const save = async (patch: Record<string, unknown> = {}, nextData: CardData = data) => {
    await sendJson(`/api/card/${card.id}`, 'PUT', { data: normalizeCardData(card.type, nextData), ...patch });
    notifications.success(
      patch.readiness === 'REVIEWED'
        ? 'Card marked as reviewed successfully'
        : patch.flagged === false
          ? 'Flag removed successfully'
          : 'Card updated successfully'
    );
  };
  const generate = (index: number, context?: string) =>
    action.mutate(async () => {
      const examples = data.examples;
      const sentence = examples?.[index].de;
      if (!sentence || !examples) throw new Error('Enter a German example first');
      const images = await generateImages(sentence, context);
      const next = {
        ...data,
        examples: examples.map((example, i) =>
          i === index ? { ...example, images: [...(example.images ?? []), ...images] } : example
        ),
      };
      setData(next);
      await save({}, next);
    });
  return (
    <section className={styles.page}>
      <header className={styles.editorHeader}>
        <div>
          <h1>Edit {card.type === 'speech' ? 'sentence' : card.type} card</h1>
          <p>{card.readiness}</p>
        </div>
        <Button isDisabled={action.isPending} onPress={() => action.mutate(() => save())}>
          Update
        </Button>
      </header>
      {action.error && (
        <p role="alert" className={styles.error}>
          {action.error.message}
        </p>
      )}
      <fieldset
        className={`${styles.fields} ${styles.editorFields}`}
        aria-label="Card content"
        disabled={action.isPending}
      >
        <CardFields
          type={card.type}
          data={data}
          onChange={setData}
          onPreviewImage={setPreview}
          onGenerateImages={(index, withContext) => {
            if (withContext) setContextIndex(index);
            else generate(index);
          }}
        />
        <div className={styles.actions}>
          {card.readiness === 'IN_REVIEW' && (
            <Button
              tone="success"
              isDisabled={!canReviewCard(card.type, data)}
              onPress={() => action.mutate(() => save({ readiness: 'REVIEWED' }))}
            >
              Mark as reviewed
            </Button>
          )}
          {card.flagged && <Button onPress={() => action.mutate(() => save({ flagged: false }))}>Remove flag</Button>}
          <Button
            variant="outlined"
            onPress={() =>
              action.mutate(async () => {
                const enriched = await enrichCardData(card.type, data);
                setData(enriched);
                await save({ readiness: card.type === 'simple' ? 'READY' : 'IN_REVIEW' }, enriched);
              })
            }
          >
            Enrich with AI
          </Button>
          {card.type !== 'simple' && (
            <Button
              variant="outlined"
              onPress={() =>
                action.mutate(async () => {
                  await generateCardAudio({ ...card, data });
                  const updated = await getJson(`/api/card/${card.id}`, cardSchema);
                  setData(updated.data);
                  notifications.success('Audio generated');
                })
              }
            >
              Generate audio
            </Button>
          )}
          <Button tone="error" onPress={() => setConfirmDelete(true)}>
            Delete card
          </Button>
        </div>
      </fieldset>
      {(data.audio ?? []).map((audio) => (
        <div key={audio.id}>
          <p>
            {audio.text} ({audio.voice})
          </p>
          <audio controls src={`/api/audio/${audio.id}`} />
        </div>
      ))}
      {contextIndex !== null && (
        <ImageContextDialog
          onClose={(context) => {
            const index = contextIndex;
            setContextIndex(null);
            if (context !== null) generate(index, context);
          }}
        />
      )}
      {preview && (
        <Dialog
          title="Example image"
          isOpen
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
        >
          <img className={styles.preview} src={`/api/image/${preview}`} alt="Example image" />
          <Button onPress={() => setPreview(null)}>Close</Button>
        </Dialog>
      )}
      {confirmDelete && (
        <ConfirmDialog
          message="Are you sure you want to delete this card?"
          pending={action.isPending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            action.mutate(async () => {
              await sendJson(`/api/card/${card.id}`, 'DELETE');
              notifications.success('Card deleted successfully');
              navigate(-1);
            })
          }
        />
      )}
    </section>
  );
}
