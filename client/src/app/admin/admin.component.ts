import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
 private readonly sourcesService = inject(SourcesService);
  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;
}
