import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { SitePreferencesService } from '../core/services/site-preferences.service';
import { formatRole, getInitials } from '../core/utils/format';
import { BreadcrumbComponent } from '../shared/components/breadcrumb.component';
import { CnstnLogoComponent } from '../shared/components/cnstn-logo.component';
import { ToolbarControlsComponent } from '../shared/components/toolbar-controls.component';
import { UserMenuComponent } from '../shared/components/user-menu.component';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-dashboard-layout',
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
    <div class="min-h-screen bg-muted/30">
      <div class="flex min-h-screen">
        <aside
          class="toolbar-foil-surface toolbar-foil-surface--sidebar fixed inset-y-0 left-0 z-50 w-72 text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0"
          [class.translate-x-0]="sidebarOpen()"
          [class.-translate-x-full]="!sidebarOpen()"
        >
          <div class="flex h-full flex-col">
            <div class="border-b border-sidebar-border px-6 py-6">
              <a routerLink="/" class="flex items-center gap-3">
                <app-cnstn-logo [width]="68"></app-cnstn-logo>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-2xl font-semibold">LR16CNSTN02</div>
                  <div class="text-sm opacity-90">{{ site.localize(memberAreaLabel) }}</div>
                </div>
              </a>
            </div>

            <nav class="flex-1 space-y-1 overflow-y-auto p-4">
              @for (item of menuItems(); track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground"
                  [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                  class="flex items-center gap-3 rounded-2xl px-4 py-3 text-lg text-sidebar-foreground/85 transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  (click)="sidebarOpen.set(false)"
                >
                  <lucide-icon [img]="item.icon" class="h-5 w-5"></lucide-icon>
                  <span>{{ item.label }}</span>
                </a>
              }
            </nav>

            <div class="border-t border-sidebar-border p-4">
              <div class="mb-4 flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {{ initials() }}
                </div>
                <div>
                  <div class="font-semibold">{{ auth.session()?.utilisateur?.nomComplet || 'Membre' }}</div>
                  <div class="text-sm opacity-80">{{ roleLabel() }}</div>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <a routerLink="/" class="btn-outline justify-center border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground">{{ site.localize(backToSiteLabel) }}</a>
                <button type="button" class="btn-outline justify-center border-transparent text-sidebar-foreground" (click)="logout()">
                  <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                  {{ site.localize(logoutLabel) }}
                </button>
              </div>
            </div>
          </div>
        </aside>

        @if (sidebarOpen()) {
          <div class="fixed inset-0 z-40 bg-black/50 lg:hidden" (click)="sidebarOpen.set(false)"></div>
        }

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="toolbar-foil-surface toolbar-foil-surface--dashboard sticky top-0 z-30 border-b border-border/70 backdrop-blur-xl">
            <div class="px-4 py-3 lg:px-8">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <button type="button" class="toolbar-icon-button lg:hidden" (click)="sidebarOpen.set(true)">
                    <lucide-icon [img]="icons.Menu" class="h-5 w-5"></lucide-icon>
                  </button>
                  <div class="min-w-0">
                    <div class="truncate text-2xl font-semibold text-foreground lg:text-3xl">{{ currentTitle() }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <app-toolbar-controls></app-toolbar-controls>
                  <app-user-menu></app-user-menu>
                </div>
              </div>
              <div class="pt-2">
                <app-breadcrumb></app-breadcrumb>
              </div>
            </div>
          </header>

          <main class="flex-1 p-4 lg:p-8">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </div>
  `
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  readonly icons = sharedIcons;
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly router = inject(Router);
  readonly sidebarOpen = signal(false);
  readonly currentUrl = signal(this.router.url);
  private subscription?: Subscription;

  readonly memberAreaLabel = { fr: 'Espace membre', en: 'Member area', ar: 'مساحة الأعضاء' };
  readonly backToSiteLabel = { fr: 'Retour au site', en: 'Back to site', ar: 'العودة إلى الموقع' };
  readonly logoutLabel = { fr: 'Se deconnecter', en: 'Sign out', ar: 'تسجيل الخروج' };

  readonly menuItems = computed(() => {
    const role = this.auth.session()?.utilisateur.role;
    const items = [
      { path: '/dashboard', label: this.site.localize({ fr: 'Accueil', en: 'Home', ar: 'الرئيسية' }), icon: this.icons.Home },
      { path: '/dashboard/profil', label: this.site.localize({ fr: 'Mon profil', en: 'My profile', ar: 'ملفي' }), icon: this.icons.UserCircle2 },
      { path: '/dashboard/articles', label: this.site.localize({ fr: 'Mes articles', en: 'My articles', ar: 'مقالاتي' }), icon: this.icons.FileText },
      { path: '/dashboard/articles/recherche', label: this.site.localize({ fr: 'Recherche articles', en: 'Search articles', ar: 'بحث المقالات' }), icon: this.icons.FileSearch },
      { path: '/dashboard/actualites', label: this.site.localize({ fr: 'Actualites membres', en: 'Member news', ar: 'أخبار الأعضاء' }), icon: this.icons.Newspaper },
      { path: '/dashboard/projects', label: this.site.localize({ fr: 'Projets', en: 'Projects', ar: 'المشاريع' }), icon: this.icons.Users },
      { path: '/dashboard/messages', label: this.site.localize({ fr: 'Messagerie', en: 'Messages', ar: 'الرسائل' }), icon: this.icons.Mail },
      { path: '/dashboard/purchases', label: this.site.localize({ fr: 'Demandes d\'achat', en: 'Purchase requests', ar: 'طلبات الشراء' }), icon: this.icons.Settings }
    ];

    if (role === 'ADMINISTRATEUR') {
      items.push({ path: '/dashboard/admin/comptes', label: this.site.localize({ fr: 'Administration', en: 'Administration', ar: 'الإدارة' }), icon: this.icons.Settings });
    }

    if (role === 'CHEF_LABO') {
      items.push(
        { path: '/dashboard/chef/articles', label: this.site.localize({ fr: 'Moderation articles', en: 'Article moderation', ar: 'مراجعة المقالات' }), icon: this.icons.Shield },
        { path: '/dashboard/chef/actualites', label: this.site.localize({ fr: 'Gestion actualites', en: 'News management', ar: 'إدارة الأخبار' }), icon: this.icons.Newspaper }
      );
    }

    return items;
  });

  readonly initials = computed(() => getInitials(this.auth.session()?.utilisateur.nomComplet));
  readonly roleLabel = computed(() => formatRole(this.auth.session()?.utilisateur.role));
  readonly currentTitle = computed(() => {
    const match = this.menuItems().find((item) => this.currentUrl() === item.path);
    return match?.label || this.site.localize({ fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم' });
  });

  ngOnInit() {
    this.subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set((event as NavigationEnd).urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/connexion');
  }
}
