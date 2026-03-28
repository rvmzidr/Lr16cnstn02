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
    <div class="flex min-h-[85vh] items-center justify-center py-12 px-6">
      <div
        class="animate-scale-in relative w-full max-w-[1050px] overflow-hidden rounded-[2.5rem] bg-card text-card-foreground shadow-2xl border border-secondary/10 flex flex-col md:flex-row"
      >
        <!-- Image Section -->
        <div
          class="hidden md:flex w-1/2 relative bg-primary/5 p-12 flex-col justify-center overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-primary/80 z-10 mix-blend-multiply"
          ></div>
          <img
            src="assets/nucl.jpg"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <div class="relative z-20 text-white animate-fade-in-left delay-200">
            <div
              class="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-10 shadow-xl"
            >
              <lucide-icon
                [img]="icons.Lock"
                class="w-8 h-8 text-secondary"
              ></lucide-icon>
            </div>
            <h2 class="text-4xl font-extrabold mb-6 font-serif leading-tight">
              Portail <br /><span class="text-primary">Intranet.</span>
            </h2>
            <p class="text-white/80 leading-relaxed font-light mb-8 text-lg">
              Accès au système de gestion interne réservé aux membres du
              laboratoire LR16CNSTN02.
            </p>
          </div>
        </div>

        <!-- Form Section -->
        <div
          class="w-full md:w-1/2 p-8 sm:p-14 lg:p-16 flex flex-col justify-center bg-white relative z-10 glass-card"
        >
          <h1
            class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl animate-fade-in-up delay-100 font-serif mb-3"
          >
            Connexion
          </h1>
          <p
            class="mb-10 text-sm text-muted-foreground animate-fade-in-up delay-200"
          >
            Connectez-vous avec votre compte institutionnel pour gérer vos
            articles, votre profil et les validations du laboratoire.
          </p>

          <form
            class="space-y-6 animate-fade-in-up delay-300"
            (ngSubmit)="submit()"
          >
            <div class="group">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Email institutionnel</label
              >
              <div
                class="relative transition-all duration-300 group-focus-within:-translate-y-1"
              >
                <lucide-icon
                  [img]="icons.Mail"
                  class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary z-10 transition-colors"
                ></lucide-icon>
                <input
                  [(ngModel)]="emailInstitutionnel"
                  name="emailInstitutionnel"
                  type="email"
                  class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 pl-12 pr-4 py-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
                  placeholder="nom.prenom@cnstn.rnrt.tn"
                  required
                />
              </div>
            </div>
            <div class="group">
              <label
                class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >Mot de passe</label
              >
              <div
                class="relative transition-all duration-300 group-focus-within:-translate-y-1"
              >
                <lucide-icon
                  [img]="icons.Lock"
                  class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary z-10 transition-colors"
                ></lucide-icon>
                <input
                  [(ngModel)]="motDePasse"
                  name="motDePasse"
                  type="password"
                  class="w-full bg-slate-50 border-0 border-b-2 border-slate-200 pl-12 pr-4 py-4 text-sm transition-all focus:border-primary focus:bg-white focus:ring-0 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            @if (errorMessage()) {
              <div
                class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-3 animate-fade-in-up"
              >
                {{ errorMessage() }}
              </div>
            }
            <button
              type="submit"
              class="w-full rounded-2xl bg-primary px-8 py-4 text-sm font-bold tracking-widest uppercase text-primary-foreground shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-primary/30 flex justify-center items-center mt-6"
              [disabled]="isSubmitting()"
            >
              {{ isSubmitting() ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>

          <div
            class="my-8 flex items-center gap-4 text-sm text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200 animate-fade-in-up delay-400"
          >
            ou alors
          </div>

          <div
            class="flex flex-col gap-4 text-sm font-medium animate-fade-in-up delay-500"
          >
            <a
              routerLink="/inscription"
              class="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white py-4 text-slate-600 transition-all duration-300 hover:border-secondary hover:text-secondary hover:-translate-y-1"
              >Créer un compte</a
            >
            <a
              routerLink="/mot-de-passe-oublie"
              class="text-center text-slate-400 transition-colors hover:text-primary mt-2"
              >Mot de passe oublié ?</a
            >
          </div>
        </div>
      </div>
    </div>
  `,
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
      const next =
        this.route.snapshot.queryParamMap.get('next') || '/dashboard';
      await this.router.navigateByUrl(next);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Connexion impossible.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
