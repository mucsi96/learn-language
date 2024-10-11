import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import '@mucsi96/ui-elements';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'admin_client';
}
