import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly msalBroadcastService = inject(MsalBroadcastService);
  private readonly authService = inject(MsalService);
  userInitials = signal<string | undefined>(undefined);
  userEmail = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None)
      )
      .subscribe(() => {
        const activeAccount = this.authService.instance.getActiveAccount();

        if (
          !activeAccount &&
          this.authService.instance.getAllAccounts().length > 0
        ) {
          let accounts = this.authService.instance.getAllAccounts();
          this.authService.instance.setActiveAccount(accounts[0]);
        }

        if (activeAccount) {
          this.userEmail.set(activeAccount.username);
          this.userInitials.set(this.getInitials(activeAccount.name));
        }
      });
  }

  private getInitials(name: string | undefined): string {
    if (!name) return '';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('');
    return initials.toUpperCase();
  }
}
