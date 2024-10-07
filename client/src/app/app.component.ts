import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import '@mucsi96/ui-elements';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'admin_client';
}
