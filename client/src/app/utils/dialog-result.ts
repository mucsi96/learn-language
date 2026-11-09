import { MatDialogRef } from '@angular/material/dialog';

export const dialogResult = <R>(
  dialogRef: MatDialogRef<unknown, R>
): Promise<R | undefined> =>
  new Promise<R | undefined>((resolve) => {
    const subscription = dialogRef.afterClosed().subscribe((value) => {
      subscription.unsubscribe();
      resolve(value);
    });
  });
