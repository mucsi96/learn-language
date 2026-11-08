import { Button, Menu, MenuItem, MenuPopover, MenuTrigger } from '@mucsi96/react-ui';
import { useQuery } from '@tanstack/react-query';
import { useMatch, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery } from '../../api/http';
import { sourceSchema, type Source } from '../../api/schemas';
import styles from './SourceNavigation.module.css';

function destination(source: Source) {
  const base = `/sources/${source.id}`;
  switch (source.sourceType) {
    case 'audioCollection':
      return `${base}/content`;
    case 'ebookDictionary':
      return `${base}/cards?filter=draft`;
    case 'wordTriage':
      return `${base}/word-import`;
    case 'json':
      return `${base}/json`;
    case 'pdf':
    case 'images':
      if (source.startPage === null) throw new Error(`Missing start page for source ${source.id}`);
      return `${base}/page/${source.startPage}`;
  }
}

export function SourceNavigation() {
  const cards = useMatch('/sources/:sourceId/cards');
  const page = useMatch('/sources/:sourceId/page/:pageNumber');
  const json = useMatch('/sources/:sourceId/json');
  const match = cards ?? page ?? json;
  const navigate = useNavigate();
  const sources = useQuery({ ...apiQuery('/api/sources', z.array(sourceSchema)), enabled: !!match });
  if (!match) return null;
  const selected = sources.data?.find((source) => source.id === match.params.sourceId);
  if (!selected) return null;
  return (
    <MenuTrigger
      onOpenChange={(open) => {
        if (open) void sources.refetch();
      }}
    >
      <Button variant="outlined" className={styles.trigger}>
        {selected.name}
      </Button>
      <MenuPopover>
        <Menu aria-label="Sources">
          {sources.data?.map((source) => (
            <MenuItem
              key={source.id}
              onAction={() => navigate(cards ? `/sources/${source.id}/cards` : destination(source))}
            >
              {source.name}
            </MenuItem>
          ))}
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
}
