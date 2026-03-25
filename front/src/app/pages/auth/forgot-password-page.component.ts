
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="auth-shell">
        <div class="auth-panel">
          <div class="tag-chip">Securite du compte</div>
          <h1 class="mt-5 text-4xl font-semibold text-foreground lg:text-5xl">Mot de passe oublie</h1>
          <p class="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">
            Saisissez votre email institutionnel pour generer un lien de reinitialisation.
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block">Email institutionnel</label>
              <input [(ngModel)]="emailInstitutionnel" name="emailInstitutionnel" type="email" class="input-shell" required />
            </div>
            @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ successMessage() }}</div> }
            @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
            <button type="submit" class="btn-secondary w-full justify-center" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Envoi...' : 'Envoyer le lien' }}</button>
          </form>

          <div class="mt-6 text-sm text-muted-foreground">
            <a routerLink="/connexion" class="transition hover:text-foreground">Retour a la connexion</a>
          </div>
        </div>

        <aside class="auth-aside p-6 lg:p-8">
          <div class="tag-chip border-white/10 bg-white/10 text-white">Recuperation</div>
          <h2 class="mt-6 text-3xl font-semibold text-white">Controle d'acces securise</h2>
          <p class="mt-4 text-sm text-white/72">
            Le flux de reinitialisation reste aligne sur la logique actuelle du backend sans changer les tokens ni les routes d'authentification.
          </p>

          <div class="mt-8 space-y-3">
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Email institutionnel</div>
              <div class="mt-2 text-sm text-white/72">Le lien de recuperation est genere a partir de l'adresse officielle du membre.</div>
            </div>
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Flux Release 1</div>
              <div class="mt-2 text-sm text-white/72">Aucune nouvelle semantique d'authentification n'est introduite dans cette refonte visuelle.</div>
            </div>
          </div>
        </aside>
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
