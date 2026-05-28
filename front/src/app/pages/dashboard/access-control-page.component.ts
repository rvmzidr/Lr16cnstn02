import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  AccessLinkedSupportTicket,
  AccessModuleKey,
  AccessPermissionKey,
  AccessWidgetKey,
  Role,
  SupportTicketAccessDiagnostic,
  UserAccessContext,
  UserAccessSummaryResponse,
  UserAccessUserSummaryItem,
} from '../../core/models/models';
import {
  SitePreferencesService,
  type LocalizedCopy,
} from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { AccessControlService } from '../../shared/services/access-control.service';

type AccessTabKey = 'users' | 'support';
type BoolFilter = '' | 'yes' | 'no';

const ACCESS_MODULE_KEYS: AccessModuleKey[] = [
  'dashboard_home',
  'profile_settings',
  'messaging',
  'notifications',
  'support',
  'articles',
  'purchases',
  'projects',
  'admin_users',
  'admin_registrations',
  'admin_roles',
  'access_control',
  'admin_settings',
];

const ACCESS_PERMISSION_KEYS: AccessPermissionKey[] = [
  'canViewDashboard',
  'canViewMessaging',
  'canSendMessages',
  'canCreatePurchaseRequest',
  'canViewOwnArticles',
  'canCreateArticle',
  'canEditOwnDraft',
  'canValidateArticle',
  'canChangeRole',
  'canManageUsers',
  'canManageAccessProfiles',
  'canManageProjects',
  'canManageSupport',
  'canViewNotifications',
];

const ACCESS_WIDGET_KEYS: AccessWidgetKey[] = [
  'messages_widget',
  'notifications_widget',
  'articles_widget',
  'support_widget',
  'purchases_widget',
  'stats_widget',
  'projects_widget',
];

const ROLE_ALLOWED_MODULES: Record<Role, AccessModuleKey[]> = {
  MEMBRE: [
    'dashboard_home',
    'profile_settings',
    'messaging',
    'notifications',
    'support',
    'articles',
    'purchases',
    'projects',
  ],
  CHEF_LABO: [
    'dashboard_home',
    'profile_settings',
    'messaging',
    'notifications',
    'support',
    'articles',
    'purchases',
    'projects',
  ],
  ADMINISTRATEUR: [
    'dashboard_home',
    'profile_settings',
    'messaging',
    'notifications',
    'support',
    'admin_users',
    'admin_registrations',
    'admin_roles',
    'access_control',
    'admin_settings',
  ],
};

const ROLE_ALLOWED_PERMISSIONS: Record<Role, AccessPermissionKey[]> = {
  MEMBRE: [
    'canViewDashboard',
    'canViewMessaging',
    'canSendMessages',
    'canCreatePurchaseRequest',
    'canViewOwnArticles',
    'canCreateArticle',
    'canEditOwnDraft',
    'canViewNotifications',
  ],
  CHEF_LABO: [
    'canViewDashboard',
    'canViewMessaging',
    'canSendMessages',
    'canCreatePurchaseRequest',
    'canViewOwnArticles',
    'canCreateArticle',
    'canEditOwnDraft',
    'canValidateArticle',
    'canManageProjects',
    'canViewNotifications',
    'canManageSupport',
  ],
  ADMINISTRATEUR: [
    'canViewDashboard',
    'canViewMessaging',
    'canSendMessages',
    'canChangeRole',
    'canManageUsers',
    'canManageAccessProfiles',
    'canViewNotifications',
    'canManageSupport',
  ],
};

const ROLE_ALLOWED_WIDGETS: Record<Role, AccessWidgetKey[]> = {
  MEMBRE: [
    'messages_widget',
    'notifications_widget',
    'articles_widget',
    'support_widget',
    'purchases_widget',
    'projects_widget',
  ],
  CHEF_LABO: [
    'messages_widget',
    'notifications_widget',
    'articles_widget',
    'support_widget',
    'purchases_widget',
    'stats_widget',
    'projects_widget',
  ],
  ADMINISTRATEUR: [
    'messages_widget',
    'notifications_widget',
    'support_widget',
    'stats_widget',
  ],
};

const MODULE_COPY: Record<AccessModuleKey, LocalizedCopy> = {
  dashboard_home: { fr: 'Accueil dashboard', en: 'Dashboard home', ar: 'واجهة اللوحة' },
  profile_settings: { fr: 'Profil / Parametres', en: 'Profile / Settings', ar: 'الملف والإعدادات' },
  messaging: { fr: 'Messagerie', en: 'Messaging', ar: 'المراسلة' },
  notifications: { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  support: { fr: 'Support', en: 'Support', ar: 'الدعم' },
  articles: { fr: 'Articles', en: 'Articles', ar: 'المقالات' },
  purchases: { fr: 'Achats', en: 'Purchases', ar: 'المشتريات' },
  projects: { fr: 'Projets', en: 'Projects', ar: 'المشاريع' },
  admin_users: { fr: 'Admin utilisateurs', en: 'Admin users', ar: 'إدارة المستخدمين' },
  admin_registrations: { fr: 'Admin inscriptions', en: 'Admin registrations', ar: 'إدارة التسجيلات' },
  admin_roles: { fr: 'Admin roles', en: 'Admin roles', ar: 'إدارة الأدوار' },
  access_control: { fr: "Contrôle d'accès", en: 'Access control', ar: 'التحكم في الوصول' },
  admin_settings: { fr: 'Admin parametres', en: 'Admin settings', ar: 'إعدادات الإدارة' },
};

const PERMISSION_COPY: Record<AccessPermissionKey, LocalizedCopy> = {
  canViewDashboard: { fr: 'Voir dashboard', en: 'View dashboard', ar: 'عرض اللوحة' },
  canViewMessaging: { fr: 'Voir messagerie', en: 'View messaging', ar: 'عرض المراسلة' },
  canSendMessages: { fr: 'Envoyer messages', en: 'Send messages', ar: 'إرسال الرسائل' },
  canCreatePurchaseRequest: { fr: 'Créer demande achat', en: 'Create purchase request', ar: 'إنشاء طلب شراء' },
  canViewOwnArticles: { fr: 'Voir articles', en: 'View own articles', ar: 'عرض المقالات' },
  canCreateArticle: { fr: 'Créer article', en: 'Create article', ar: 'إنشاء مقال' },
  canEditOwnDraft: { fr: 'Modifier brouillon', en: 'Edit own draft', ar: 'تعديل المسودة' },
  canValidateArticle: { fr: 'Valider article', en: 'Validate article', ar: 'اعتماد المقال' },
  canChangeRole: { fr: 'Changer role', en: 'Change role', ar: 'تغيير الدور' },
  canManageUsers: { fr: 'Gérer utilisateurs', en: 'Manage users', ar: 'إدارة المستخدمين' },
  canManageAccessProfiles: { fr: 'Gérer accès', en: 'Manage access', ar: 'إدارة الوصول' },
  canManageProjects: { fr: 'Gérer projets', en: 'Manage projects', ar: 'إدارة المشاريع' },
  canManageSupport: { fr: 'Gerer support', en: 'Manage support', ar: 'إدارة الدعم' },
  canViewNotifications: { fr: 'Voir notifications', en: 'View notifications', ar: 'عرض الإشعارات' },
};

const WIDGET_COPY: Record<AccessWidgetKey, LocalizedCopy> = {
  messages_widget: { fr: 'Widget messages', en: 'Messages widget', ar: 'أداة الرسائل' },
  notifications_widget: { fr: 'Widget notifications', en: 'Notifications widget', ar: 'أداة الإشعارات' },
  articles_widget: { fr: 'Widget articles', en: 'Articles widget', ar: 'أداة المقالات' },
  support_widget: { fr: 'Widget support', en: 'Support widget', ar: 'أداة الدعم' },
  purchases_widget: { fr: 'Widget achats', en: 'Purchases widget', ar: 'أداة المشتريات' },
  stats_widget: { fr: 'Widget statistiques', en: 'Statistics widget', ar: 'أداة الإحصائيات' },
  projects_widget: { fr: 'Widget projets', en: 'Projects widget', ar: 'أداة المشاريع' },
};

@Component({
  selector: 'app-access-control-page',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <section class="app-page-hero">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">{{ site.localize(pageEyebrow) }}</p>

          <div class="app-page-header mt-2">
            <div>
              <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
              <p class="app-page-description">{{ site.localize(pageDescription) }}</p>
            </div>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Administrateurs', en: 'Administrators', ar: 'المسؤولون' }) }}: {{ summaryStats().adminUsers }}
            </span>
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Chefs labo', en: 'Lab heads', ar: 'رؤساء المختبر' }) }}: {{ summaryStats().labHeadUsers }}
            </span>
            <span class="app-page-pill">
              {{ site.localize({ fr: 'Membres', en: 'Members', ar: 'الأعضاء' }) }}: {{ summaryStats().memberUsers }}
            </span>
          </div>
        </div>
      </section>

      <section class="app-kpi-grid">
        <article class="app-kpi-card">
          <p class="app-kpi-card__label">{{ site.localize(kpiTotalUsersLabel) }}</p>
          <p class="app-kpi-card__value">{{ summaryStats().totalUsers }}</p>
        </article>
        <article class="app-kpi-card">
          <p class="app-kpi-card__label">{{ site.localize(kpiDoctorantsLabel) }}</p>
          <p class="app-kpi-card__value">{{ summaryStats().doctorantMembers }}</p>
        </article>
        <article class="app-kpi-card">
          <p class="app-kpi-card__label">{{ site.localize(kpiUsersWithOverridesLabel) }}</p>
          <p class="app-kpi-card__value">{{ summaryStats().usersWithOverrides }}</p>
        </article>
        <article class="app-kpi-card">
          <p class="app-kpi-card__label">{{ site.localize(kpiOpenTicketsLabel) }}</p>
          <p class="app-kpi-card__value">{{ summaryStats().accessRelatedTicketsOpen }}</p>
        </article>
      </section>

      <section class="surface-card p-2">
        <div class="grid gap-2 md:grid-cols-2">
          @for (tab of tabs; track tab.key) {
            <button
              type="button"
              class="rounded-xl px-3 py-2 text-sm font-semibold transition"
              [class]="activeTab() === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'"
              (click)="setActiveTab(tab.key)"
            >
              {{ site.localize(tab.label) }}
            </button>
          }
        </div>
      </section>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }

      @if (activeTab() === 'users') {
        <section class="surface-card p-5">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]">
            <input
              class="input-shell"
              [placeholder]="site.localize(searchUserPlaceholder)"
              [ngModel]="userSearchTerm()"
              (ngModelChange)="userSearchTerm.set($event)"
            />

            <select class="select-shell" [ngModel]="userRoleFilter()" (ngModelChange)="setUserRoleFilter($event)">
              <option value="">{{ site.localize(allRolesLabel) }}</option>
              <option value="MEMBRE">{{ site.localize(memberLabel) }}</option>
              <option value="CHEF_LABO">{{ site.localize(labHeadLabel) }}</option>
              <option value="ADMINISTRATEUR">{{ site.localize(adminLabel) }}</option>
            </select>

            <select class="select-shell" [ngModel]="userDoctorantFilter()" (ngModelChange)="setUserDoctorantFilter($event)">
              <option value="">{{ site.localize(allMembersLabel) }}</option>
              <option value="yes">{{ site.localize(doctorantsOnlyLabel) }}</option>
              <option value="no">{{ site.localize(nonDoctorantsOnlyLabel) }}</option>
            </select>

            <select class="select-shell" [ngModel]="userOverridesFilter()" (ngModelChange)="setUserOverridesFilter($event)">
              <option value="">{{ site.localize(allOverrideStatesLabel) }}</option>
              <option value="yes">{{ site.localize(withOverridesLabel) }}</option>
              <option value="no">{{ site.localize(withoutOverridesLabel) }}</option>
            </select>

            <button type="button" class="btn-secondary" [disabled]="loading() || saving()" (click)="loadUsers()">
              {{ site.localize(searchLabel) }}
            </button>

            <button type="button" class="btn-outline" [disabled]="loading() || saving()" (click)="resetUserFilters()">
              {{ site.localize(resetLabel) }}
            </button>
          </div>
        </section>

        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (user of users(); track user.id) {
            <button
              type="button"
              class="rounded-2xl border bg-card px-4 py-3 text-left transition"
              [class]="selectedUserContext()?.user?.id === user.id ? 'border-primary/70' : 'border-border hover:border-primary/40'"
              (click)="selectUser(user.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-foreground">{{ user.fullName }}</p>
                  <p class="text-xs text-muted-foreground">{{ user.email }}</p>
                </div>
                <span class="badge-soft">{{ roleLabel(user.role) }}</span>
              </div>

              <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>{{ user.isDoctorant ? site.localize(doctorantBadgeLabel) : site.localize(standardBadgeLabel) }}</span>
                <span>•</span>
                <span>{{ user.overridesCount }} {{ site.localize(overridesLabelInline) }}</span>
              </div>
            </button>
          } @empty {
            <div class="empty-state py-10 sm:col-span-2 xl:col-span-3">
              {{ loading() ? site.localize(loadingUsersLabel) : site.localize(noUsersLabel) }}
            </div>
          }
        </section>

        @if (selectedUserContext()) {
          <section class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article class="surface-card p-5">
              <h3 class="text-base font-semibold text-foreground">{{ site.localize(selectedUserTitle) }}</h3>

              <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(userLabel) }}</span>
                  <span class="text-right text-foreground">{{ selectedUserContext()!.user.fullName }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(roleLabelText) }}</span>
                  <span class="text-right text-foreground">{{ roleLabel(selectedUserContext()!.user.role) }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(defaultSourceLabel) }}</span>
                  <span class="text-right text-foreground">{{ selectedUserContext()!.defaultSource || site.localize(notAvailableLabel) }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(defaultLandingLabel) }}</span>
                  <span class="text-right text-foreground">{{ selectedUserContext()!.defaultAccess?.defaultLandingPage || selectedUserContext()!.effective.defaultLandingPage }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(effectiveLandingLabel) }}</span>
                  <span class="text-right text-foreground">{{ selectedUserContext()!.effective.defaultLandingPage }}</span>
                </div>
              </div>

              <div class="mt-4 border-t border-border pt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(visibleModulesLabel) }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (moduleKey of selectedUserContext()!.effective.visibleModules; track moduleKey) {
                    <span class="badge-soft">{{ moduleLabel(moduleKey) }}</span>
                  } @empty {
                    <span class="text-xs text-muted-foreground">{{ site.localize(notAvailableLabel) }}</span>
                  }
                </div>
              </div>

              <div class="mt-4 border-t border-border pt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(majorPermissionsLabel) }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (permission of selectedUserContext()!.effective.majorPermissions; track permission.key) {
                    <span class="badge-soft">{{ permissionLabel(permission.key) }}</span>
                  } @empty {
                    <span class="text-xs text-muted-foreground">{{ site.localize(notAvailableLabel) }}</span>
                  }
                </div>
              </div>
            </article>

            <article class="surface-card p-5">
              <h3 class="text-base font-semibold text-foreground">{{ site.localize(adjustAccessTitle) }}</h3>

              <div class="mt-3 space-y-3">
                <input
                  class="input-shell"
                  [placeholder]="site.localize(changeReasonPlaceholder)"
                  [ngModel]="userEditReason()"
                  (ngModelChange)="userEditReason.set($event)"
                />

                <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    class="h-4 w-4"
                    [checked]="userLandingOverrideEnabled()"
                    (change)="toggleUserLandingOverride($event)"
                  />
                  {{ site.localize(enableLandingOverrideLabel) }}
                </label>

                @if (userLandingOverrideEnabled()) {
                  <input
                    class="input-shell"
                    [placeholder]="site.localize(landingOverridePlaceholder)"
                    [ngModel]="userLandingOverride()"
                    (ngModelChange)="userLandingOverride.set($event)"
                  />
                }

                <div class="grid gap-4 lg:grid-cols-3">
                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(modulesLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (moduleKey of moduleKeysForRole(selectedUserContext()!.user.role); track moduleKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ moduleLabel(moduleKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="userModuleMap()[moduleKey]"
                            (change)="setUserModule(moduleKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>

                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(permissionsLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (permissionKey of permissionKeysForRole(selectedUserContext()!.user.role); track permissionKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ permissionLabel(permissionKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="userPermissionMap()[permissionKey]"
                            (change)="setUserPermission(permissionKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>

                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(widgetsLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (widgetKey of widgetKeysForRole(selectedUserContext()!.user.role); track widgetKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ widgetLabel(widgetKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="userWidgetMap()[widgetKey]"
                            (change)="setUserWidget(widgetKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <button type="button" class="btn-outline" [disabled]="saving()" (click)="resetSelectedUserAccess()">
                    {{ site.localize(resetToDefaultLabel) }}
                  </button>
                  <button type="button" class="btn-secondary" [disabled]="saving()" (click)="saveUserAccess()">
                    {{ site.localize(saveAccessLabel) }}
                  </button>
                </div>
              </div>
            </article>
          </section>
        }
      }

      @if (activeTab() === 'support') {
        <section class="surface-card p-5">
          <div class="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              class="input-shell"
              [placeholder]="site.localize(searchTicketPlaceholder)"
              [ngModel]="supportTicketSearch()"
              (ngModelChange)="supportTicketSearch.set($event)"
            />
            <button type="button" class="btn-outline" [disabled]="loading() || saving()" (click)="loadSummary()">
              {{ site.localize(refreshLabel) }}
            </button>
            <button type="button" class="btn-secondary" [disabled]="loading() || saving()" (click)="setActiveTab('users')">
              {{ site.localize(openUserTabLabel) }}
            </button>
          </div>

          <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            @for (ticket of filteredLinkedTickets(); track ticket.id) {
              <article class="rounded-xl border border-border bg-card p-3">
                <p class="text-sm font-semibold text-foreground">#{{ ticket.id }} - {{ ticket.subject }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ ticket.category }} • {{ ticket.status }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ ticket.requester?.fullName || site.localize(notAvailableLabel) }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                  <button type="button" class="btn-secondary h-9 px-3 text-xs" [disabled]="saving()" (click)="loadSupportDiagnostic(ticket.id)">
                    {{ site.localize(diagnoseTicketLabel) }}
                  </button>
                  <button type="button" class="btn-outline h-9 px-3 text-xs" (click)="openSupportTicket(ticket.id)">
                    {{ site.localize(openSupportLabel) }}
                  </button>
                </div>
              </article>
            } @empty {
              <div class="empty-state py-12 sm:col-span-2 xl:col-span-3">{{ site.localize(noLinkedTicketsLabel) }}</div>
            }
          </div>
        </section>

        @if (supportDiagnostic()) {
          <section class="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <article class="surface-card p-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-base font-semibold text-foreground">{{ site.localize(ticketDiagnosticTitle) }}</h3>
                <button type="button" class="btn-outline h-9 px-3 text-xs" [disabled]="saving()" (click)="openRequesterFromDiagnostic()">
                  {{ site.localize(openRequesterLabel) }}
                </button>
              </div>

              <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">Ticket</span>
                  <span class="text-right text-foreground">#{{ supportDiagnostic()!.ticket.id }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(categoryLabelText) }}</span>
                  <span class="text-right text-foreground">{{ supportDiagnostic()!.ticket.category }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(statusLabelText) }}</span>
                  <span class="text-right text-foreground">{{ supportDiagnostic()!.ticket.status }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(requesterLabel) }}</span>
                  <span class="text-right text-foreground">{{ supportDiagnostic()!.ticket.requester?.fullName || site.localize(notAvailableLabel) }}</span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{{ site.localize(effectiveLandingLabel) }}</span>
                  <span class="text-right text-foreground">{{ supportDiagnostic()!.accessContext.effective.defaultLandingPage }}</span>
                </div>
              </div>

              <div class="mt-4 border-t border-border pt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(visibleModulesLabel) }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (moduleKey of supportDiagnostic()!.accessContext.effective.visibleModules; track moduleKey) {
                    <span class="badge-soft">{{ moduleLabel(moduleKey) }}</span>
                  } @empty {
                    <span class="text-xs text-muted-foreground">{{ site.localize(notAvailableLabel) }}</span>
                  }
                </div>
              </div>

              <div class="mt-4 border-t border-border pt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(previousResolutionsLabel) }}</p>
                <div class="mt-2 space-y-2">
                  @for (resolution of supportDiagnostic()!.resolutions; track resolution.id) {
                    <div class="rounded-xl border border-border bg-card px-3 py-2">
                      <p class="text-xs font-semibold text-foreground">{{ resolution.admin?.fullName || site.localize(notAvailableLabel) }} • {{ formatDate(resolution.createdAt) }}</p>
                      <p class="mt-1 text-xs text-muted-foreground">{{ resolution.notes || site.localize(notAvailableLabel) }}</p>
                    </div>
                  } @empty {
                    <div class="empty-state py-6">{{ site.localize(noResolutionHistoryLabel) }}</div>
                  }
                </div>
              </div>
            </article>

            <article class="surface-card p-5">
              <h3 class="text-base font-semibold text-foreground">{{ site.localize(applySupportResolutionTitle) }}</h3>

              <div class="mt-3 space-y-3">
                <input
                  class="input-shell"
                  [placeholder]="site.localize(changeReasonPlaceholder)"
                  [ngModel]="supportEditReason()"
                  (ngModelChange)="supportEditReason.set($event)"
                />

                <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    class="h-4 w-4"
                    [checked]="supportLandingOverrideEnabled()"
                    (change)="toggleSupportLandingOverride($event)"
                  />
                  {{ site.localize(enableLandingOverrideLabel) }}
                </label>

                @if (supportLandingOverrideEnabled()) {
                  <input
                    class="input-shell"
                    [placeholder]="site.localize(landingOverridePlaceholder)"
                    [ngModel]="supportLandingOverride()"
                    (ngModelChange)="supportLandingOverride.set($event)"
                  />
                }

                <div class="grid gap-4 lg:grid-cols-3">
                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(modulesLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (moduleKey of moduleKeysForRole(supportDiagnostic()!.accessContext.user.role); track moduleKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ moduleLabel(moduleKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="supportModuleMap()[moduleKey]"
                            (change)="setSupportModule(moduleKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>

                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(permissionsLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (permissionKey of permissionKeysForRole(supportDiagnostic()!.accessContext.user.role); track permissionKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ permissionLabel(permissionKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="supportPermissionMap()[permissionKey]"
                            (change)="setSupportPermission(permissionKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>

                  <div class="rounded-xl border border-border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{{ site.localize(widgetsLabel) }}</p>
                    <div class="mt-2 space-y-2">
                      @for (widgetKey of widgetKeysForRole(supportDiagnostic()!.accessContext.user.role); track widgetKey) {
                        <label class="flex items-center justify-between gap-2 text-xs text-foreground">
                          <span>{{ widgetLabel(widgetKey) }}</span>
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            [checked]="supportWidgetMap()[widgetKey]"
                            (change)="setSupportWidget(widgetKey, $event)"
                          />
                        </label>
                      }
                    </div>
                  </div>
                </div>

                <textarea
                  class="textarea-shell min-h-20"
                  [placeholder]="site.localize(resolutionNotesLabel)"
                  [ngModel]="supportResolutionNotes()"
                  (ngModelChange)="supportResolutionNotes.set($event)"
                ></textarea>

                <textarea
                  class="textarea-shell min-h-20"
                  [placeholder]="site.localize(responseMessageLabel)"
                  [ngModel]="supportResolutionMessage()"
                  (ngModelChange)="supportResolutionMessage.set($event)"
                ></textarea>

                <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    class="h-4 w-4"
                    [checked]="supportResolutionCloseTicket()"
                    (change)="toggleSupportCloseTicket($event)"
                  />
                  {{ site.localize(closeTicketAfterResolutionLabel) }}
                </label>

                <div class="flex justify-end gap-2 border-t border-border pt-4">
                  <button type="button" class="btn-outline" [disabled]="saving()" (click)="loadSupportDiagnostic(supportDiagnostic()!.ticket.id)">
                    {{ site.localize(resetLabel) }}
                  </button>
                  <button type="button" class="btn-secondary" [disabled]="saving()" (click)="applySupportResolution()">
                    {{ site.localize(applyResolutionLabel) }}
                  </button>
                </div>
              </div>
            </article>
          </section>
        }
      }
    </div>
  `,
})
export class AccessControlPageComponent implements OnInit {
  readonly site = inject(SitePreferencesService);
  readonly accessControl = inject(AccessControlService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly formatDate = formatDate;

  readonly tabs: Array<{ key: AccessTabKey; label: LocalizedCopy }> = [
    { key: 'users', label: { fr: 'Utilisateurs', en: 'Users', ar: 'المستخدمون' } },
    { key: 'support', label: { fr: 'Support', en: 'Support', ar: 'الدعم' } },
  ];

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');

  readonly activeTab = signal<AccessTabKey>('users');

  readonly summary = signal<UserAccessSummaryResponse | null>(null);
  readonly users = signal<UserAccessUserSummaryItem[]>([]);
  readonly selectedUserContext = signal<UserAccessContext | null>(null);

  readonly userSearchTerm = signal('');
  readonly userRoleFilter = signal<Role | ''>('');
  readonly userDoctorantFilter = signal<BoolFilter>('');
  readonly userOverridesFilter = signal<BoolFilter>('');

  readonly userEditReason = signal('');
  readonly userLandingOverrideEnabled = signal(false);
  readonly userLandingOverride = signal('');
  readonly userModuleMap = signal<Record<AccessModuleKey, boolean>>(
    this.createBooleanMap(ACCESS_MODULE_KEYS, false),
  );
  readonly userPermissionMap = signal<Record<AccessPermissionKey, boolean>>(
    this.createBooleanMap(ACCESS_PERMISSION_KEYS, false),
  );
  readonly userWidgetMap = signal<Record<AccessWidgetKey, boolean>>(
    this.createBooleanMap(ACCESS_WIDGET_KEYS, false),
  );

  readonly supportTicketSearch = signal('');
  readonly supportDiagnostic = signal<SupportTicketAccessDiagnostic | null>(null);
  readonly supportEditReason = signal('');
  readonly supportLandingOverrideEnabled = signal(false);
  readonly supportLandingOverride = signal('');
  readonly supportModuleMap = signal<Record<AccessModuleKey, boolean>>(
    this.createBooleanMap(ACCESS_MODULE_KEYS, false),
  );
  readonly supportPermissionMap = signal<Record<AccessPermissionKey, boolean>>(
    this.createBooleanMap(ACCESS_PERMISSION_KEYS, false),
  );
  readonly supportWidgetMap = signal<Record<AccessWidgetKey, boolean>>(
    this.createBooleanMap(ACCESS_WIDGET_KEYS, false),
  );
  readonly supportResolutionNotes = signal('');
  readonly supportResolutionMessage = signal('');
  readonly supportResolutionCloseTicket = signal(true);

  readonly summaryStats = computed(() =>
    this.summary()?.stats || {
      totalUsers: 0,
      adminUsers: 0,
      labHeadUsers: 0,
      memberUsers: 0,
      doctorantMembers: 0,
      usersWithOverrides: 0,
      accessRelatedTicketsOpen: 0,
    },
  );

  readonly filteredLinkedTickets = computed<AccessLinkedSupportTicket[]>(() => {
    const q = this.supportTicketSearch().trim().toLowerCase();
    const tickets = this.summary()?.linkedTickets || [];

    if (!q) {
      return tickets;
    }

    return tickets.filter((ticket) =>
      [String(ticket.id), ticket.subject, ticket.category, ticket.status, ticket.requester?.fullName || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  readonly pageTitle: LocalizedCopy = {
    fr: 'Gestion des accès utilisateurs',
    en: 'User access management',
    ar: 'ادارة صلاحيات المستخدمين',
  };
  readonly pageEyebrow: LocalizedCopy = {
    fr: 'Contrôle de sécurité',
    en: 'Security control',
    ar: 'تحكم أمني',
  };
  readonly pageDescription: LocalizedCopy = {
    fr: 'Accès automatiques par rôle + doctorant, ajustements directs par utilisateur, reset et intégration support.',
    en: 'Automatic access by role + doctorant, direct per-user adjustments, reset, and support integration.',
    ar: 'صلاحيات تلقائية حسب الدور وحالة الدكتوراه مع تعديلات مباشرة ودعم متكامل.',
  };

  readonly kpiTotalUsersLabel: LocalizedCopy = { fr: 'Total utilisateurs', en: 'Total users', ar: 'اجمالي المستخدمين' };
  readonly kpiDoctorantsLabel: LocalizedCopy = { fr: 'Membres doctorants', en: 'Doctorant members', ar: 'اعضاء دكتوراه' };
  readonly kpiUsersWithOverridesLabel: LocalizedCopy = { fr: 'Avec overrides', en: 'With overrides', ar: 'مع استثناءات' };
  readonly kpiOpenTicketsLabel: LocalizedCopy = { fr: 'Tickets accès ouverts', en: 'Open access tickets', ar: 'تذاكر وصول مفتوحة' };

  readonly searchUserPlaceholder: LocalizedCopy = { fr: 'Rechercher utilisateur...', en: 'Search user...', ar: 'ابحث عن مستخدم...' };
  readonly allRolesLabel: LocalizedCopy = { fr: 'Tous les roles', en: 'All roles', ar: 'كل الادوار' };
  readonly memberLabel: LocalizedCopy = { fr: 'Membre', en: 'Member', ar: 'عضو' };
  readonly labHeadLabel: LocalizedCopy = { fr: 'Chef labo', en: 'Lab head', ar: 'رئيس مختبر' };
  readonly adminLabel: LocalizedCopy = { fr: 'Administrateur', en: 'Administrator', ar: 'مسؤول' };
  readonly allMembersLabel: LocalizedCopy = { fr: 'Tous membres', en: 'All members', ar: 'كل الاعضاء' };
  readonly doctorantsOnlyLabel: LocalizedCopy = { fr: 'Doctorants uniquement', en: 'Doctorants only', ar: 'الدكتوراه فقط' };
  readonly nonDoctorantsOnlyLabel: LocalizedCopy = { fr: 'Hors doctorants', en: 'Non-doctorants', ar: 'غير دكتوراه' };
  readonly allOverrideStatesLabel: LocalizedCopy = { fr: 'Tous états overrides', en: 'All override states', ar: 'كل حالات الاستثناء' };
  readonly withOverridesLabel: LocalizedCopy = { fr: 'Avec overrides', en: 'With overrides', ar: 'مع استثناءات' };
  readonly withoutOverridesLabel: LocalizedCopy = { fr: 'Sans overrides', en: 'Without overrides', ar: 'بدون استثناءات' };
  readonly searchLabel: LocalizedCopy = { fr: 'Rechercher', en: 'Search', ar: 'بحث' };
  readonly resetLabel: LocalizedCopy = { fr: 'Réinitialiser', en: 'Reset', ar: 'اعادة تعيين' };
  readonly loadingUsersLabel: LocalizedCopy = { fr: 'Chargement utilisateurs...', en: 'Loading users...', ar: 'جار تحميل المستخدمين...' };
  readonly noUsersLabel: LocalizedCopy = { fr: 'Aucun utilisateur trouvé.', en: 'No users found.', ar: 'لا يوجد مستخدم.' };
  readonly doctorantBadgeLabel: LocalizedCopy = { fr: 'Doctorant', en: 'Doctorant', ar: 'دكتوراه' };
  readonly standardBadgeLabel: LocalizedCopy = { fr: 'Standard', en: 'Standard', ar: 'قياسي' };
  readonly overridesLabelInline: LocalizedCopy = { fr: 'overrides', en: 'overrides', ar: 'استثناءات' };

  readonly selectedUserTitle: LocalizedCopy = { fr: 'Utilisateur sélectionné', en: 'Selected user', ar: 'المستخدم المحدد' };
  readonly userLabel: LocalizedCopy = { fr: 'Utilisateur', en: 'User', ar: 'المستخدم' };
  readonly roleLabelText: LocalizedCopy = { fr: 'Role', en: 'Role', ar: 'الدور' };
  readonly defaultSourceLabel: LocalizedCopy = { fr: 'Source par défaut', en: 'Default source', ar: 'مصدر افتراضي' };
  readonly defaultLandingLabel: LocalizedCopy = { fr: 'Landing par defaut', en: 'Default landing', ar: 'الصفحة الافتراضية' };
  readonly effectiveLandingLabel: LocalizedCopy = { fr: 'Landing effective', en: 'Effective landing', ar: 'الصفحة الفعلية' };
  readonly visibleModulesLabel: LocalizedCopy = { fr: 'Modules visibles', en: 'Visible modules', ar: 'الوحدات الظاهرة' };
  readonly majorPermissionsLabel: LocalizedCopy = { fr: 'Permissions majeures', en: 'Major permissions', ar: 'الصلاحيات الرئيسية' };

  readonly adjustAccessTitle: LocalizedCopy = { fr: 'Ajuster les accès', en: 'Adjust access', ar: 'تعديل الصلاحيات' };
  readonly changeReasonPlaceholder: LocalizedCopy = {
    fr: 'Raison des changements (optionnel)',
    en: 'Reason for changes (optional)',
    ar: 'سبب التعديلات (اختياري)',
  };
  readonly enableLandingOverrideLabel: LocalizedCopy = {
    fr: 'Definir un landing override',
    en: 'Set landing override',
    ar: 'تحديد صفحة بداية مخصصة',
  };
  readonly landingOverridePlaceholder: LocalizedCopy = {
    fr: 'Ex: /dashboard/messages',
    en: 'Ex: /dashboard/messages',
    ar: 'مثال: /dashboard/messages',
  };
  readonly modulesLabel: LocalizedCopy = { fr: 'Modules', en: 'Modules', ar: 'الوحدات' };
  readonly permissionsLabel: LocalizedCopy = { fr: 'Permissions', en: 'Permissions', ar: 'الصلاحيات' };
  readonly widgetsLabel: LocalizedCopy = { fr: 'Widgets', en: 'Widgets', ar: 'الادوات' };
  readonly saveAccessLabel: LocalizedCopy = { fr: 'Enregistrer accès', en: 'Save access', ar: 'حفظ الصلاحيات' };
  readonly resetToDefaultLabel: LocalizedCopy = {
    fr: 'Reset aux regles automatiques',
    en: 'Reset to automatic defaults',
    ar: 'اعادة للصلاحيات التلقائية',
  };

  readonly searchTicketPlaceholder: LocalizedCopy = { fr: 'Filtrer tickets lies...', en: 'Filter linked tickets...', ar: 'تصفية التذاكر المرتبطة...' };
  readonly refreshLabel: LocalizedCopy = { fr: 'Actualiser', en: 'Refresh', ar: 'تحديث' };
  readonly openUserTabLabel: LocalizedCopy = { fr: 'Ouvrir utilisateurs', en: 'Open users', ar: 'فتح المستخدمين' };
  readonly diagnoseTicketLabel: LocalizedCopy = { fr: 'Diagnostiquer', en: 'Diagnose', ar: 'تشخيص' };
  readonly openSupportLabel: LocalizedCopy = { fr: 'Ouvrir support', en: 'Open support', ar: 'فتح الدعم' };
  readonly noLinkedTicketsLabel: LocalizedCopy = { fr: 'Aucun ticket lie.', en: 'No linked ticket.', ar: 'لا توجد تذاكر مرتبطة.' };
  readonly ticketDiagnosticTitle: LocalizedCopy = { fr: "Diagnostic ticket d'accès", en: 'Access ticket diagnostics', ar: 'تشخيص تذكرة الوصول' };
  readonly openRequesterLabel: LocalizedCopy = { fr: 'Ouvrir demandeur', en: 'Open requester', ar: 'فتح صاحب الطلب' };
  readonly categoryLabelText: LocalizedCopy = { fr: 'Catégorie', en: 'Category', ar: 'الفئة' };
  readonly statusLabelText: LocalizedCopy = { fr: 'Statut', en: 'Status', ar: 'الحالة' };
  readonly requesterLabel: LocalizedCopy = { fr: 'Demandeur', en: 'Requester', ar: 'صاحب الطلب' };
  readonly previousResolutionsLabel: LocalizedCopy = { fr: 'Résolutions précédentes', en: 'Previous resolutions', ar: 'المعالجات السابقة' };
  readonly noResolutionHistoryLabel: LocalizedCopy = { fr: 'Aucun historique.', en: 'No history.', ar: 'لا يوجد سجل.' };

  readonly applySupportResolutionTitle: LocalizedCopy = { fr: 'Appliquer une résolution', en: 'Apply resolution', ar: 'تطبيق معالجة' };
  readonly resolutionNotesLabel: LocalizedCopy = { fr: 'Notes internes', en: 'Internal notes', ar: 'ملاحظات داخلية' };
  readonly responseMessageLabel: LocalizedCopy = { fr: 'Message réponse ticket', en: 'Ticket reply message', ar: 'رسالة رد التذكرة' };
  readonly closeTicketAfterResolutionLabel: LocalizedCopy = {
    fr: 'Marquer ticket résolu après correction',
    en: 'Mark ticket resolved after fix',
    ar: 'تمييز التذكرة كمحلولة بعد التصحيح',
  };
  readonly applyResolutionLabel: LocalizedCopy = { fr: 'Appliquer resolution', en: 'Apply resolution', ar: 'تطبيق المعالجة' };

  readonly notAvailableLabel: LocalizedCopy = { fr: 'N/A', en: 'N/A', ar: 'غير متاح' };

  async ngOnInit() {
    await Promise.all([this.loadSummary(), this.loadUsers()]);

    const userId = this.route.snapshot.queryParamMap.get('userId') || '';
    const ticketIdRaw = this.route.snapshot.queryParamMap.get('ticketId');
    const ticketId = ticketIdRaw ? Number.parseInt(ticketIdRaw, 10) : Number.NaN;

    if (userId) {
      await this.selectUser(userId);
      this.activeTab.set('users');
    }

    if (Number.isFinite(ticketId) && ticketId > 0) {
      await this.loadSupportDiagnostic(ticketId);
      this.activeTab.set('support');
    }
  }

  setActiveTab(tab: AccessTabKey) {
    this.activeTab.set(tab);
  }

  setUserRoleFilter(value: Role | '') {
    this.userRoleFilter.set(value || '');
  }

  setUserDoctorantFilter(value: BoolFilter) {
    this.userDoctorantFilter.set(value || '');
  }

  setUserOverridesFilter(value: BoolFilter) {
    this.userOverridesFilter.set(value || '');
  }

  async resetUserFilters() {
    this.userSearchTerm.set('');
    this.userRoleFilter.set('');
    this.userDoctorantFilter.set('');
    this.userOverridesFilter.set('');
    await this.loadUsers();
  }

  async loadSummary() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.accessControl.getUserAccessSummary();
      this.summary.set(response);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Chargement du résumé impossible.',
              en: 'Unable to load summary.',
              ar: 'تعذر تحميل الملخص.',
            }),
      );
      this.summary.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async loadUsers() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.accessControl.listUserAccessUsers({
        q: this.userSearchTerm().trim() || undefined,
        role: this.userRoleFilter() || undefined,
        isDoctorant: this.parseBoolFilter(this.userDoctorantFilter()),
        hasOverrides: this.parseBoolFilter(this.userOverridesFilter()),
        page: 1,
        limit: 50,
      });

      this.users.set(response.elements || []);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Chargement des utilisateurs impossible.',
              en: 'Unable to load users.',
              ar: 'تعذر تحميل المستخدمين.',
            }),
      );
      this.users.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async selectUser(userId: string) {
    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const context = await this.accessControl.getUserAccessContextV2(userId);
      this.selectedUserContext.set(context);
      this.hydrateUserEditor(context);
      this.activeTab.set('users');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Chargement du contexte utilisateur impossible.',
              en: 'Unable to load user context.',
              ar: 'تعذر تحميل سياق المستخدم.',
            }),
      );
      this.selectedUserContext.set(null);
    } finally {
      this.saving.set(false);
    }
  }

  toggleUserLandingOverride(event: Event) {
    const input = event.target as HTMLInputElement;
    this.userLandingOverrideEnabled.set(Boolean(input?.checked));
  }

  setUserModule(moduleKey: AccessModuleKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.userModuleMap.update((current) => ({
      ...current,
      [moduleKey]: Boolean(input?.checked),
    }));
  }

  setUserPermission(permissionKey: AccessPermissionKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.userPermissionMap.update((current) => ({
      ...current,
      [permissionKey]: Boolean(input?.checked),
    }));
  }

  setUserWidget(widgetKey: AccessWidgetKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.userWidgetMap.update((current) => ({
      ...current,
      [widgetKey]: Boolean(input?.checked),
    }));
  }

  async saveUserAccess() {
    const context = this.selectedUserContext();
    if (!context) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const payload = this.buildAccessUpdatePayload({
        context,
        moduleMap: this.userModuleMap(),
        permissionMap: this.userPermissionMap(),
        widgetMap: this.userWidgetMap(),
        landingEnabled: this.userLandingOverrideEnabled(),
        landingValue: this.userLandingOverride(),
        reason: this.userEditReason().trim(),
      });

      const updated = await this.accessControl.updateUserAccess(context.user.id, payload);
      this.selectedUserContext.set(updated);
      this.hydrateUserEditor(updated);
      this.userEditReason.set('');
      this.statusMessage.set(
        this.site.localize({
          fr: 'Accès utilisateur mis à jour.',
          en: 'User access updated.',
          ar: 'تم تحديث صلاحيات المستخدم.',
        }),
      );

      await Promise.all([this.loadSummary(), this.loadUsers()]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Mise à jour des accès impossible.',
              en: 'Unable to update access.',
              ar: 'تعذر تحديث الصلاحيات.',
            }),
      );
    } finally {
      this.saving.set(false);
    }
  }

  async resetSelectedUserAccess() {
    const context = this.selectedUserContext();
    if (!context) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.accessControl.resetUserAccess(context.user.id);
      this.selectedUserContext.set(updated);
      this.hydrateUserEditor(updated);
      this.userEditReason.set('');
      this.statusMessage.set(
        this.site.localize({
          fr: 'Accès utilisateur réinitialisé sur les règles automatiques.',
          en: 'User access reset to automatic defaults.',
          ar: 'تمت اعادة صلاحيات المستخدم الى القواعد التلقائية.',
        }),
      );

      await Promise.all([this.loadSummary(), this.loadUsers()]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Réinitialisation des accès impossible.',
              en: 'Unable to reset access.',
              ar: 'تعذر اعادة تعيين الصلاحيات.',
            }),
      );
    } finally {
      this.saving.set(false);
    }
  }

  openSupportTicket(ticketId: number) {
    void this.router.navigate(['/dashboard/support'], {
      queryParams: { ticketId },
    });
  }

  async loadSupportDiagnostic(ticketId: number) {
    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const diagnostic = await this.accessControl.getSupportTicketAccessContext(ticketId);
      this.supportDiagnostic.set(diagnostic);
      this.hydrateSupportEditor(diagnostic.accessContext);
      this.activeTab.set('support');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Diagnostic ticket impossible.',
              en: 'Unable to diagnose ticket.',
              ar: 'تعذر تشخيص التذكرة.',
            }),
      );
      this.supportDiagnostic.set(null);
    } finally {
      this.saving.set(false);
    }
  }

  async openRequesterFromDiagnostic() {
    const diagnostic = this.supportDiagnostic();
    if (!diagnostic) {
      return;
    }

    await this.selectUser(diagnostic.accessContext.user.id);
    this.activeTab.set('users');
  }

  toggleSupportLandingOverride(event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportLandingOverrideEnabled.set(Boolean(input?.checked));
  }

  setSupportModule(moduleKey: AccessModuleKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportModuleMap.update((current) => ({
      ...current,
      [moduleKey]: Boolean(input?.checked),
    }));
  }

  setSupportPermission(permissionKey: AccessPermissionKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportPermissionMap.update((current) => ({
      ...current,
      [permissionKey]: Boolean(input?.checked),
    }));
  }

  setSupportWidget(widgetKey: AccessWidgetKey, event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportWidgetMap.update((current) => ({
      ...current,
      [widgetKey]: Boolean(input?.checked),
    }));
  }

  toggleSupportCloseTicket(event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportResolutionCloseTicket.set(Boolean(input?.checked));
  }

  async applySupportResolution() {
    const diagnostic = this.supportDiagnostic();
    if (!diagnostic) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      const accessPayload = this.buildAccessUpdatePayload({
        context: diagnostic.accessContext,
        moduleMap: this.supportModuleMap(),
        permissionMap: this.supportPermissionMap(),
        widgetMap: this.supportWidgetMap(),
        landingEnabled: this.supportLandingOverrideEnabled(),
        landingValue: this.supportLandingOverride(),
        reason: this.supportEditReason().trim(),
      });

      const updatedDiagnostic = await this.accessControl.resolveSupportTicketAccess(
        diagnostic.ticket.id,
        {
          replace: accessPayload.replace,
          defaultLandingPage: accessPayload.defaultLandingPage,
          moduleOverrides: accessPayload.moduleOverrides,
          permissionOverrides: accessPayload.permissionOverrides,
          widgetOverrides: accessPayload.widgetOverrides,
          notes: this.supportResolutionNotes().trim() || undefined,
          responseMessage: this.supportResolutionMessage().trim() || undefined,
          closeTicket: this.supportResolutionCloseTicket(),
        },
      );

      this.supportDiagnostic.set(updatedDiagnostic);
      this.hydrateSupportEditor(updatedDiagnostic.accessContext);

      if (this.selectedUserContext()?.user.id === updatedDiagnostic.accessContext.user.id) {
        this.selectedUserContext.set(updatedDiagnostic.accessContext);
        this.hydrateUserEditor(updatedDiagnostic.accessContext);
      }

      this.statusMessage.set(
        this.site.localize({
          fr: "Résolution d'accès appliquée avec succès.",
          en: 'Access resolution applied successfully.',
          ar: 'تم تطبيق معالجة الصلاحيات بنجاح.',
        }),
      );

      await Promise.all([this.loadSummary(), this.loadUsers()]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: "Application de la resolution impossible.",
              en: 'Unable to apply resolution.',
              ar: 'تعذر تطبيق المعالجة.',
            }),
      );
    } finally {
      this.saving.set(false);
    }
  }

  roleLabel(role: string | null) {
    if (role === 'ADMINISTRATEUR') {
      return this.site.localize(this.adminLabel);
    }

    if (role === 'CHEF_LABO') {
      return this.site.localize(this.labHeadLabel);
    }

    if (role === 'MEMBRE') {
      return this.site.localize(this.memberLabel);
    }

    return this.site.localize(this.notAvailableLabel);
  }

  moduleLabel(key: AccessModuleKey) {
    return this.site.localize(MODULE_COPY[key] || { fr: key, en: key, ar: key });
  }

  permissionLabel(key: AccessPermissionKey) {
    return this.site.localize(PERMISSION_COPY[key] || { fr: key, en: key, ar: key });
  }

  widgetLabel(key: AccessWidgetKey) {
    return this.site.localize(WIDGET_COPY[key] || { fr: key, en: key, ar: key });
  }

  moduleKeysForRole(role: Role) {
    return ROLE_ALLOWED_MODULES[role] || ACCESS_MODULE_KEYS;
  }

  permissionKeysForRole(role: Role) {
    return ROLE_ALLOWED_PERMISSIONS[role] || ACCESS_PERMISSION_KEYS;
  }

  widgetKeysForRole(role: Role) {
    return ROLE_ALLOWED_WIDGETS[role] || ACCESS_WIDGET_KEYS;
  }

  private parseBoolFilter(value: BoolFilter) {
    if (value === '') {
      return undefined;
    }

    return value === 'yes';
  }

  private hydrateUserEditor(context: UserAccessContext) {
    this.userModuleMap.set(this.toModuleMap(context.effective.modules));
    this.userPermissionMap.set(this.toPermissionMap(context.effective.permissions));
    this.userWidgetMap.set(this.toWidgetMap(context.effective.widgets));
    this.userLandingOverrideEnabled.set(Boolean(context.landingOverride));
    this.userLandingOverride.set(
      context.landingOverride || context.effective.defaultLandingPage || '',
    );
  }

  private hydrateSupportEditor(context: UserAccessContext) {
    this.supportModuleMap.set(this.toModuleMap(context.effective.modules));
    this.supportPermissionMap.set(this.toPermissionMap(context.effective.permissions));
    this.supportWidgetMap.set(this.toWidgetMap(context.effective.widgets));
    this.supportLandingOverrideEnabled.set(Boolean(context.landingOverride));
    this.supportLandingOverride.set(
      context.landingOverride || context.effective.defaultLandingPage || '',
    );
    this.supportEditReason.set('');
    this.supportResolutionNotes.set('');
    this.supportResolutionMessage.set('');
    this.supportResolutionCloseTicket.set(true);
  }

  private buildAccessUpdatePayload(config: {
    context: UserAccessContext;
    moduleMap: Record<AccessModuleKey, boolean>;
    permissionMap: Record<AccessPermissionKey, boolean>;
    widgetMap: Record<AccessWidgetKey, boolean>;
    landingEnabled: boolean;
    landingValue: string;
    reason: string;
  }) {
    const defaults = this.extractDefaultMaps(config.context);
    const role = config.context.user.role;
    const reason = config.reason || undefined;

    const moduleOverrides: Array<{ moduleKey: string; value: boolean; reason?: string }> = [];
    for (const key of this.moduleKeysForRole(role)) {
      const desired = Boolean(config.moduleMap[key]);
      const baseline = Boolean(defaults.moduleMap[key]);

      if (desired !== baseline) {
        moduleOverrides.push({ moduleKey: key, value: desired, reason });
      }
    }

    const permissionOverrides: Array<{ permissionKey: string; value: boolean; reason?: string }> = [];
    for (const key of this.permissionKeysForRole(role)) {
      const desired = Boolean(config.permissionMap[key]);
      const baseline = Boolean(defaults.permissionMap[key]);

      if (desired !== baseline) {
        permissionOverrides.push({ permissionKey: key, value: desired, reason });
      }
    }

    const widgetOverrides: Array<{ widgetKey: string; value: boolean; reason?: string }> = [];
    for (const key of this.widgetKeysForRole(role)) {
      const desired = Boolean(config.widgetMap[key]);
      const baseline = Boolean(defaults.widgetMap[key]);

      if (desired !== baseline) {
        widgetOverrides.push({ widgetKey: key, value: desired, reason });
      }
    }

    let defaultLandingPage: string | null = null;
    if (config.landingEnabled) {
      const normalizedLanding = config.landingValue.trim();
      if (!normalizedLanding) {
        throw new Error(
          this.site.localize({
            fr: 'Le landing override ne peut pas être vide.',
            en: 'Landing override cannot be empty.',
            ar: 'لا يمكن ان تكون صفحة البداية فارغة.',
          }),
        );
      }

      defaultLandingPage = normalizedLanding;
    }

    return {
      replace: true,
      defaultLandingPage,
      moduleOverrides,
      permissionOverrides,
      widgetOverrides,
    };
  }

  private extractDefaultMaps(context: UserAccessContext) {
    return {
      moduleMap: this.toModuleMap(context.defaultAccess?.modules || context.effective.modules),
      permissionMap: this.toPermissionMap(
        context.defaultAccess?.permissions || context.effective.permissions,
      ),
      widgetMap: this.toWidgetMap(context.defaultAccess?.widgets || context.effective.widgets),
    };
  }

  private toModuleMap(items: Array<{ key: AccessModuleKey; isVisible: boolean }>) {
    const map = this.createBooleanMap(ACCESS_MODULE_KEYS, false);

    for (const item of items) {
      map[item.key] = Boolean(item.isVisible);
    }

    return map;
  }

  private toPermissionMap(items: Array<{ key: AccessPermissionKey; isAllowed: boolean }>) {
    const map = this.createBooleanMap(ACCESS_PERMISSION_KEYS, false);

    for (const item of items) {
      map[item.key] = Boolean(item.isAllowed);
    }

    return map;
  }

  private toWidgetMap(items: Array<{ key: AccessWidgetKey; isVisible: boolean }>) {
    const map = this.createBooleanMap(ACCESS_WIDGET_KEYS, false);

    for (const item of items) {
      map[item.key] = Boolean(item.isVisible);
    }

    return map;
  }

  private createBooleanMap<K extends string>(keys: readonly K[], initial: boolean) {
    return keys.reduce((acc, key) => {
      acc[key] = initial;
      return acc;
    }, {} as Record<K, boolean>);
  }
}
