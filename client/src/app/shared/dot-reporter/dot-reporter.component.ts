import { Component, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DotProgress } from '../types/dot-progress.types';

@Component({
  selector: 'app-dot-reporter',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './dot-reporter.component.html',
  styleUrl: './dot-reporter.component.css',
})
export class DotReporterComponent {
  readonly name = input.required<string>();
  readonly dots = input.required<DotProgress[]>();
}
