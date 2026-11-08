import {
  ModuleRegistry,
  InfiniteRowModelModule,
  ColumnAutoSizeModule,
  themeQuartz,
  colorSchemeDark,
} from 'ag-grid-community';

ModuleRegistry.registerModules([InfiniteRowModelModule, ColumnAutoSizeModule]);
export const gridTheme = themeQuartz.withPart(colorSchemeDark);
export const queryString = (values: Record<string, string | number | boolean | undefined>) =>
  new URLSearchParams(
    Object.entries(values)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString();
