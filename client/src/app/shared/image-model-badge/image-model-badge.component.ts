import { Component, input } from '@angular/core';

@Component({
  selector: 'app-image-model-badge',
  templateUrl: './image-model-badge.component.html',
  styleUrl: './image-model-badge.component.css',
})
export class ImageModelBadgeComponent {
  model = input<string>();
}
