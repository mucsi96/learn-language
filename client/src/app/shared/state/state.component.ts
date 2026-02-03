import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { CardState } from './card-state';

@Component({
  selector: 'app-state',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.css']
})
export class StateComponent {
  state = input<CardState>();
  count = input<number | undefined>();

  private readonly stateNames: Record<CardState, string> = {
    'NEW': 'New',
    'LEARNING': 'Learning',
    'REVIEW': 'Review',
    'RELEARNING': 'Relearning',
    'KNOWN': 'Known',
  };

  private readonly stateColorMap: Record<CardState, string> = {
    'NEW': '#2196F3',
    'LEARNING': '#4CAF50',
    'REVIEW': '#FFC107',
    'RELEARNING': '#F44336',
    'KNOWN': '#9E9E9E',
  };

  stateStyle = computed(() => {
    const state = this.state();
    if (state === undefined) {
      return {
        backgroundColor: '#000000',
        color: 'white',
      };
    }

    const backgroundColor = this.stateColorMap[state] ?? '#000000';
    return {
      backgroundColor,
      color: 'white',
    };
  });

  stateName = computed(() => {
    const state = this.state();
    if (state === undefined) {
      return 'Unknown';
    }
    return this.stateNames[state] ?? 'Unknown';
  });
}
