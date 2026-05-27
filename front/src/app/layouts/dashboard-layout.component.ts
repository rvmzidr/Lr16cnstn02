import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
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
import { api } from '../core/services/api';
import {
  LocalizedCopy,
  SitePreferencesService,
} from '../core/services/site-preferences.service';
import { getInitials } from '../core/utils/format';
import {
  DashboardRole,
  RoleService,
} from '../shared/services/role.service';
import { AccessContextService } from '../shared/services/access-context.service';
import { NotificationsStateService } from '../shared/services/notifications-state.service';
import { sharedIcons } from '../shared/lucide-icons';
import { ToolbarControlsComponent } from '../shared/components/toolbar-controls.component';

type DashboardMenuItem = {
  key: string;
  label: LocalizedCopy;
  path: string;
  icon: any;
  roles: DashboardRole[];
};

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideAngularModule,
    ToolbarControlsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-background text-foreground">
      <aside
        class="dashboard-sidebar-premium fixed inset-y-0 left-0 z-50 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300"
        [class.w-64]="sidebarExpanded()"
        [class.w-[72px]]="!sidebarExpanded()"
        [class.translate-x-0]="isDesktop() || mobileSidebarOpen()"
        [class.-translate-x-full]="!isDesktop() && !mobileSidebarOpen()"
      >
        <div class="flex h-full flex-col">
          <div
            class="dashboard-sidebar-brand flex h-16 items-center gap-3 border-b border-sidebar-border px-4"
            [class.justify-center]="!sidebarExpanded()"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"
            >
              <span class="text-xs font-bold tracking-wide">LR</span>
            </div>

            @if (sidebarExpanded()) {
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold tracking-wide">
                  LR16CNSTN02
                </p>
                <p class="text-[11px] text-sidebar-foreground/72">
                  {{ roleBadgeLabel() }}
                </p>
              </div>
            }
          </div>

          <nav class="flex-1 overflow-y-auto px-3 py-4">
            <ul class="space-y-1.5">
              @for (item of visibleMenuItems(); track item.key) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="dashboard-nav-link--active"
                    [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                    class="dashboard-nav-link group"
                    (click)="closeMobileSidebar()"
                    [title]="site.localize(item.label)"
                  >
                    <lucide-icon [img]="item.icon" class="h-4 w-4"></lucide-icon>
                    @if (sidebarExpanded()) {
                      <span class="truncate">{{ site.localize(item.label) }}</span>
                    }
                  </a>
                </li>
              }
            </ul>
          </nav>

          <div class="border-t border-sidebar-border px-3 py-4">
            @if (roleService.isAdmin()) {
              @if (accessContext.isModuleVisible('admin_settings')) {
              <a
                routerLink="/dashboard/settings"
                class="dashboard-nav-link mb-2"
                [title]="site.localize(settingsLabel)"
                (click)="closeMobileSidebar()"
              >
                <lucide-icon [img]="icons.Settings" class="h-4 w-4"></lucide-icon>
                @if (sidebarExpanded()) {
                  <span>{{ site.localize(settingsLabel) }}</span>
                }
              </a>
              }
            }

            <a
              routerLink="/"
              class="dashboard-nav-link"
                [title]="site.localize(returnToSiteLabel)"
              (click)="closeMobileSidebar()"
            >
              <lucide-icon [img]="icons.ArrowLeft" class="h-4 w-4"></lucide-icon>
              @if (sidebarExpanded()) {
                  <span>{{ site.localize(returnToSiteLabel) }}</span>
              }
            </a>

            <button
              type="button"
              class="dashboard-nav-link mt-2 w-full"
              [title]="site.localize(logoutLabel)"
              (click)="logout()"
            >
              <lucide-icon [img]="icons.X" class="h-4 w-4"></lucide-icon>
              @if (sidebarExpanded()) {
                <span>{{ site.localize(logoutLabel) }}</span>
              }
            </button>
          </div>
        </div>
      </aside>

      @if (!isDesktop() && mobileSidebarOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-40 bg-black/45"
          (click)="mobileSidebarOpen.set(false)"
          aria-label="Fermer la navigation"
        ></button>
      }

      <div
        class="min-h-screen transition-all duration-300"
        [style.padding-left.px]="contentOffset()"
      >
        <header
          class="dashboard-topbar-premium fixed right-0 top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur"
          [style.left.px]="headerLeftOffset()"
        >
          <div class="flex h-full items-center justify-between px-4 lg:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted"
                (click)="toggleSidebar()"
                [attr.aria-label]="site.localize(toggleNavigationLabel)"
              >
                <lucide-icon
                  [img]="isDesktop() ? icons.PanelLeftClose : icons.Menu"
                  class="h-4 w-4"
                ></lucide-icon>
              </button>

              <div class="min-w-0">
                <h1 class="truncate text-xl font-semibold">{{ site.localize(dashboardLabel) }}</h1>
                <p class="truncate text-xs text-muted-foreground">
                  {{ currentPageTitle() }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <app-toolbar-controls [showThemeToggle]="true"></app-toolbar-controls>

              @if (canAccessNotifications()) {
                <button
                  type="button"
                  class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted"
                  (click)="goToNotifications()"
                  [attr.aria-label]="site.localize(notificationsLabel)"
                >
                  <lucide-icon [img]="icons.Bell" class="h-4 w-4"></lucide-icon>
                  @if (unreadNotifications() > 0) {
                    <span
                      class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
                    >
                      {{ unreadNotifications() > 99 ? '99+' : unreadNotifications() }}
                    </span>
                  }
                </button>
              }

              <button
                type="button"
                class="dashboard-avatar-shell inline-flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 text-left transition hover:bg-muted"
                (click)="goToProfile()"
                [attr.aria-label]="site.localize(profileLabel)"
              >
                @if (profilePhotoUrl()) {
                  <img
                    [src]="profilePhotoUrl()"
                    [alt]="site.localize(profileLabel)"
                    class="h-8 w-8 rounded-full border border-border object-cover"
                  />
                } @else {
                  <span
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  >
                    {{ initials() }}
                  </span>
                }
                @if (isDesktop()) {
                  <lucide-icon [img]="icons.ChevronDown" class="h-4 w-4"></lucide-icon>
                }
              </button>
            </div>
          </div>
        </header>

        <main class="h-screen overflow-y-auto px-4 pb-8 pt-20 lg:px-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly roleService = inject(RoleService);
  readonly accessContext = inject(AccessContextService);
  readonly notificationsState = inject(NotificationsStateService);
  readonly site = inject(SitePreferencesService);
  readonly router = inject(Router);
  readonly icons = sharedIcons;

  readonly settingsLabel: LocalizedCopy = {
    fr: 'Parametres',
    en: 'Settings',
    ar: 'الإعدادات',
  };
  readonly returnToSiteLabel: LocalizedCopy = {
    fr: 'Retour au site',
    en: 'Back to site',
    ar: 'العودة إلى الموقع',
  };
  readonly logoutLabel: LocalizedCopy = {
    fr: 'Deconnexion',
    en: 'Sign out',
    ar: 'تسجيل الخروج',
  };
  readonly dashboardLabel: LocalizedCopy = {
    fr: 'Dashboard',
    en: 'Dashboard',
    ar: 'لوحة التحكم',
  };
  readonly notificationsLabel: LocalizedCopy = {
    fr: 'Notifications',
    en: 'Notifications',
    ar: 'الإشعارات',
  };
  readonly profileLabel: LocalizedCopy = {
    fr: 'Profil',
    en: 'Profile',
    ar: 'الملف الشخصي',
  };
  readonly toggleNavigationLabel: LocalizedCopy = {
    fr: 'Basculer la navigation',
    en: 'Toggle navigation',
    ar: 'تبديل التنقل',
  };
  readonly overviewFallbackLabel: LocalizedCopy = {
    fr: "Vue d'ensemble",
    en: 'Overview',
    ar: 'نظرة عامة',
  };

  readonly sidebarExpanded = signal(true);
  readonly mobileSidebarOpen = signal(false);
  readonly viewportWidth = signal(
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );
  readonly currentUrl = signal(this.router.url);
  readonly profilePhotoUrl = signal<string | null>(null);

  private navigationSubscription?: Subscription;
  private resizeHandler?: () => void;
  private profilePhotoObjectUrl: string | null = null;
  private loadedProfilePhotoKey: string | null = null;
  private profilePhotoRequestId = 0;

  readonly allMenuItems: DashboardMenuItem[] = [
    {
      key: 'overview',
      label: { fr: "Vue d'ensemble", en: 'Overview', ar: 'نظرة عامة' },
      path: '/dashboard',
      icon: this.icons.LayoutDashboard,
      roles: ['admin', 'chef', 'membre'],
    },
    {
      key: 'articles',
      label: { fr: 'Articles', en: 'Articles', ar: 'المقالات' },
      path: '/dashboard/articles',
      icon: this.icons.FileText,
      roles: ['chef', 'membre'],
    },
    {
      key: 'projects',
      label: { fr: 'Projets', en: 'Projects', ar: 'المشاريع' },
      path: '/dashboard/projects',
      icon: this.icons.FolderKanban,
      roles: ['chef', 'membre'],
    },
    {
      key: 'profile',
      label: { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' },
      path: '/dashboard/profil',
      icon: this.icons.UserCircle2,
      roles: ['chef', 'membre'],
    },
    {
      key: 'users',
      label: { fr: 'Utilisateurs', en: 'Users', ar: 'المستخدمون' },
      path: '/dashboard/users',
      icon: this.icons.Users,
      roles: ['admin', 'chef', 'membre'],
    },
    {
      key: 'registrations',
      label: { fr: 'Inscriptions', en: 'Registrations', ar: 'طلبات التسجيل' },
      path: '/dashboard/registrations',
      icon: this.icons.FileSearch,
      roles: ['admin'],
    },
    {
      key: 'roles',
      label: { fr: 'Roles', en: 'Roles', ar: 'الأدوار' },
      path: '/dashboard/roles',
      icon: this.icons.KeyRound,
      roles: ['admin'],
    },
    {
      key: 'access-control',
      label: {
        fr: 'Acces utilisateurs',
        en: 'User access',
        ar: 'صلاحيات المستخدمين',
      },
      path: '/dashboard/user-access',
      icon: this.icons.Shield,
      roles: ['admin'],
    },
    {
      key: 'purchases',
      label: { fr: 'Achats', en: 'Purchases', ar: 'المشتريات' },
      path: '/dashboard/purchases',
      icon: this.icons.ShoppingCart,
      roles: ['chef', 'membre'],
    },
    {
      key: 'messages',
      label: { fr: 'Messagerie', en: 'Messaging', ar: 'الرسائل' },
      path: '/dashboard/messages',
      icon: this.icons.MessagesSquare,
      roles: ['admin', 'chef', 'membre'],
    },
    {
      key: 'support',
      label: { fr: 'Support interne', en: 'Internal support', ar: 'الدعم الداخلي' },
      path: '/dashboard/support',
      icon: this.icons.LifeBuoy,
      roles: ['admin', 'chef', 'membre'],
    },
    {
      key: 'notifications',
      label: { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
      path: '/dashboard/notifications',
      icon: this.icons.Bell,
      roles: ['admin', 'chef', 'membre'],
    },
    // --- Intelligence Artificielle (Release 3) ---
    {
      key: 'ai-search',
      label: { fr: 'Recherche IA', en: 'AI Search', ar: 'بحث ذكي' },
      path: '/dashboard/recherche-semantique',
      icon: this.icons.Sparkles,
      roles: ['chef', 'membre'],
    },

    {
      key: 'ai-analytics',
      label: { fr: 'Analytiques IA', en: 'AI Analytics', ar: 'تحليلات ذكية' },
      path: '/dashboard/analytiques',
      icon: this.icons.Activity,
      roles: ['admin', 'chef'],
    },
    {
      key: 'ai-audit',
      label: { fr: 'Audit & Prédictions', en: 'Audit & Predictions', ar: 'سجل ذكي' },
      path: '/dashboard/audit',
      icon: this.icons.ShieldAlert,
      roles: ['admin'],
    },
  ];

  readonly isDesktop = computed(() => this.viewportWidth() >= 1024);
  readonly currentRole = computed(() => this.roleService.dashboardRole());
  readonly canAccessNotifications = computed(
    () =>
      this.accessContext.isModuleVisible('notifications') &&
      this.accessContext.isPermissionAllowed('canViewNotifications'),
  );
  readonly visibleMenuItems = computed(() => {
    const role = this.currentRole();

    return this.allMenuItems.filter((item) => {
      if (!item.roles.includes(role)) {
        return false;
      }

      if (
        item.key === 'notifications' &&
        !this.accessContext.isPermissionAllowed('canViewNotifications')
      ) {
        return false;
      }

      const moduleKey = this.menuModuleKey(item.key);
      return moduleKey ? this.accessContext.isModuleVisible(moduleKey) : true;
    });
  });

  readonly initials = computed(() =>
    getInitials(this.auth.session()?.utilisateur?.nomComplet || ''),
  );
  readonly unreadNotifications = computed(() => this.notificationsState.unreadCount());

  readonly roleBadgeLabel = computed(() => {
    const role = this.currentRole();

    if (role === 'admin') {
      return this.site.localize({
        fr: 'Administrateur technique',
        en: 'Technical Admin',
        ar: 'مشرف تقني',
      });
    }

    if (role === 'chef') {
      return this.site.localize({
        fr: 'Chef de labo',
        en: 'Lab Head',
        ar: 'رئيس المختبر',
      });
    }

    return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'عضو' });
  });

  constructor() {
    effect(() => {
      const token = this.auth.session()?.accessToken || '';
      const photoKey = this.auth.session()?.utilisateur?.profil?.photoUrl || '';
      const cacheKey = token && photoKey ? `${token}:${photoKey}` : '';

      if (!cacheKey) {
        this.clearProfilePhoto();
        return;
      }

      if (cacheKey === this.loadedProfilePhotoKey) {
        return;
      }

      this.loadedProfilePhotoKey = cacheKey;
      const requestId = ++this.profilePhotoRequestId;
      void this.loadProfilePhoto(token, requestId);
    });
  }

  readonly currentPageTitle = computed(() => {
    const url = this.currentUrl();

    if (url.startsWith('/dashboard/settings')) {
      return this.site.localize(this.settingsLabel);
    }

    const match = this.visibleMenuItems().find((item) =>
      url === '/dashboard' ? item.path === '/dashboard' : url.startsWith(item.path),
    );

    return match
      ? this.site.localize(match.label)
      : this.site.localize(this.overviewFallbackLabel);
  });

  readonly contentOffset = computed(() => {
    if (!this.isDesktop()) {
      return 0;
    }

    return this.sidebarExpanded() ? 256 : 72;
  });

  readonly headerLeftOffset = computed(() => this.contentOffset());

  ngOnInit() {
    void this.accessContext.ensureLoaded();

    this.navigationSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set((event as NavigationEnd).urlAfterRedirects);
        this.closeMobileSidebar();
        void this.notificationsState.refresh();
      });

    this.resizeHandler = () => {
      this.viewportWidth.set(window.innerWidth);
      if (window.innerWidth >= 1024) {
        this.mobileSidebarOpen.set(false);
      }
    };

    window.addEventListener('resize', this.resizeHandler);
    void this.notificationsState.refresh();
  }

  ngOnDestroy() {
    this.navigationSubscription?.unsubscribe();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    this.clearProfilePhoto();
  }

  toggleSidebar() {
    if (this.isDesktop()) {
      this.sidebarExpanded.update((value) => !value);
      return;
    }

    this.mobileSidebarOpen.update((value) => !value);
  }

  closeMobileSidebar() {
    if (!this.isDesktop()) {
      this.mobileSidebarOpen.set(false);
    }
  }

  goToNotifications() {
    if (!this.canAccessNotifications()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    void this.router.navigateByUrl('/dashboard/notifications');
  }

  goToProfile() {
    if (this.roleService.isAdmin() && this.accessContext.isModuleVisible('admin_settings')) {
      void this.router.navigateByUrl('/dashboard/settings');
      return;
    }

    if (this.accessContext.isModuleVisible('profile_settings')) {
      void this.router.navigateByUrl('/dashboard/profil');
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }

  logout() {
    this.closeMobileSidebar();
    this.auth.logout();
    void this.router.navigateByUrl('/connexion');
  }

  private menuModuleKey(menuKey: string) {
    const map: Record<string, string> = {
      overview: 'dashboard_home',
      articles: 'articles',
      projects: 'projects',
      profile: 'profile_settings',
      users: 'admin_users',
      registrations: 'admin_registrations',
      roles: 'admin_roles',
      'access-control': 'access_control',
      purchases: 'purchases',
      messages: 'messaging',
      support: 'support',
      notifications: 'notifications',
    };

    return map[menuKey] as
      | 'dashboard_home'
      | 'articles'
      | 'projects'
      | 'profile_settings'
      | 'admin_users'
      | 'admin_registrations'
      | 'admin_roles'
      | 'access_control'
      | 'purchases'
      | 'messaging'
      | 'support'
      | 'notifications'
      | undefined;
  }

  private async loadProfilePhoto(token: string, requestId: number) {
    try {
      const objectUrl = await api.getMyProfilePhotoUrl(token);

      if (requestId !== this.profilePhotoRequestId) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      this.replaceProfilePhoto(objectUrl);
    } catch {
      if (requestId === this.profilePhotoRequestId) {
        this.loadedProfilePhotoKey = null;
        this.clearProfilePhoto();
      }
    }
  }

  private replaceProfilePhoto(nextUrl: string | null) {
    if (this.profilePhotoObjectUrl && this.profilePhotoObjectUrl !== nextUrl) {
      URL.revokeObjectURL(this.profilePhotoObjectUrl);
    }

    this.profilePhotoObjectUrl = nextUrl;
    this.profilePhotoUrl.set(nextUrl);
  }

  private clearProfilePhoto() {
    this.loadedProfilePhotoKey = null;
    this.replaceProfilePhoto(null);
  }
}
