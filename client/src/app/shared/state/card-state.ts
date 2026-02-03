import { State } from 'ts-fsrs';

export type CardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING' | 'KNOWN';

export function mapTsfsrsStateToCardState(state: State): CardState {
  switch (state) {
    case State.New:
      return 'NEW';
    case State.Learning:
      return 'LEARNING';
    case State.Review:
      return 'REVIEW';
    case State.Relearning:
      return 'RELEARNING';
  }
}

export function mapCardStateToTsfsrsState(state: CardState): State {
  switch (state) {
    case 'NEW':
      return State.New;
    case 'LEARNING':
      return State.Learning;
    case 'REVIEW':
    case 'KNOWN':
      return State.Review;
    case 'RELEARNING':
      return State.Relearning;
  }
}
