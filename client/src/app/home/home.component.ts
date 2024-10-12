import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly sourcesService = inject(SourcesService);
  readonly sources = this.sourcesService.sourcesSignal;
  readonly loading = this.sourcesService.isLoading();
}
