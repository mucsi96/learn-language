import { Component, computed, input } from '@angular/core';
import { SourceRectangle } from '../types';

@Component({
  selector: 'app-card-rectangle',
  standalone: true,
  templateUrl: './card-rectangle.component.html',
  styleUrl: './card-rectangle.component.css',
})
export class CardRectangleComponent {
  readonly rectangle = input.required<SourceRectangle>();

  readonly style = computed(() => {
    const rect = this.rectangle();
    return {
      left: `calc(var(--page-width) * ${rect.x})`,
      top: `calc(var(--page-width) * ${rect.y})`,
      width: `calc(var(--page-width) * ${rect.width})`,
      height: `calc(var(--page-width) * ${rect.height})`,
    };
  });
}
