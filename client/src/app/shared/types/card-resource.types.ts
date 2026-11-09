import { Card } from '../../parser/types';

export interface CardResourceLike {
  value: () => Card | null | undefined;
  isLoading?: () => boolean;
  reload?: () => void;
}
