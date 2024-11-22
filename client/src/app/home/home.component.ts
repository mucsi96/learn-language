import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';
import { MatDialog } from '@angular/material/dialog';
import { WordDialogComponent } from '../parser/word-dialog/word-dialog.component';

@Component({
    selector: 'app-home',
    imports: [
        RouterLink,
        MatProgressSpinnerModule,
        MatCardModule,
        MatButtonModule,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
  private readonly sourcesService = inject(SourcesService);
  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;

  readonly dialog = inject(MatDialog);

  constructor() {
    this.dialog.open(WordDialogComponent, {
      maxWidth: 'unset',
      data: {
        id: 'anfangen',
        word: 'anfangen',
        forms: ['fängst an', 'fängt an', 'hat angefangen'],
        examples: [
          'Hier fängt die Bahnhofstraße an.',
          'Der Unterricht fängt gleich an.',
        ],
      },
    });
  }
}
