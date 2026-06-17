import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ImageModelBadgeComponent } from '../image-model-badge/image-model-badge.component';

export type GridImageValue = {
  id: string;
  url: string;
  model?: string;
  isFavorite?: boolean;
  description?: string;
};

export type GridImageResource = {
  value: () => GridImageValue | undefined;
  isLoading: () => boolean;
  set: (value: GridImageValue) => void;
};

@Component({
  selector: 'app-image-grid',
  imports: [MatButtonModule, MatIconModule, ImageModelBadgeComponent],
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
