import { useSyncExternalStore } from 'react';
import type { Candidate, CardType, Region } from './api';

type ViewerState = {
  cardType: CardType | '';
  regions: Region[];
  extractedRegions: Region[];
  candidates: Candidate[];
  ignored: string[];
  grammarTopic: string;
};
const empty: ViewerState = {
  cardType: '',
  regions: [],
  extractedRegions: [],
  candidates: [],
  ignored: [],
  grammarTopic: '',
};
const store: { values: Record<string, ViewerState>; listeners: Set<() => void> } = { values: {}, listeners: new Set() };
const subscribe = (listener: () => void) => {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};
export function mergeCandidates(current: Candidate[], incoming: Candidate[]): Candidate[] {
  return incoming.reduce(
    (merged, item) =>
      merged.some((value) => value.id === item.id)
        ? merged.map((value) =>
            value.id === item.id
              ? {
                  ...value,
                  ...item,
                  selectionRegions: [...(value.selectionRegions ?? []), ...(item.selectionRegions ?? [])],
                }
              : value
          )
        : [...merged, item],
    current
  );
}
export function useViewerState(sourceId: string) {
  const state = useSyncExternalStore(subscribe, () => store.values[sourceId] ?? empty);
  const update = (transform: (current: ViewerState) => ViewerState) => {
    store.values = { ...store.values, [sourceId]: transform(store.values[sourceId] ?? empty) };
    store.listeners.forEach((listener) => listener());
  };
  return [state, update] as const;
}
