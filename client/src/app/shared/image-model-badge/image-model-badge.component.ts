import { Component, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-image-model-badge',
  imports: [MatTooltipModule],
  templateUrl: './image-model-badge.component.html',
  styleUrl: './image-model-badge.component.css',
})
export class ImageModelBadgeComponent {
  model = input<string>();
  description = input<string>();
  loading = input<boolean>(false);
}
