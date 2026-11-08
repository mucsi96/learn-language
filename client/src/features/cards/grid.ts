import {
  ModuleRegistry,
  InfiniteRowModelModule,
  ColumnAutoSizeModule,
  themeQuartz,
  colorSchemeDark,
} from 'ag-grid-community';

ModuleRegistry.registerModules([InfiniteRowModelModule, ColumnAutoSizeModule]);
export const gridTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: 'var(--bt-surface-1)',
  foregroundColor: 'var(--bt-text-default)',
  headerBackgroundColor: 'var(--bt-surface-2)',
  headerTextColor: 'var(--bt-text-strong)',
  borderColor: 'var(--bt-outline)',
  accentColor: 'var(--bt-primary)',
  fontFamily: 'var(--bt-font)',
});
export const queryString = (values: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(
    Object.entries(values)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString();
