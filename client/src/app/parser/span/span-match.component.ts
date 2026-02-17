import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-span-match',
  imports: [MatButtonModule, RouterModule],
  templateUrl: './span-match.component.html',
  styleUrl: './span-match.component.css',
})
export class SpanMatchComponent {
  readonly sourceId = input<string>();
  readonly pageNumber = input<number>();
  readonly cardId = input.required<string>();
  readonly exists = input.required<boolean>();
  readonly label = input.required<string>();
  readonly inline = input(false);
  readonly error = input<string>();
  readonly left = input<string>();
  readonly top = input<string>();
  readonly width = input<string>();
  readonly height = input<string>();

  get ariaDescription() {
    const errorValue = this.error();
    if (errorValue) {
      return errorValue;
    }
    return this.exists() ? 'Card exists' : 'Card does not exist';
  }
}
