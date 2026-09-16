import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { AuthService } from './auth.service';
import { ProviderBillingAlertComponent } from './provider-billing-alert/provider-billing-alert.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    HeaderComponent,
    ProviderBillingAlertComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly authService = inject(AuthService);

  isAuthenticated = this.authService.isAuthenticated;
  authError = this.authService.authError;

  retryLogin(): void {
    this.authService.login();
  }
}
