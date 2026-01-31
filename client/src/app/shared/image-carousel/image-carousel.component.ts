import { Component, input, output, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type CarouselImage = {
  url?: string;
  model?: string;
  isFavorite?: boolean;
};

export type CarouselImageResource = {
  value: () => CarouselImage | undefined;
  isLoading: () => boolean;
};

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './image-carousel.component.html',
  styleUrl: './image-carousel.component.css',
})
export class ImageCarouselComponent {
  images = input.required<CarouselImageResource[]>();
  altText = input<string>('');
  favoriteToggled = output<number>();

  readonly currentIndex = signal(0);

  readonly currentImage = computed(() => {
    const imgs = this.images();
    const idx = this.currentIndex();
    return imgs[idx];
  });

  readonly hasPrevious = computed(() => {
    return this.images().length >= 2 && this.currentIndex() > 0;
  });

  readonly hasNext = computed(() => {
    const imgs = this.images();
    return imgs.length >= 2 && this.currentIndex() < imgs.length - 1;
  });

  prevImage() {
    const imgs = this.images();
    if (!imgs.length) return;
    this.currentIndex.update((idx) => (idx - 1 + imgs.length) % imgs.length);
  }

  nextImage() {
    const imgs = this.images();
    if (!imgs.length) return;
    this.currentIndex.update((idx) => (idx + 1) % imgs.length);
  }

  toggleFavorite() {
    const imageResource = this.currentImage();
    if (!imageResource || imageResource.isLoading()) return;
    this.favoriteToggled.emit(this.currentIndex());
  }

  setIndex(index: number) {
    const imgs = this.images();
    if (index >= 0 && index < imgs.length) {
      this.currentIndex.set(index);
    }
  }

  goToLast() {
    const imgs = this.images();
    if (imgs.length > 0) {
      this.currentIndex.set(imgs.length - 1);
    }
  }
}
