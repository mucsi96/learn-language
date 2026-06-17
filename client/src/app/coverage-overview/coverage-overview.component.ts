import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TopicCoverage } from '../parser/types';

@Component({
  selector: 'app-coverage-overview',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './coverage-overview.component.html',
  styleUrl: './coverage-overview.component.css',
})
export class CoverageOverviewComponent {
  topics = input<TopicCoverage[]>([]);

  iconFor(status: TopicCoverage['status']): string {
    switch (status) {
      case 'good':
        return 'check_circle';
      case 'low':
        return 'error';
      default:
        return 'cancel';
    }
  }
}
