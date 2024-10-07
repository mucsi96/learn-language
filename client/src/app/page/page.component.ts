import { Component, Signal } from '@angular/core';
import { PageService } from './page.service';
import { Span } from '../types';
import { SpanComponent } from '../span/span.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [SpanComponent],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent {
  spans: Signal<Span[] | undefined>;
  constructor(private readonly pageService: PageService) {
    this.spans = this.pageService.spans;
  }
}
