import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  sources: 'Sources',
  'in-review-cards': 'Cards In Review',
  'model-usage': 'Model Usage',
  voices: 'Voice Settings',
  'data-models': 'Data Model Settings',
  'image-models': 'Image Model Settings',
  'known-words': 'Known Words',
  'learning-partners': 'Learning Partners',
  'source-groups': 'Source Groups',
  'grammar-topics': 'Grammar Topics',
  'api-tokens': 'API Tokens',
  'daily-sessions': 'Daily Sessions',
  study: 'Study',
  cards: 'Cards',
  json: 'JSON',
  'word-import': 'Word Triage',
  content: 'Source Content',
  listen: 'Listen',
};
export function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    const title = parts.includes('page')
      ? parts.includes('cards')
        ? 'Edit Card'
        : `${parts[3]} / ${parts[1]}`
      : parts[2] === 'json'
        ? `JSON / ${parts[1]}`
        : (titles[parts.at(-1) ?? ''] ?? (parts[0] === 'sources' ? titles[parts[2]] : undefined));
    document.title = title ? `${title} | Learn language` : 'Learn language';
  }, [pathname]);
  return null;
}
