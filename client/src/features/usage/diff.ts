export type DiffLine = { type: 'same' | 'added' | 'removed'; content: string };

export function computeDiff(primary: string, secondary: string): DiffLine[] {
  const a = primary.split('\n');
  const b = secondary.split('\n');
  const matrix = a.reduce<number[][]>(
    (rows, line, i) => [
      ...rows,
      b.reduce<number[]>(
        (row, other, j) => [...row, line === other ? rows[i][j] + 1 : Math.max(rows[i][j + 1], row[j])],
        [0]
      ),
    ],
    [Array.from({ length: b.length + 1 }, () => 0)]
  );
  const trace = (i: number, j: number): DiffLine[] => {
    if (i === 0) return b.slice(0, j).map((content) => ({ type: 'added', content }));
    if (j === 0) return a.slice(0, i).map((content) => ({ type: 'removed', content }));
    if (a[i - 1] === b[j - 1]) return [...trace(i - 1, j - 1), { type: 'same', content: a[i - 1] }];
    return matrix[i - 1][j] > matrix[i][j - 1]
      ? [...trace(i - 1, j), { type: 'removed', content: a[i - 1] }]
      : [...trace(i, j - 1), { type: 'added', content: b[j - 1] }];
  };
  return trace(a.length, b.length);
}
