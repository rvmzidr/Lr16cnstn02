import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
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

type DashboardMenuItem = {
  path: string;
  label: string;
  icon: any;
  section: 'workspace' | 'governance' | 'roadmap';
};

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
    BreadcrumbComponent,
    CnstnLogoComponent,
    ToolbarControlsComponent,
    UserMenuComponent,
  ],
  template: `
    <div class="min-h-screen bg-background">
      <div class="flex min-h-screen">
        <aside
          class="fixed inset-y-0 left-0 z-50 w-[290px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 xl:translate-x-0"
          [class.translate-x-0]="sidebarOpen()"
          [class.-translate-x-full]="!sidebarOpen()"
        >
          <div class="flex h-full flex-col">
            <div class="border-b border-sidebar-border px-5 py-6">
              <div class="flex items-center justify-between gap-3">
                <a routerLink="/" class="flex min-w-0 items-center gap-3">
                  <span
                    class="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
                  >
                    <app-cnstn-logo [width]="34"></app-cnstn-logo>
                  </span>
                  <div class="min-w-0 flex-1">
                    <div
                      class="truncate text-lg font-semibold text-sidebar-foreground"
                    >
                      LR16CNSTN02
                    </div>
                    <div
                      class="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      {{ site.localize(memberAreaLabel) }}
                    </div>
                  </div>
                </a>

                <button
                  type="button"
                  class="toolbar-icon-button xl:hidden"
                  (click)="sidebarOpen.set(false)"
                >
                  <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-6">
              @for (section of menuSections(); track section.key) {
                <div class="mb-6">
                  <div
                    class="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    {{ section.label }}
                  </div>

                  <nav class="mt-3 space-y-1">
                    @for (item of section.items; track item.path) {
                      <a
                        [routerLink]="item.path"
                        routerLinkActive="bg-sidebar-primary text-sidebar-primary-foreground"
                        [routerLinkActiveOptions]="{
                          exact: item.path === '/dashboard',
                        }"
                        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/82 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        (click)="sidebarOpen.set(false)"
                      >
                        <span
                          class="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card"
                        >
                          <lucide-icon
                            [img]="item.icon"
                            class="h-4 w-4"
                          ></lucide-icon>
                        </span>
                        <span>{{ item.label }}</span>
                      </a>
                    }
                  </nav>
                </div>
              }
            </div>

            <div class="border-t border-sidebar-border p-4">
              <div class="rounded-2xl border border-border bg-muted/60 p-4">
                <div class="mb-4 flex items-center gap-3">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 text-primary font-semibold"
                  >
                    {{ initials() }}
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-foreground">
                      {{ auth.session()?.utilisateur?.nomComplet || 'Membre' }}
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {{ roleLabel() }}
                    </div>
                  </div>
                </div>

                <div
                  class="mb-4 rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div
                    class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {{ site.localize(workspaceLabel) }}
                  </div>
                  <div class="mt-2 text-sm text-foreground">
                    {{ currentSectionLabel() }}
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <a routerLink="/" class="btn-outline justify-center">{{
                    site.localize(backToSiteLabel)
                  }}</a>
                  <button
                    type="button"
                    class="btn-secondary justify-center"
                    (click)="logout()"
                  >
                    <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
                    {{ site.localize(logoutLabel) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        @if (sidebarOpen()) {
          <div
            class="fixed inset-0 z-40 bg-black/40 xl:hidden"
            (click)="sidebarOpen.set(false)"
          ></div>
        }

        <div class="flex min-w-0 flex-1 flex-col xl:ml-[290px]">
          <header
            class="toolbar-foil-surface toolbar-foil-surface--dashboard sticky top-0 z-30 border-b border-border/80 backdrop-blur-xl"
          >
            <div class="page-shell py-4">
              <div
                class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div class="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    class="toolbar-icon-button xl:hidden"
                    (click)="sidebarOpen.set(true)"
                  >
                    <lucide-icon
                      [img]="icons.Menu"
                      class="h-5 w-5"
                    ></lucide-icon>
                  </button>
                  <div class="min-w-0">
                    <div
                      class="truncate text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                    >
                      {{ currentSectionLabel() }}
                    </div>
                    <div
                      class="truncate text-2xl font-semibold text-foreground lg:text-[2rem]"
                    >
                      {{ currentTitle() }}
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="hidden rounded-full border border-primary/10 bg-primary/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary lg:inline-flex"
                  >
                    Release 1
                  </span>
                  <app-toolbar-controls></app-toolbar-controls>
                  <app-user-menu></app-user-menu>
                </div>
              </div>

              <div class="pt-3">
                <app-breadcrumb></app-breadcrumb>
              </div>
            </div>
          </header>

          <main class="page-shell flex-1 py-6 lg:py-8">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </div>
  `,
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  readonly icons = sharedIcons;
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly router = inject(Router);
  readonly sidebarOpen = signal(false);
  readonly currentUrl = signal(this.router.url);
  private subscription?: Subscription;

  readonly memberAreaLabel = {
    fr: 'Espace membre',
    en: 'Member area',
    ar: 'فضاء الأعضاء',
  };
  readonly workspaceLabel = {
    fr: 'Section active',
    en: 'Active section',
    ar: 'القسم النشط',
  };
  readonly backToSiteLabel = {
    fr: 'Retour au site',
    en: 'Back to site',
    ar: 'العودة إلى الموقع',
  };
  readonly logoutLabel = {
    fr: 'Se deconnecter',
    en: 'Sign out',
    ar: 'تسجيل الخروج',
  };

  readonly menuItems = computed<DashboardMenuItem[]>(() => {
    const role = this.auth.session()?.utilisateur.role;
    const items: DashboardMenuItem[] = [
      {
        path: '/dashboard',
        label: this.site.localize({
          fr: 'Accueil',
          en: 'Home',
          ar: 'الرئيسية',
        }),
        icon: this.icons.Home,
        section: 'workspace',
      },
      {
        path: '/dashboard/profil',
        label: this.site.localize({
          fr: 'Mon profil',
          en: 'My profile',
          ar: 'ملفي',
        }),
        icon: this.icons.UserCircle2,
        section: 'workspace',
      },
      {
        path: '/dashboard/articles',
        label: this.site.localize({
          fr: 'Mes articles',
          en: 'My articles',
          ar: 'مقالاتي',
        }),
        icon: this.icons.FileText,
        section: 'workspace',
      },
      {
        path: '/dashboard/articles/recherche',
        label: this.site.localize({
          fr: 'Recherche articles',
          en: 'Search articles',
          ar: 'بحث المقالات',
        }),
        icon: this.icons.FileSearch,
        section: 'workspace',
      },
      {
        path: '/dashboard/actualites',
        label: this.site.localize({
          fr: 'Actualites membres',
          en: 'Member news',
          ar: 'أخبار الأعضاء',
        }),
        icon: this.icons.Newspaper,
        section: 'workspace',
      },
      {
        path: '/dashboard/projects',
        label: this.site.localize({
          fr: 'Projets',
          en: 'Projects',
          ar: 'المشاريع',
        }),
        icon: this.icons.Users,
        section: 'roadmap',
      },
      {
        path: '/dashboard/messages',
        label: this.site.localize({
          fr: 'Messagerie',
          en: 'Messages',
          ar: 'الرسائل',
        }),
        icon: this.icons.Mail,
        section: 'roadmap',
      },
      {
        path: '/dashboard/purchases',
        label: this.site.localize({
          fr: "Demandes d'achat",
          en: 'Purchase requests',
          ar: 'طلبات الشراء',
        }),
        icon: this.icons.Settings,
        section: 'roadmap',
      },
    ];

    if (role === 'ADMINISTRATEUR') {
      items.push({
        path: '/dashboard/admin/comptes',
        label: this.site.localize({
          fr: 'Administration',
          en: 'Administration',
          ar: 'الإدارة',
        }),
        icon: this.icons.Settings,
        section: 'governance',
      });
    }

    if (role === 'CHEF_LABO') {
      items.push(
        {
          path: '/dashboard/chef/articles',
          label: this.site.localize({
            fr: 'Moderation articles',
            en: 'Article moderation',
            ar: 'مراجعة المقالات',
          }),
          icon: this.icons.Shield,
          section: 'governance',
        },
        {
          path: '/dashboard/chef/actualites',
          label: this.site.localize({
            fr: 'Gestion actualites',
            en: 'News management',
            ar: 'إدارة الأخبار',
          }),
          icon: this.icons.Newspaper,
          section: 'governance',
        },
      );
    }

    return items;
  });

  readonly menuSections = computed(() => {
    const labels = {
      workspace: this.site.localize({
        fr: 'Espace de travail',
        en: 'Workspace',
        ar: 'مساحة العمل',
      }),
      governance: this.site.localize({
        fr: 'Gouvernance',
        en: 'Governance',
        ar: 'الحوكمة',
      }),
      roadmap: this.site.localize({
        fr: 'Fonctions futures',
        en: 'Future functions',
        ar: 'الوظائف المستقبلية',
      }),
    };

    return (['workspace', 'governance', 'roadmap'] as const)
      .map((key) => ({
        key,
        label: labels[key],
        items: this.menuItems().filter((item) => item.section === key),
      }))
      .filter((section) => section.items.length > 0);
  });

  readonly initials = computed(() =>
    getInitials(this.auth.session()?.utilisateur.nomComplet),
  );
  readonly roleLabel = computed(() =>
    formatRole(this.auth.session()?.utilisateur.role),
  );
  readonly currentSectionLabel = computed(() => {
    const current = this.menuItems().find(
      (item) => this.currentUrl() === item.path,
    );
    const labels = {
      workspace: this.site.localize({
        fr: 'Espace de travail',
        en: 'Workspace',
        ar: 'مساحة العمل',
      }),
      governance: this.site.localize({
        fr: 'Gouvernance',
        en: 'Governance',
        ar: 'الحوكمة',
      }),
      roadmap: this.site.localize({
        fr: 'Fonctions futures',
        en: 'Future functions',
        ar: 'الوظائف المستقبلية',
      }),
    };

    return current
      ? labels[current.section]
      : this.site.localize({
          fr: 'Tableau de bord',
          en: 'Dashboard',
          ar: 'لوحة التحكم',
        });
  });
  readonly currentTitle = computed(() => {
    const match = this.menuItems().find(
      (item) => this.currentUrl() === item.path,
    );
    return (
      match?.label ||
      this.site.localize({
        fr: 'Tableau de bord',
        en: 'Dashboard',
        ar: 'لوحة التحكم',
      })
    );
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
