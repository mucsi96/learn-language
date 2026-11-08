import { useSyncExternalStore } from 'react';

const read = () => {
  const raw = sessionStorage.getItem('pomodoroEndsAt');
  if (raw === null) return null;
  const deadline = Number(raw);
  if (!Number.isFinite(deadline) || deadline <= 0) throw new Error('Invalid stored Pomodoro deadline');
  return deadline;
};
const subscribe = (notify: () => void) => {
  window.addEventListener('pomodoro', notify);
  return () => window.removeEventListener('pomodoro', notify);
};
export const usePomodoroDeadline = () => useSyncExternalStore(subscribe, read);
export function startPomodoro(restart = false) {
  const deadline = read();
  if (!restart && deadline !== null && deadline > Date.now()) return;
  sessionStorage.setItem('pomodoroEndsAt', String(Date.now() + 25 * 60 * 1000));
  window.dispatchEvent(new Event('pomodoro'));
}
