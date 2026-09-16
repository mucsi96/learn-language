import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { fetchJson } from '../utils/fetchJson';

interface BillingIssue {
  occurrenceId: string;
  provider: string;
  providerName: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  message: string;
  billingUrl: string;
  canResolve: boolean;
}

@Component({
  selector: 'app-provider-billing-alert',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './provider-billing-alert.component.html',
  styleUrl: './provider-billing-alert.component.css',
})
export class ProviderBillingAlertComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly issues = signal<BillingIssue[]>([]);
  readonly resolving = signal(false);
  readonly resolutionError = signal(false);
  readonly status = resource({
    loader: () => fetchJson<BillingIssue[]>(this.http, '/api/provider-billing-issues'),
  });

  constructor() {
    effect(() => {
      if (this.status.hasValue()) {
        this.issues.set(this.status.value());
      }
    });
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        this.status.reload();
      }
    };
    const timer = setInterval(refresh, 15_000);
    window.addEventListener('ai-operation-failed', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('ai-operation-failed', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    });
  }

  async resolve(issue: BillingIssue): Promise<void> {
    this.resolving.set(true);
    this.resolutionError.set(false);
    try {
      await fetchJson(this.http, `/api/provider-billing-issues/${issue.occurrenceId}`, { method: 'DELETE' });
      this.status.reload();
    } catch {
      this.resolutionError.set(true);
    } finally {
      this.resolving.set(false);
    }
  }
}
