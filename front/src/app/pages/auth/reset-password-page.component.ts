import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-shell flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div class="surface-card w-full max-w-xl p-8 lg:p-10">
        <h1 class="text-4xl font-bold text-foreground">Reinitialiser le mot de passe</h1>
        <p class="mt-3 text-lg leading-8 text-muted-foreground">Definissez un nouveau mot de passe pour votre compte.</p>
        <form class="mt-8 space-y-5" (ngSubmit)="submit()">
          <div>
            <label class="mb-2 block font-semibold">Nouveau mot de passe</label>
            <input [(ngModel)]="nouveauMotDePasse" name="nouveauMotDePasse" type="password" class="input-shell" required />
          </div>
          <div>
            <label class="mb-2 block font-semibold">Confirmation</label>
            <input [(ngModel)]="confirmationMotDePasse" name="confirmationMotDePasse" type="password" class="input-shell" required />
          </div>
          @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ successMessage() }}</div> }
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
          <button type="submit" class="btn-secondary" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Enregistrement...' : 'Mettre a jour' }}</button>
        </form>
        <div class="mt-6 text-base text-muted-foreground"><a routerLink="/connexion" class="transition hover:text-foreground">Retour a la connexion</a></div>
      </div>
    </section>
  `
})
export class ResetPasswordPageComponent {
  readonly route = inject(ActivatedRoute);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await api.resetPassword({
        token: this.route.snapshot.queryParamMap.get('token') || '',
        nouveauMotDePasse: this.nouveauMotDePasse,
        confirmationMotDePasse: this.confirmationMotDePasse
      });
      this.successMessage.set('Mot de passe mis a jour avec succes.');
      this.nouveauMotDePasse = '';
      this.confirmationMotDePasse = '';
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la reinitialisation.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
