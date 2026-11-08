import { useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Menu, MenuItem, MenuPopover, MenuTrigger } from '@mucsi96/react-ui';
import { z } from 'zod';
import { pageSchema, type Candidate, type Rectangle, type Region } from './api';
import styles from './Creation.module.css';

type Props = {
  page: z.infer<typeof pageSchema>;
  regions: Region[];
  extractedRegions: Region[];
  candidates: Candidate[];
  disabled: boolean;
  onSelection: (region: Region) => void;
  onUpload: (file: File) => void;
  onIgnore: (id: string) => void;
};
export function PageCanvas({
  page,
  regions,
  extractedRegions,
  candidates,
  disabled,
  onSelection,
  onUpload,
  onIgnore,
}: Props) {
  const [drag, setDrag] = useState<Rectangle | null>(null);
  const descriptionId = useId();
  const start = useRef<{ x: number; y: number } | null>(null);
  const position = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(page.width, ((event.clientX - bounds.left) * page.width) / bounds.width)),
      y: Math.max(0, Math.min(page.height, ((event.clientY - bounds.top) * page.height) / bounds.height)),
    };
  };
  const rectangle = (end: { x: number; y: number }): Rectangle => ({
    x: Math.min(start.current!.x, end.x),
    y: Math.min(start.current!.y, end.y),
    width: Math.abs(start.current!.x - end.x),
    height: Math.abs(start.current!.y - end.y),
  });
  const style = (region: Rectangle): CSSProperties => ({
    left: `${(region.x / page.width) * 100}%`,
    top: `${(region.y / page.height) * 100}%`,
    width: `${(region.width / page.width) * 100}%`,
    height: `${(region.height / page.height) * 100}%`,
  });
  if (page.sourceType === 'images' && !page.hasImage)
    return (
      <div
        role="region"
        aria-label="Image upload dropzone"
        className={styles.dropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) onUpload(file);
        }}
      >
        <p>Drag and drop an image here or use Upload image.</p>
      </div>
    );
  if (page.width <= 0 || page.height <= 0) return null;
  return (
    <div
      className={styles.viewer}
      data-source-type={page.sourceType}
      role="region"
      aria-label="Page content"
      style={{ aspectRatio: `${page.width} / ${page.height}`, containerType: 'inline-size' }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || disabled || (event.target instanceof Element && event.target.closest('a,button')))
          return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = position(event);
      }}
      onPointerMove={(event) => {
        if (start.current) setDrag(rectangle(position(event)));
      }}
      onPointerUp={(event) => {
        if (!start.current) return;
        const area = rectangle(position(event));
        if (area.width > 2 && area.height > 2) onSelection({ ...area, pageNumber: page.number });
        start.current = null;
        setDrag(null);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(null);
      }}
    >
      <span id={`${descriptionId}-duplicate`} hidden>Possible duplicate</span>
      <span id={`${descriptionId}-matches`} hidden>Matching cards</span>
      {page.sourceType === 'images' && page.hasImage && (
        <img src={`/api/source/${page.sourceId}/document/${page.number}/image`} alt={`Page ${page.number}`} />
      )}
      {page.spans.map((span, index) => {
        const containsSpan = (region: Region) =>
          region.pageNumber === page.number &&
          span.bbox.x >= region.x &&
          span.bbox.x <= region.x + region.width &&
          span.bbox.y >= region.y &&
          span.bbox.y <= region.y + region.height;
        const matches = span.searchTerm
          ? candidates.filter(
              (item) =>
                item.selectionRegions?.some(containsSpan) &&
                (item.word ?? item.sentence ?? '').toLowerCase().includes(span.searchTerm!.toLowerCase())
            )
          : [];
        const match = matches[0];
        const spanStyle = {
          ...style(span.bbox),
          fontFamily: page.sourceType === 'pdf' ? 'inherit' : span.font,
          color: page.sourceType === 'pdf' ? 'inherit' : span.color,
          fontSize: `${(span.bbox.height / page.width) * 100}cqw`,
        };
        if (matches.length > 1 || (match?.warning && !match.exists))
          return (
            <MenuTrigger key={index}>
              <Button
                variant="text"
                className={`${styles.span} ${styles.matchedSpan} ${styles.spanAction}`}
                style={spanStyle}
                aria-describedby={`${descriptionId}-${match.warning ? 'duplicate' : 'matches'}`}
              >
                {span.text}
              </Button>
              <MenuPopover>
                <Menu aria-label={`Matches for ${span.text}`}>
                  {matches.map((item) => (
                    <MenuItem
                      key={item.id}
                      href={item.exists ? `/sources/${page.sourceId}/page/${page.number}/cards/${item.id}` : undefined}
                      onAction={item.exists ? undefined : () => onIgnore(item.id)}
                    >
                      {item.exists ? 'Edit' : 'Ignore'} {item.word ?? item.sentence ?? item.id}
                    </MenuItem>
                  ))}
                </Menu>
              </MenuPopover>
            </MenuTrigger>
          );
        return match?.exists ? (
          <Link
            className={`${styles.span} ${styles.matchedSpan}`}
            style={spanStyle}
            key={index}
            aria-description="Card exists"
            to={`/sources/${page.sourceId}/page/${page.number}/cards/${match.id}`}
          >
            {span.text}
          </Link>
        ) : (
          <span
            className={styles.span}
            style={spanStyle}
            key={index}
            role={match?.error ? 'status' : undefined}
            aria-description={
              match ? (match.error ?? (match.warning ? 'Possible duplicate' : 'Card does not exist')) : undefined
            }
          >
            {span.text}
          </span>
        );
      })}
      {(page.extractionRegions ?? []).map((region, index) => (
        <span
          key={`persisted-${index}`}
          role="region"
          aria-label="Extracted region"
          className={`${styles.rectangle} ${styles.persisted}`}
          style={style(region)}
        />
      ))}
      {regions.map(
        (region, index) =>
          region.pageNumber === page.number && (
            <span
              key={index}
              role="region"
              aria-label={`Selected area ${index + 1}`}
              className={styles.rectangle}
              style={style(region)}
            >
              {index + 1}
            </span>
          )
      )}
      {extractedRegions
        .filter((region) => region.pageNumber === page.number)
        .map((region, index) => (
          <span
            key={`extracted-${index}`}
            role="region"
            aria-label="Extracted region"
            className={`${styles.rectangle} ${styles.persisted}`}
            style={style(region)}
          />
        ))}
      {drag && <span className={styles.rectangle} style={style(drag)} />}
    </div>
  );
}
