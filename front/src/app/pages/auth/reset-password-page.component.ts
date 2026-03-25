
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="auth-shell">
        <div class="auth-panel">
          <div class="tag-chip">Nouveau mot de passe</div>
          <h1 class="mt-5 text-4xl font-semibold text-foreground lg:text-5xl">Reinitialiser le mot de passe</h1>
          <p class="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">
            Definissez un nouveau mot de passe pour reactiver l'acces a votre compte.
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block">Nouveau mot de passe</label>
              <input [(ngModel)]="nouveauMotDePasse" name="nouveauMotDePasse" type="password" class="input-shell" required />
            </div>
            <div>
              <label class="mb-2 block">Confirmation</label>
              <input [(ngModel)]="confirmationMotDePasse" name="confirmationMotDePasse" type="password" class="input-shell" required />
            </div>
            @if (successMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">{{ successMessage() }}</div> }
            @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div> }
            <button type="submit" class="btn-secondary w-full justify-center" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Enregistrement...' : 'Mettre a jour' }}</button>
          </form>

          <div class="mt-6 text-sm text-muted-foreground">
            <a routerLink="/connexion" class="transition hover:text-foreground">Retour a la connexion</a>
          </div>
        </div>

        <aside class="auth-aside p-6 lg:p-8">
          <div class="tag-chip border-white/10 bg-white/10 text-white">Reinitialisation</div>
          <h2 class="mt-6 text-3xl font-semibold text-white">Retour rapide a l'espace membre</h2>
          <p class="mt-4 text-sm text-white/72">
            Le token de reinitialisation existant est conserve. La refonte se limite a l'interface et au confort de saisie.
          </p>

          <div class="mt-8 space-y-3">
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Validation immediate</div>
              <div class="mt-2 text-sm text-white/72">Le formulaire garde la meme logique de confirmation du mot de passe.</div>
            </div>
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Retour au tableau de bord</div>
              <div class="mt-2 text-sm text-white/72">Une fois le mot de passe mis a jour, le membre retrouve son flux habituel de connexion.</div>
            </div>
          </div>
        </aside>
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
