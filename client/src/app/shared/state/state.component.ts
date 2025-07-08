import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { State } from 'ts-fsrs';

@Component({
  selector: 'app-state',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.css']
})
export class StateComponent {
  state = input<State>();
  count = input<number | undefined>();

  private readonly stateNames = new Map<State, string>([
    [State.New, 'New'],
    [State.Learning, 'Learning'],
    [State.Review, 'Review'],
    [State.Relearning, 'Relearning'],
  ]);

  private readonly stateColorMap = new Map<State, string>([
    [State.New, '#2196F3'], // Blue
    [State.Learning, '#4CAF50'], // Green
    [State.Review, '#FFC107'], // Amber
    [State.Relearning, '#F44336'], // Red
  ]);

  stateStyle = computed(() => {
    const state = this.state();
    if (state === undefined) {
      return {
        backgroundColor: '#000000',
        color: 'white',
      };
    }

    const backgroundColor = this.stateColorMap.get(state) ?? '#000000';
    return {
      backgroundColor,
      color: 'white',
    };
  });

  stateName = computed(() => {
    const state = this.state();
    if (state == undefined) {
      return 'Unknown';
    }
    return this.stateNames.get(state) ?? 'Unknown';
  });
}
