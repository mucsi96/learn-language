import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type GridImageResource = {
  value: () => { url?: string; model?: string; isFavorite?: boolean } | undefined;
  isLoading: () => boolean;
};

@Component({
  selector: 'app-image-grid',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './image-grid.component.html',
  styleUrl: './image-grid.component.css',
})
export class ImageGridComponent {
  images = input.required<GridImageResource[]>();
  altText = input<string>('');
  favoriteToggled = output<number>();

  toggleFavorite(index: number) {
    const imageResource = this.images()[index];
    if (!imageResource || imageResource.isLoading()) return;
    this.favoriteToggled.emit(index);
  }
}
