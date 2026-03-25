
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';
import type { ContactData } from '../core/models/models';
import { SitePreferencesService } from '../core/services/site-preferences.service';
import { api } from '../core/services/api';
import { stripReleaseMention } from '../core/utils/text';
import { BreadcrumbComponent } from '../shared/components/breadcrumb.component';
import { CnstnLogoComponent } from '../shared/components/cnstn-logo.component';
import { ToolbarControlsComponent } from '../shared/components/toolbar-controls.component';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
    BreadcrumbComponent,
    CnstnLogoComponent,
    ToolbarControlsComponent
  ],
  template: `
    <div class="min-h-screen bg-background" [class.public-drawer-open]="mobileMenuOpen()">
      @if (!mobileMenuOpen()) {
        <button
          type="button"
          class="toolbar-icon-button public-sidebar-toggle lg:hidden"
          [attr.aria-label]="site.localize(openMenuLabel)"
          (click)="toggleMobileMenu()"
        >
          <lucide-icon [img]="icons.Menu" class="h-5 w-5"></lucide-icon>
        </button>
      }

      <div class="flex min-h-screen">
        <aside class="public-main-sidebar hidden lg:flex" [class.public-main-sidebar--compact]="sidebarMinimized()" aria-label="Navigation principale">
          <div class="public-main-sidebar__inner">
            <div class="public-main-sidebar__brand-row">
              <button
                type="button"
                class="toolbar-icon-button public-main-sidebar__minimize-btn"
                [attr.aria-label]="sidebarMinimized() ? site.localize(expandSidebarLabel) : site.localize(minimizeSidebarLabel)"
                (click)="sidebarMinimized.set(!sidebarMinimized())"
              >
                <lucide-icon [img]="sidebarMinimized() ? icons.ChevronRight : icons.ChevronLeft" class="h-5 w-5"></lucide-icon>
              </button>

              <a routerLink="/" class="public-main-sidebar__brand">
                <span class="public-main-sidebar__brand-logo">
                  <app-cnstn-logo [width]="58"></app-cnstn-logo>
                </span>
                <div class="public-main-sidebar__brand-copy min-w-0">
                  <div class="truncate text-lg font-semibold leading-none text-foreground">LR16CNSTN02</div>
                  <div class="mt-1 truncate text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{{ site.localize(platformLabel) }}</div>
                </div>
              </a>
            </div>

            @if (!sidebarMinimized()) {
              <div class="public-main-sidebar__section-title">Menu</div>
            }

            <nav class="public-main-sidebar__nav" aria-label="Menu public">
              @for (link of navLinks; track link.path) {
                <a
                  [routerLink]="link.path"
                  routerLinkActive="public-main-sidebar__link--active"
                  [routerLinkActiveOptions]="{ exact: link.exact }"
                  class="public-main-sidebar__link"
                  [attr.title]="site.localize(link.label)"
                >
                  <lucide-icon [img]="link.icon" class="h-4 w-4"></lucide-icon>
                  <span>{{ site.localize(link.label) }}</span>
                </a>
              }
            </nav>

            @if (!sidebarMinimized()) {
              <div class="public-main-sidebar__divider"></div>

              <div class="space-y-2">
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/connexion" class="toolbar-action toolbar-action--solid w-full justify-center">{{ site.localize(loginLabel) }}</a>
                  <a routerLink="/inscription" class="toolbar-action w-full justify-center">{{ site.localize(signUpLabel) }}</a>
                } @else {
                  <a routerLink="/dashboard" class="toolbar-action toolbar-action--solid w-full justify-center">{{ site.localize(memberSpaceLabel) }}</a>
                  <a routerLink="/dashboard/profil" class="toolbar-action w-full justify-center">{{ site.localize(profileLabel) }}</a>
                  <button type="button" class="toolbar-action w-full justify-center" (click)="logoutFromPublic()">{{ site.localize(logoutLabel) }}</button>
                }
              </div>

              <div class="public-main-sidebar__divider"></div>
              <app-toolbar-controls></app-toolbar-controls>
            } @else {
              <div class="public-main-sidebar__divider"></div>
              <div class="public-main-sidebar__compact-tools">
                @if (!auth.isAuthenticated()) {
                  <a class="public-main-sidebar__icon-action" routerLink="/connexion" [attr.title]="site.localize(loginLabel)">
                    <lucide-icon [img]="icons.KeyRound" class="h-4 w-4"></lucide-icon>
                  </a>
                  <a class="public-main-sidebar__icon-action" routerLink="/inscription" [attr.title]="site.localize(signUpLabel)">
                    <lucide-icon [img]="icons.Users" class="h-4 w-4"></lucide-icon>
                  </a>
                } @else {
                  <a class="public-main-sidebar__icon-action" routerLink="/dashboard" [attr.title]="site.localize(memberSpaceLabel)">
                    <lucide-icon [img]="icons.Shield" class="h-4 w-4"></lucide-icon>
                  </a>
                  <button type="button" class="public-main-sidebar__icon-action" [attr.title]="site.localize(logoutLabel)" (click)="logoutFromPublic()">
                    <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                  </button>
                }
                <app-toolbar-controls [compact]="true"></app-toolbar-controls>
              </div>
            }
          </div>
        </aside>

        @if (mobileMenuOpen()) {
          <div class="fixed inset-0 z-[58] bg-black/45 lg:hidden" (click)="mobileMenuOpen.set(false)"></div>
          <aside class="public-main-sidebar public-main-sidebar--mobile lg:hidden" aria-label="Navigation principale mobile">
            <div class="public-main-sidebar__inner">
              <div class="public-main-sidebar__mobile-header">
                <a routerLink="/" class="public-main-sidebar__brand flex-1 min-w-0" (click)="mobileMenuOpen.set(false)">
                  <span class="public-main-sidebar__brand-logo">
                    <app-cnstn-logo [width]="54"></app-cnstn-logo>
                  </span>
                  <div class="min-w-0">
                    <div class="truncate text-lg font-semibold leading-none text-foreground">LR16CNSTN02</div>
                    <div class="mt-1 truncate text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{{ site.localize(platformLabel) }}</div>
                  </div>
                </a>

                <button
                  type="button"
                  class="toolbar-icon-button public-main-sidebar__mobile-close mt-1"
                  [attr.aria-label]="site.localize(closeMenuLabel)"
                  (click)="mobileMenuOpen.set(false)"
                >
                  <lucide-icon [img]="icons.X" class="h-5 w-5"></lucide-icon>
                </button>
              </div>

              <div class="public-main-sidebar__section-title">Menu</div>

              <nav class="public-main-sidebar__nav" aria-label="Menu public mobile">
                @for (link of navLinks; track link.path) {
                  <a
                    [routerLink]="link.path"
                    routerLinkActive="public-main-sidebar__link--active"
                    [routerLinkActiveOptions]="{ exact: link.exact }"
                    class="public-main-sidebar__link"
                    (click)="mobileMenuOpen.set(false)"
                  >
                    <lucide-icon [img]="link.icon" class="h-4 w-4"></lucide-icon>
                    <span>{{ site.localize(link.label) }}</span>
                  </a>
                }
              </nav>

              <div class="public-main-sidebar__divider"></div>

              <div class="space-y-2">
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/connexion" class="toolbar-action toolbar-action--solid w-full justify-center" (click)="mobileMenuOpen.set(false)">{{ site.localize(loginLabel) }}</a>
                  <a routerLink="/inscription" class="toolbar-action w-full justify-center" (click)="mobileMenuOpen.set(false)">{{ site.localize(signUpLabel) }}</a>
                } @else {
                  <a routerLink="/dashboard" class="toolbar-action toolbar-action--solid w-full justify-center" (click)="mobileMenuOpen.set(false)">{{ site.localize(memberSpaceLabel) }}</a>
                  <a routerLink="/dashboard/profil" class="toolbar-action w-full justify-center" (click)="mobileMenuOpen.set(false)">{{ site.localize(profileLabel) }}</a>
                  <button type="button" class="toolbar-action w-full justify-center" (click)="logoutFromPublic()">{{ site.localize(logoutLabel) }}</button>
                }
              </div>

              <div class="public-main-sidebar__divider"></div>
              <app-toolbar-controls></app-toolbar-controls>
            </div>
          </aside>
        }

        <div class="public-content-with-sidebar min-w-0 flex-1 flex flex-col" [class.public-content-with-sidebar--compact]="sidebarMinimized()">
          <div class="page-shell py-4">
            <app-breadcrumb></app-breadcrumb>
          </div>

          <main class="min-w-0 flex-1">
            <router-outlet></router-outlet>
          </main>

          <footer class="public-footer mt-auto border-t">
        <div class="page-shell py-12">
          <div class="grid gap-8 xl:grid-cols-[1.25fr_0.75fr_0.7fr]">
            <div class="space-y-5">
              <div class="flex items-center gap-4">
                  <span class="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                    <app-cnstn-logo [width]="56"></app-cnstn-logo>
                </span>
                <div>
                  <div class="text-xl font-semibold">LR16CNSTN02</div>
                  <div class="text-sm public-footer__muted">{{ site.localize(platformLabel) }}</div>
                </div>
              </div>
              <p class="max-w-xl text-sm public-footer__muted">
                {{ site.localize(descriptionCopy) }}
              </p>
            </div>

            <div>
              <h3 class="public-footer__heading mb-4 text-sm font-semibold uppercase tracking-[0.2em]">{{ site.localize(quickLinksLabel) }}</h3>
              <ul class="space-y-3 text-sm public-footer__muted">
                @for (link of navLinks; track link.path) {
                  <li><a [routerLink]="link.path" class="transition hover:text-white">{{ site.localize(link.label) }}</a></li>
                }
              </ul>
            </div>

            <div class="space-y-3 text-sm public-footer__muted">
              <div class="public-footer__heading text-sm font-semibold uppercase tracking-[0.2em]">Contact</div>
              <div>{{ contact()?.institution?.nom || 'Centre National des Sciences et Technologies Nucleaires' }}</div>
              <div>Email: {{ contact()?.email || 'contact@lr16cnstn02.tn' }}</div>
              <div>Telephone: {{ contact()?.telephone || '+216 71 000 000' }}</div>
            </div>
          </div>
          <div class="public-footer__subtle mt-8 border-t border-white/10 pt-8 text-center text-sm">
            &copy; 2026 LR16CNSTN02. {{ stripReleaseMention(site.localize(footerCopy)) }}
          </div>
        </div>
          </footer>
        </div>
      </div>
    </div>
  `
})
export class PublicLayoutComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly stripReleaseMention = stripReleaseMention;
  readonly mobileMenuOpen = signal(false);
  readonly sidebarMinimized = signal(false);
  readonly contact = signal<ContactData | null>(null);

  readonly platformLabel = {
    fr: 'Portail scientifique',
    en: 'Scientific portal',
    ar: 'البوابة العلمية'
  };
  readonly descriptionCopy = {
    fr: 'Plateforme scientifique dediee a la diffusion des articles, actualites et espaces membres.',
    en: 'Scientific platform dedicated to articles, news, and member workspaces.',
    ar: 'منصة علمية مخصصة لنشر المقالات والأخبار وفضاءات الأعضاء.'
  };
  readonly quickLinksLabel = { fr: 'Liens rapides', en: 'Quick links', ar: 'روابط سريعة' };
  readonly footerCopy = { fr: 'Plateforme scientifique officielle.', en: 'Official scientific platform.', ar: 'المنصة العلمية الرسمية.' };
  readonly signUpLabel = { fr: 'Inscription', en: 'Register', ar: 'إنشاء حساب' };
  readonly loginLabel = { fr: 'Connexion', en: 'Sign in', ar: 'تسجيل الدخول' };
  readonly memberSpaceLabel = { fr: 'Espace membre', en: 'Member area', ar: 'فضاء الأعضاء' };
  readonly profileLabel = { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' };
  readonly logoutLabel = { fr: 'Deconnexion', en: 'Sign out', ar: 'تسجيل الخروج' };
  readonly homeLabel = { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' };
  readonly articlesRailLabel = { fr: 'Articles', en: 'Articles', ar: 'المقالات' };
  readonly newsRailLabel = { fr: 'Actualites', en: 'News', ar: 'الأخبار' };
  readonly aboutRailLabel = { fr: 'A propos', en: 'About', ar: 'حول' };
  readonly contactRailLabel = { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' };
  readonly openMenuLabel = { fr: 'Ouvrir le menu', en: 'Open menu', ar: 'فتح القائمة' };
  readonly closeMenuLabel = { fr: 'Fermer le menu', en: 'Close menu', ar: 'إغلاق القائمة' };
  readonly minimizeSidebarLabel = { fr: 'Reduire la barre laterale', en: 'Minimize sidebar', ar: 'تصغير الشريط الجانبي' };
  readonly expandSidebarLabel = { fr: 'Etendre la barre laterale', en: 'Expand sidebar', ar: 'توسيع الشريط الجانبي' };

  readonly navLinks = [
    { path: '/', label: { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }, icon: this.icons.Home, exact: true },
    { path: '/articles', label: { fr: 'Articles', en: 'Articles', ar: 'المقالات' }, icon: this.icons.FileText, exact: false },
    { path: '/news', label: { fr: 'Actualites', en: 'News', ar: 'الأخبار' }, icon: this.icons.Newspaper, exact: false },
    { path: '/about', label: { fr: 'A propos', en: 'About', ar: 'حول' }, icon: this.icons.Atom, exact: false },
    { path: '/contact', label: { fr: 'Contact', en: 'Contact', ar: 'اتصل بنا' }, icon: this.icons.Mail, exact: false }
  ];

  toggleMobileMenu() {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  async logoutFromPublic() {
    this.auth.logout();
    this.mobileMenuOpen.set(false);
    await this.router.navigateByUrl('/connexion');
  }

  async ngOnInit() {
    try {
      this.contact.set(await api.getContact());
    } catch {
      this.contact.set(null);
    }
  }
}
