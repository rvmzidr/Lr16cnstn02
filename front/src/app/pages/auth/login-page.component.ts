
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="auth-shell">
        <div class="auth-panel">
          <div class="tag-chip">Espace membre</div>
          <h1 class="mt-5 text-4xl font-semibold text-foreground lg:text-5xl">Connexion a la plateforme</h1>
          <p class="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">
            Connectez-vous avec votre compte institutionnel pour gerer vos articles, votre profil et les validations du laboratoire.
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block">Email institutionnel</label>
              <div class="relative">
                <lucide-icon [img]="icons.Mail" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
                <input [(ngModel)]="emailInstitutionnel" name="emailInstitutionnel" type="email" class="input-shell pl-11" required />
              </div>
            </div>
            <div>
              <label class="mb-2 block">Mot de passe</label>
              <div class="relative">
                <lucide-icon [img]="icons.Lock" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
                <input [(ngModel)]="motDePasse" name="motDePasse" type="password" class="input-shell pl-11" required />
              </div>
            </div>
            @if (errorMessage()) {
              <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">{{ errorMessage() }}</div>
            }
            <button type="submit" class="btn-secondary w-full justify-center" [disabled]="isSubmitting()">
              {{ isSubmitting() ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>

          <div class="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <a routerLink="/mot-de-passe-oublie" class="transition hover:text-foreground">Mot de passe oublie ?</a>
            <a routerLink="/inscription" class="transition hover:text-foreground">Creer un compte</a>
          </div>
        </div>

        <aside class="auth-aside p-6 lg:p-8">
          <div class="tag-chip border-white/10 bg-white/10 text-white">Release 1</div>
          <h2 class="mt-6 text-3xl font-semibold text-white">Un point d'entree unique pour le cycle scientifique</h2>
          <p class="mt-4 text-sm text-white/72">
            L'espace membre centralise les soumissions d'articles, la moderation et les actualites internes dans une interface unique.
          </p>

          <div class="mt-8 space-y-3">
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Soumissions et revisions</div>
              <div class="mt-2 text-sm text-white/72">Suivez vos brouillons, soumissions et publications depuis le tableau de bord.</div>
            </div>
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Validation des comptes</div>
              <div class="mt-2 text-sm text-white/72">Les administrateurs peuvent traiter les inscriptions et attribuer les roles sans changer de contexte.</div>
            </div>
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">Pilotage du laboratoire</div>
              <div class="mt-2 text-sm text-white/72">Les chefs de laboratoire arbitrent les articles et publient les actualites depuis la meme interface.</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `
})
export class LoginPageComponent {
  readonly icons = sharedIcons;
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  emailInstitutionnel = '';
  motDePasse = '';

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.login(this.emailInstitutionnel, this.motDePasse);
      const next = this.route.snapshot.queryParamMap.get('next') || '/dashboard';
      await this.router.navigateByUrl(next);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
