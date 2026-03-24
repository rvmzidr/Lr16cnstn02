
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
    <section class="page-shell flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div class="surface-card w-full max-w-xl p-8 lg:p-10">
        <div class="mb-8 flex items-center gap-3">
          <div class="rounded-2xl bg-accent p-3"><lucide-icon [img]="icons.Atom" class="h-7 w-7 text-primary"></lucide-icon></div>
          <div>
            <div class="text-3xl font-semibold text-foreground">LR16CNSTN02</div>
            <div class="text-lg text-muted-foreground">Acces membre</div>
          </div>
        </div>
        <h1 class="text-4xl font-bold text-foreground">Connexion a l'espace membre</h1>
        <p class="mt-3 text-lg leading-8 text-muted-foreground">Connectez-vous avec votre compte institutionnel pour acceder a l'espace de travail du laboratoire.</p>

        <form class="mt-8 space-y-5" (ngSubmit)="submit()">
          <div>
            <label class="mb-2 block font-semibold">Email institutionnel</label>
            <div class="relative">
              <lucide-icon [img]="icons.Mail" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
              <input [(ngModel)]="emailInstitutionnel" name="emailInstitutionnel" type="email" class="input-shell pl-11" required />
            </div>
          </div>
          <div>
            <label class="mb-2 block font-semibold">Mot de passe</label>
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

        <div class="mt-6 flex items-center justify-between text-base text-muted-foreground">
          <a routerLink="/mot-de-passe-oublie" class="transition hover:text-foreground">Mot de passe oublie ?</a>
          <a routerLink="/inscription" class="transition hover:text-foreground">Creer un compte</a>
        </div>
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
