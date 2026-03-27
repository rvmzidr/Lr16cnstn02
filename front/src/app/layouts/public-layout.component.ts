import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import type { ContactData } from '../core/models/models';
import { SitePreferencesService } from '../core/services/site-preferences.service';
import { api } from '../core/services/api';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <nav
      class="fixed left-0 right-0 top-0 z-50 border-b border-primary-foreground/10 bg-primary/95 backdrop-blur-md"
    >
      <div
        class="page-shell flex h-[var(--nav-height)] items-center justify-between"
      >
        <a
          [routerLink]="['/']"
          fragment="accueil"
          class="flex items-center gap-3"
        >
          <img
            src="assets/logo-lr02.jpg"
            alt="LR16CNSTN02"
            class="h-10 w-10 rounded-full object-cover"
          />
          <span
            class="hidden text-lg font-bold tracking-wide text-primary-foreground sm:block"
            >LR16CNSTN02</span
          >
        </a>

        <ul class="hidden items-center gap-8 md:flex">
          @for (link of navLinks; track link.label.fr) {
            <li>
              <a
                [routerLink]="link.path"
                [fragment]="link.fragment"
                class="text-sm font-medium uppercase tracking-wide text-primary-foreground/82 transition-colors hover:text-secondary"
              >
                {{ site.localize(link.label) }}
              </a>
            </li>
          }
        </ul>

        <div class="hidden items-center gap-3 md:flex">
          @if (!auth.isAuthenticated()) {
            <a
              routerLink="/connexion"
              class="rounded-lg border border-primary-foreground/25 px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              {{ site.localize(loginLabel) }}
            </a>
            <a
              routerLink="/inscription"
              class="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/90"
            >
              {{ site.localize(signupLabel) }}
            </a>
          } @else {
            <a
              routerLink="/dashboard"
              class="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/90"
            >
              {{ site.localize(dashboardLabel) }}
            </a>
            <button
              type="button"
              class="rounded-lg border border-primary-foreground/25 px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-foreground/10"
              (click)="logoutFromPublic()"
            >
              {{ site.localize(logoutLabel) }}
            </button>
          }
        </div>

        <button
          type="button"
          class="rounded-lg p-2 text-primary-foreground md:hidden"
          aria-label="Menu"
          (click)="menuOpen.set(!menuOpen())"
        >
          {{ menuOpen() ? '✕' : '☰' }}
        </button>
      </div>

      @if (menuOpen()) {
        <div
          class="border-t border-primary-foreground/10 bg-primary pb-4 md:hidden"
        >
          <ul class="flex flex-col items-center gap-4 pt-4">
            @for (link of navLinks; track link.label.fr) {
              <li>
                <a
                  [routerLink]="link.path"
                  [fragment]="link.fragment"
                  class="text-sm font-medium uppercase text-primary-foreground/82 transition-colors hover:text-secondary"
                  (click)="menuOpen.set(false)"
                >
                  {{ site.localize(link.label) }}
                </a>
              </li>
            }
          </ul>

          <div class="mx-auto mt-4 grid w-[90%] max-w-xs gap-2">
            @if (!auth.isAuthenticated()) {
              <a
                routerLink="/connexion"
                class="rounded-lg border border-primary-foreground/25 px-4 py-2 text-center text-sm text-primary-foreground"
                (click)="menuOpen.set(false)"
              >
                {{ site.localize(loginLabel) }}
              </a>
              <a
                routerLink="/inscription"
                class="rounded-lg bg-secondary px-4 py-2 text-center text-sm font-semibold text-secondary-foreground"
                (click)="menuOpen.set(false)"
              >
                {{ site.localize(signupLabel) }}
              </a>
            } @else {
              <a
                routerLink="/dashboard"
                class="rounded-lg bg-secondary px-4 py-2 text-center text-sm font-semibold text-secondary-foreground"
                (click)="menuOpen.set(false)"
              >
                {{ site.localize(dashboardLabel) }}
              </a>
              <button
                type="button"
                class="rounded-lg border border-primary-foreground/25 px-4 py-2 text-center text-sm text-primary-foreground"
                (click)="logoutFromPublic()"
              >
                {{ site.localize(logoutLabel) }}
              </button>
            }
          </div>
        </div>
      }
    </nav>

    <main class="pt-[var(--nav-height)]">
      <router-outlet></router-outlet>
    </main>

    <footer
      id="contact"
      class="border-t border-primary-foreground/10 bg-primary text-primary-foreground"
    >
      <div class="page-shell py-16">
        <div class="grid gap-12 md:grid-cols-3">
          <div>
            <div class="mb-4 flex items-center gap-3">
              <img
                src="assets/logo-lr02.jpg"
                alt="Logo LR16CNSTN02"
                class="h-10 w-10 rounded-full object-cover"
                loading="lazy"
              />
              <span class="text-lg font-bold">LR16CNSTN02</span>
            </div>
            <p class="text-sm leading-relaxed text-primary-foreground/65">
              {{ site.localize(footerDesc) }}
            </p>
          </div>

          <div>
            <h4 class="mb-4 text-base font-semibold text-secondary">
              {{ site.localize(quickLinksLabel) }}
            </h4>
            <ul class="space-y-2 text-sm text-primary-foreground/75">
              @for (link of navLinks; track link.label.fr) {
                <li>
                  <a
                    [routerLink]="link.path"
                    [fragment]="link.fragment"
                    class="transition-colors hover:text-secondary"
                  >
                    {{ site.localize(link.label) }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <div>
            <h4 class="mb-4 text-base font-semibold text-secondary">Contact</h4>
            <ul class="space-y-3 text-sm text-primary-foreground/75">
              <li>
                {{
                  contact()?.adresse ||
                    'Pole Technologique, 2020 Sidi Thabet, Tunisie'
                }}
              </li>
              <li>{{ contact()?.telephone || '+216 71 537 410' }}</li>
              <li>{{ contact()?.email || 'contact@cnstn.rnrt.tn' }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="border-t border-primary-foreground/10 py-4">
        <p class="text-center text-xs text-primary-foreground/45">
          © 2026 LR16CNSTN02 - Tous droits reserves
        </p>
      </div>
    </footer>
  `,
})
export class PublicLayoutComponent implements OnInit {
  readonly site = inject(SitePreferencesService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly contact = signal<ContactData | null>(null);
  readonly menuOpen = signal(false);

  readonly navLinks = [
    {
      path: '/',
      fragment: 'accueil',
      label: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' },
    },
    {
      path: '/',
      fragment: 'apropos',
      label: { fr: 'A propos', en: 'About', ar: 'حول' },
    },
    {
      path: '/',
      fragment: 'recherche',
      label: { fr: 'Articles', en: 'Articles', ar: 'المقالات' },
    },
    {
      path: '/',
      fragment: 'actualites',
      label: { fr: 'Actualites', en: 'News', ar: 'الاخبار' },
    },
    {
      path: '/',
      fragment: 'contact',
      label: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' },
    },
  ];

  readonly quickLinksLabel = {
    fr: 'Liens rapides',
    en: 'Quick links',
    ar: 'روابط سريعة',
  };
  readonly loginLabel = { fr: 'Connexion', en: 'Sign in', ar: 'تسجيل الدخول' };
  readonly signupLabel = {
    fr: 'Inscription',
    en: 'Register',
    ar: 'إنشاء حساب',
  };
  readonly dashboardLabel = {
    fr: 'Espace membre',
    en: 'Member area',
    ar: 'فضاء الأعضاء',
  };
  readonly logoutLabel = {
    fr: 'Deconnexion',
    en: 'Sign out',
    ar: 'تسجيل الخروج',
  };
  readonly footerDesc = {
    fr: 'Laboratoire de recherche rattache au Centre National des Sciences et Technologies Nucleaires, Tunisie.',
    en: 'Research laboratory affiliated with the National Center for Nuclear Sciences and Technologies, Tunisia.',
    ar: 'مختبر بحثي تابع للمركز الوطني للعلوم والتكنولوجيا النووية، تونس.',
  };

  async ngOnInit() {
    try {
      this.contact.set(await api.getContact());
    } catch {
      this.contact.set(null);
    }
  }

  async logoutFromPublic() {
    this.auth.logout();
    this.menuOpen.set(false);
    await this.router.navigateByUrl('/connexion');
  }
}
