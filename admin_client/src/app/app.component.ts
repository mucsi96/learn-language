import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImportsComponent } from "./imports/imports.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ImportsComponent, ImportsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'admin_client';
}
