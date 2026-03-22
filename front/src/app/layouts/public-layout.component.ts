import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';
import type { ContactData } from '../core/models/models';
import { SitePreferencesService } from '../core/services/site-preferences.service';
import { api } from '../core/services/api';
import { stripReleaseMention } from '../core/utils/text';
import { BreadcrumbComponent } from '../shared/components/breadcrumb.component';
import { CnstnLogoComponent } from '../shared/components/cnstn-logo.component';
import { ToolbarControlsComponent } from '../shared/components/toolbar-controls.component';
import { UserMenuComponent } from '../shared/components/user-menu.component';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
    BreadcrumbComponent,
    CnstnLogoComponent,
    ToolbarControlsComponent,
    UserMenuComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col">
      <nav class="toolbar-foil-surface toolbar-foil-surface--public sticky top-0 z-50 border-b border-border/25 text-primary-foreground backdrop-blur-xl">
        <div class="page-shell">
          <div class="grid items-center gap-3 py-3 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-6">
            <a routerLink="/" class="flex min-w-0 items-center gap-3">
              <app-cnstn-logo class="shrink-0" [width]="72"></app-cnstn-logo>
              <div class="min-w-0">
                <div class="truncate text-[1.75rem] font-semibold leading-none lg:text-[1.9rem]">LR16CNSTN02</div>
                <div class="mt-1 truncate text-sm text-primary-foreground/72">{{ site.localize(platformLabel) }}</div>
              </div>
            </a>

            <div class="hidden min-w-0 items-center gap-2 xl:flex xl:flex-wrap">
              @for (link of navLinks; track link.path) {
                <a
                  [routerLink]="link.path"
                  routerLinkActive="toolbar-link toolbar-link--active"
                  [routerLinkActiveOptions]="{ exact: link.exact }"
                  class="toolbar-link whitespace-nowrap"
                >
                  {{ site.localize(link.label) }}
                </a>
              }
            </div>

            <div class="flex items-center justify-end gap-2 xl:justify-self-end">
              @if (!auth.isAuthenticated()) {
                <a routerLink="/inscription" class="toolbar-action hidden xl:inline-flex">{{ site.localize(signUpLabel) }}</a>
                <a routerLink="/connexion" class="toolbar-action toolbar-action--solid hidden xl:inline-flex">{{ site.localize(loginLabel) }}</a>
              }

              <app-toolbar-controls></app-toolbar-controls>

              @if (auth.isAuthenticated()) {
                <app-user-menu class="hidden lg:block"></app-user-menu>
              }

              <button type="button" class="toolbar-icon-button lg:hidden" (click)="toggleMobileMenu()">
                <lucide-icon [img]="mobileMenuOpen() ? icons.X : icons.Menu" class="h-5 w-5"></lucide-icon>
              </button>
            </div>
          </div>

          <div class="hidden flex-wrap gap-2 border-t border-white/10 py-3 lg:flex xl:hidden">
            @for (link of navLinks; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="toolbar-link toolbar-link--active"
                [routerLinkActiveOptions]="{ exact: link.exact }"
                class="toolbar-link whitespace-nowrap"
              >
                {{ site.localize(link.label) }}
              </a>
            }
            @if (!auth.isAuthenticated()) {
              <a routerLink="/inscription" class="toolbar-action ml-auto">{{ site.localize(signUpLabel) }}</a>
              <a routerLink="/connexion" class="toolbar-action toolbar-action--solid">{{ site.localize(loginLabel) }}</a>
            }
          </div>

          <div class="pb-2">
            <app-breadcrumb></app-breadcrumb>
          </div>
        </div>

        @if (mobileMenuOpen()) {
          <div class="toolbar-foil-surface border-t border-white/10 lg:hidden">
            <div class="page-shell py-3">
              <div class="space-y-2">
                @for (link of navLinks; track link.path) {
                  <a
                    [routerLink]="link.path"
                    class="block rounded-xl px-3 py-3 text-base text-primary-foreground/88 transition hover:bg-white/8 hover:text-primary-foreground"
                    (click)="mobileMenuOpen.set(false)"
                  >
                    {{ site.localize(link.label) }}
                  </a>
                }
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/inscription" class="toolbar-action" (click)="mobileMenuOpen.set(false)">{{ site.localize(signUpLabel) }}</a>
                  <a routerLink="/connexion" class="toolbar-action toolbar-action--solid" (click)="mobileMenuOpen.set(false)">{{ site.localize(loginLabel) }}</a>
                } @else {
                  <a routerLink="/dashboard" class="toolbar-action toolbar-action--solid" (click)="mobileMenuOpen.set(false)">{{ site.localize(memberSpaceLabel) }}</a>
                }
              </div>
            </div>
          </div>
        }
      </nav>

      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>

      <footer class="mt-auto border-t border-border/30 bg-primary text-primary-foreground">
        <div class="page-shell py-12">
          <div class="grid gap-8 md:grid-cols-3">
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <app-cnstn-logo [width]="60"></app-cnstn-logo>
                <span class="text-xl font-semibold">LR16CNSTN02</span>
              </div>
              <p class="text-sm opacity-90">
                {{ site.localize(descriptionCopy) }}
              </p>
            </div>

            <div>
              <h3 class="mb-4 text-lg font-semibold">{{ site.localize(quickLinksLabel) }}</h3>
              <ul class="space-y-3 text-sm">
                @for (link of navLinks; track link.path) {
                  <li><a [routerLink]="link.path" class="transition hover:text-accent">{{ site.localize(link.label) }}</a></li>
                }
              </ul>
            </div>

            <div class="space-y-3 text-sm">
              <div>{{ contact()?.institution?.nom || 'Centre National des Sciences et Technologies Nucleaires' }}</div>
              <div>Email: {{ contact()?.email || 'contact@lr16cnstn02.tn' }}</div>
              <div>Telephone: {{ contact()?.telephone || '+216 71 000 000' }}</div>
            </div>
          </div>
          <div class="mt-8 border-t border-white/10 pt-8 text-center text-sm opacity-90">
            &copy; 2026 LR16CNSTN02. {{ stripReleaseMention(site.localize(footerCopy)) }}
          </div>
        </div>
      </footer>
    </div>
  `
})
export class PublicLayoutComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly auth = inject(AuthService);
  readonly stripReleaseMention = stripReleaseMention;
  readonly mobileMenuOpen = signal(false);
  readonly contact = signal<ContactData | null>(null);

  readonly platformLabel = {
    fr: 'Plateforme scientifique du laboratoire',
    en: 'Scientific laboratory platform',
    ar: 'المنصة العلمية الخاصة بالمختبر'
  };
  readonly descriptionCopy = {
    fr: 'Plateforme scientifique dediee a la diffusion des articles, actualites et espaces membres.',
    en: 'Scientific platform dedicated to articles, news, and member workspaces.',
    ar: 'منصة علمية مخصصة لنشر المقالات والأخبار ومساحات الأعضاء.'
  };
  readonly quickLinksLabel = { fr: 'Liens rapides', en: 'Quick links', ar: 'روابط سريعة' };
  readonly footerCopy = { fr: 'Plateforme scientifique officielle.', en: 'Official scientific platform.', ar: 'المنصة العلمية الرسمية.' };
  readonly signUpLabel = { fr: 'Inscription', en: 'Register', ar: 'التسجيل' };
  readonly loginLabel = { fr: 'Connexion', en: 'Sign in', ar: 'تسجيل الدخول' };
  readonly memberSpaceLabel = { fr: 'Espace membre', en: 'Member area', ar: 'مساحة الأعضاء' };

  readonly navLinks = [
    { path: '/', label: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }, exact: true },
    { path: '/articles', label: { fr: 'Articles', en: 'Articles', ar: 'المقالات' }, exact: false },
    { path: '/news', label: { fr: 'Actualites', en: 'News', ar: 'الأخبار' }, exact: false },
    { path: '/about', label: { fr: 'A propos', en: 'About', ar: 'حول' }, exact: false },
    { path: '/contact', label: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' }, exact: false }
  ];

  toggleMobileMenu() {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  async ngOnInit() {
    try {
      this.contact.set(await api.getContact());
    } catch {
      this.contact.set(null);
    }
  }
}
