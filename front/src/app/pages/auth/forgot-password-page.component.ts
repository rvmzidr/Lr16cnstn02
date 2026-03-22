import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-shell flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div class="surface-card w-full max-w-xl p-8 lg:p-10">
        <h1 class="text-4xl font-bold text-foreground">Mot de passe oublie</h1>
        <p class="mt-3 text-lg leading-8 text-muted-foreground">Saisissez votre email institutionnel pour generer un lien de reinitialisation.</p>
        <form class="mt-8 space-y-5" (ngSubmit)="submit()">
          <div>
            <label class="mb-2 block font-semibold">Email institutionnel</label>
            <input [(ngModel)]="emailInstitutionnel" name="emailInstitutionnel" type="email" class="input-shell" required />
          </div>
          @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ successMessage() }}</div> }
          @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
          <button type="submit" class="btn-secondary" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Envoi...' : 'Envoyer le lien' }}</button>
        </form>
        <div class="mt-6 text-base text-muted-foreground"><a routerLink="/connexion" class="transition hover:text-foreground">Retour a la connexion</a></div>
      </div>
    </section>
  `
})
export class ForgotPasswordPageComponent {
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  emailInstitutionnel = '';

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      const response = await api.forgotPassword({ emailInstitutionnel: this.emailInstitutionnel });
      this.successMessage.set(response.resetUrl || 'Lien genere avec succes.');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la demande.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
