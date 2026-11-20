import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Card } from '../../parser/types';
import { MarkdownPipe } from '../../shared/markdown.pipe';

@Component({
  selector: 'app-new-card-introduction',
  imports: [MatButtonModule, MarkdownPipe],
  templateUrl: './new-card-introduction.component.html',
  styleUrl: './new-card-introduction.component.css',
})
export class NewCardIntroductionComponent {
  readonly cards = input.required<Card[]>();
  readonly continueStudy = output<void>();
}
