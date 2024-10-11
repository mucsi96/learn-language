import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  sources = [
    {
      id: 'goethe-a1',
      name: 'Goethe A1',
      startPage: 6
    },
    {
      id: 'goethe-a2',
      name: 'Goethe A2',
      startPage: 6
    },
    {
      id: 'goethe-b1',
      name: 'Goethe B1',
      startPage: 6
    },
  ];
}
