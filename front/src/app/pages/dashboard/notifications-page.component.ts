import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type {
  NotificationItem,
  NotificationPreferences,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';
import { NotificationsStateService } from '../../shared/services/notifications-state.service';
import { RoleService } from '../../shared/services/role.service';

type NotificationCategory =
  | 'article'
  | 'purchase'
  | 'message'
  | 'system'
  | 'project'
  | 'support'
  | 'registration'
  | 'account'
  | 'role'
  | 'other';

type NotificationTypeFilter = 'all' | NotificationCategory;
type NotificationReadFilter = 'all' | 'unread' | 'read';
type NotificationPreferenceKey =
  | 'canalApplication'
  | 'canalEmail'
  | 'notifArticles'
  | 'notifMessages'
  | 'notifProjets'
  | 'notifDemandesAchat'
  | 'notifLivraisons';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  canalApplication: true,
  canalEmail: true,
  notifComptes: false,
  notifArticles: true,
  notifMessages: true,
  notifProjets: true,
  notifDemandesAchat: true,
  notifLivraisons: true,
  creeLe: '',
  modifieLe: '',
};

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-7">
      <section class="app-page-hero">
        <div class="app-page-hero__orb app-page-hero__orb--primary"></div>
        <div class="app-page-hero__orb app-page-hero__orb--secondary"></div>

        <div class="app-page-hero__content">
          <p class="app-page-eyebrow">{{ site.localize(pageEyebrow()) }}</p>

          <div class="app-page-header mt-2">
            <div class="space-y-1.5">
              <h2 class="app-page-title">{{ site.localize(pageTitle()) }}</h2>
              <p class="app-page-description">
                {{ site.localize(pageDescription()) }}
              </p>
            </div>

            <button
              type="button"
              class="btn-outline min-w-[14rem]"
              [disabled]="loading() || unreadCount() === 0"
              (click)="markAllRead()"
            >
              {{ site.localize(markAllReadLabel) }}
            </button>
          </div>

          <div class="app-page-pills">
            <span class="app-page-pill">
              {{ unreadCount() }} {{ site.localize(unreadChipLabel) }}
            </span>
            <span class="app-page-pill">
              {{ allNotifications().length }} {{ site.localize(totalShownLabel) }}
            </span>
          </div>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        @for (card of summaryCards(); track card.key) {
          <article class="surface-card p-5 lg:p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-semibold tracking-tight text-foreground">
                  {{ card.value }}
                </p>
                <p class="text-sm leading-6 text-muted-foreground">
                  {{ card.meta }}
                </p>
              </div>

              <span
                class="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                [class]="card.iconClass"
              >
                <lucide-icon [img]="card.icon" class="h-5 w-5"></lucide-icon>
              </span>
            </div>
          </article>
        }
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-6">
          <div class="surface-card p-5 lg:p-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {{ site.localize(typeFilterLabel) }}
                </p>

                <div class="flex flex-wrap gap-2">
                  @for (item of typeFilters(); track item.value) {
                    <button
                      type="button"
                      class="h-10 rounded-xl border px-4 text-xs font-semibold transition"
                      [class.border-primary/30]="selectedType() === item.value"
                      [class.bg-primary]="selectedType() === item.value"
                      [class.text-primary-foreground]="selectedType() === item.value"
                      [class.border-border]="selectedType() !== item.value"
                      [class.bg-card]="selectedType() !== item.value"
                      [class.text-muted-foreground]="selectedType() !== item.value"
                      (click)="selectType(item.value)"
                    >
                      {{ item.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="space-y-2 border-t border-border/70 pt-4">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {{ site.localize(readFilterLabel) }}
                </p>

                <div class="flex flex-wrap gap-2">
                  @for (item of readFilters(); track item.value) {
                    <button
                      type="button"
                      class="h-10 rounded-xl border px-4 text-xs font-semibold transition"
                      [class.border-secondary/30]="selectedRead() === item.value"
                      [class.bg-secondary]="selectedRead() === item.value"
                      [class.text-secondary-foreground]="selectedRead() === item.value"
                      [class.border-border]="selectedRead() !== item.value"
                      [class.bg-card]="selectedRead() !== item.value"
                      [class.text-muted-foreground]="selectedRead() !== item.value"
                      (click)="selectRead(item.value)"
                    >
                      {{ item.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="surface-card space-y-4 p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-foreground">
                  {{ site.localize(feedTitleLabel) }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ visibleNotifications().length }} {{ site.localize(filteredCountLabel) }}
                </p>
              </div>

              @if (selectedType() !== 'all' || selectedRead() !== 'all') {
                <span class="inline-flex items-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {{ site.localize(filteredStateLabel) }}
                </span>
              }
            </div>

            @if (loading()) {
              <div class="rounded-2xl border border-border bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                {{ site.localize(loadingLabel) }}
              </div>
            } @else {
              @for (item of visibleNotifications(); track item.id) {
                <article
                  class="rounded-3xl border px-4 py-4 shadow-sm transition lg:px-5"
                  [class.border-primary/35]="!item.estLue"
                  [class.bg-primary/5]="!item.estLue"
                  [class.border-border]="item.estLue"
                  [class.bg-card]="item.estLue"
                >
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <span [class]="notificationIconContainerClass(item)">
                      <lucide-icon [img]="notificationIcon(item)" class="h-4 w-4"></lucide-icon>
                    </span>

                    <div class="min-w-0 flex-1 space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {{ categoryLabel(item) }}
                          </span>

                          @if (relatedEntityLabel(item); as relatedLabel) {
                            <span class="inline-flex h-8 items-center rounded-full border border-border bg-muted px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {{ relatedLabel }}
                            </span>
                          }

                          @if (!item.estLue) {
                            <span class="inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                              {{ site.localize(newStateLabel) }}
                            </span>
                          }
                        </div>

                        <p class="text-xs font-medium text-muted-foreground">
                          {{ formatDate(item.creeLe) }}
                        </p>
                      </div>

                      <div class="space-y-1.5">
                        <h3 class="text-base font-semibold leading-6 text-foreground">
                          {{ item.titre }}
                        </h3>
                        <p class="text-sm leading-6 text-muted-foreground">
                          {{ item.message }}
                        </p>
                      </div>

                      <div class="flex flex-wrap items-center gap-2 pt-1">
                        @if (item.lienDirect) {
                          <button
                            type="button"
                            class="btn-secondary"
                            (click)="openNotificationLink(item)"
                          >
                            {{ site.localize(openRelatedLabel) }}
                          </button>
                        }

                        @if (!item.estLue) {
                          <button
                            type="button"
                            class="btn-outline"
                            (click)="markRead(item.id)"
                          >
                            {{ site.localize(markReadLabel) }}
                          </button>
                        } @else {
                          <span class="inline-flex h-9 items-center rounded-xl border border-border bg-muted px-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                            {{ site.localize(readStateLabel) }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="empty-state py-12">
                  {{ site.localize(emptyLabel) }}
                </div>
              }
            }
          </div>

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
        </div>

        <aside class="space-y-6">
          <div class="surface-card p-5 lg:p-6">
            <div class="flex items-start gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <lucide-icon [img]="icons.Bell" class="h-4 w-4"></lucide-icon>
              </span>

              <div class="space-y-1.5">
                <h3 class="text-lg font-semibold text-foreground">
                  {{ site.localize(helperCardTitle()) }}
                </h3>
                <p class="text-sm leading-6 text-muted-foreground">
                  {{ site.localize(helperCardDescription()) }}
                </p>
              </div>
            </div>
          </div>

          @if (showPreferences()) {
            <form class="surface-card p-5 lg:p-6" (ngSubmit)="savePreferences()">
              <div class="flex items-start gap-3 border-b border-border/70 pb-4">
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <lucide-icon [img]="icons.Settings" class="h-4 w-4"></lucide-icon>
                </span>

                <div class="space-y-1.5">
                  <h3 class="text-lg font-semibold text-foreground">
                    {{ site.localize(preferencesTitleLabel) }}
                  </h3>
                  <p class="text-sm leading-6 text-muted-foreground">
                    {{ site.localize(preferencesDescriptionLabel) }}
                  </p>
                </div>
              </div>

              <div class="mt-5 space-y-3">
                @for (item of preferenceOptions(); track item.key) {
                  <label class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm transition hover:border-primary/20">
                    <div class="space-y-0.5">
                      <span class="text-sm font-semibold text-foreground">{{ item.label }}</span>
                      <p class="text-xs leading-5 text-muted-foreground">{{ item.description }}</p>
                    </div>
                    <input
                      type="checkbox"
                      class="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
                      [disabled]="loading() || savingPreferences() || !preferencesLoaded()"
                      [name]="'pref-' + item.key"
                      [ngModel]="preferenceValue(item.key)"
                      (ngModelChange)="updatePreference(item.key, $event)"
                    />
                  </label>
                }
              </div>

              @if (preferencesMessage()) {
                <div class="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success">
                  {{ preferencesMessage() }}
                </div>
              }

              @if (preferencesError()) {
                <div class="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error">
                  {{ preferencesError() }}
                </div>
              }

              <div class="mt-5 flex justify-end">
                <button
                  type="submit"
                  class="btn-secondary min-w-[14rem]"
                  [disabled]="loading() || savingPreferences() || !preferencesLoaded()"
                >
                  {{
                    savingPreferences()
                      ? site.localize(savingLabel)
                      : site.localize(savePreferencesLabel)
                  }}
                </button>
              </div>
            </form>
          }
        </aside>
      </div>
    </div>
  `,
})
export class NotificationsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly roleService = inject(RoleService);
  readonly router = inject(Router);
  readonly notificationsState = inject(NotificationsStateService);
  readonly icons = sharedIcons;

  readonly loading = signal(false);
  readonly savingPreferences = signal(false);
  readonly selectedType = signal<NotificationTypeFilter>('all');
  readonly selectedRead = signal<NotificationReadFilter>('all');
  readonly allNotifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly preferencesMessage = signal('');
  readonly preferencesError = signal('');
  readonly preferencesLoaded = signal(false);
  readonly preferencesDraft = signal<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  readonly formatDate = formatDate;

  readonly isAdmin = computed(() => this.roleService.isAdmin());
  readonly isLabHead = computed(() => this.roleService.isChef());
  readonly showPreferences = computed(() => !this.isAdmin());

  readonly pageTitle = computed(() =>
    this.isAdmin()
      ? {
          fr: 'Notifications administrateur',
          en: 'Admin notifications',
          ar: 'إشعارات الإدارة',
        }
      : this.isLabHead()
        ? {
            fr: 'Notifications chef de laboratoire',
            en: 'Lab head notifications',
            ar: 'إشعارات رئيس المختبر',
          }
        : {
            fr: 'Mes notifications',
            en: 'My notifications',
            ar: 'إشعاراتي',
          },
  );

  readonly pageEyebrow = computed(() =>
    this.isAdmin()
      ? {
          fr: 'Flux de supervision',
          en: 'Supervision feed',
          ar: 'تدفق الإشراف',
        }
      : {
          fr: 'Centre de suivi',
          en: 'Tracking hub',
          ar: 'مركز المتابعة',
        },
  );

  readonly pageDescription = computed(() =>
    this.isAdmin()
      ? {
          fr: 'Suivez les comptes, les inscriptions, les messages et les alertes techniques depuis un seul espace.',
          en: 'Track accounts, registrations, messages, and technical alerts from one place.',
          ar: 'تابع الحسابات وطلبات التسجيل والرسائل والتنبيهات التقنية من مساحة واحدة.',
        }
      : this.isLabHead()
        ? {
            fr: 'Retrouvez les validations d’articles, les demandes d’achat en attente, les messages internes et les alertes utiles au pilotage du laboratoire.',
            en: 'Review article validations, pending purchase requests, internal messages, and key alerts for lab coordination.',
            ar: 'اعرض هنا التحقق من المقالات وطلبات الشراء المعلقة والرسائل الداخلية والتنبيهات المهمة لتسيير المختبر.',
          }
        : {
            fr: 'Consultez vos alertes d’articles, achats, messages et statuts importants dans un flux clair et centralisé.',
            en: 'Review your article, purchase, message, and status alerts in one clear feed.',
            ar: 'اطلع على تنبيهات المقالات والشراء والرسائل والحالات المهمة في تدفق موحد وواضح.',
          },
  );

  readonly helperCardTitle = computed(() =>
    this.isAdmin()
      ? {
          fr: 'Centre de supervision',
          en: 'Supervision center',
          ar: 'مركز الإشراف',
        }
      : {
          fr: 'Aide à la priorisation',
          en: 'Prioritization helper',
          ar: 'مساعدة على ترتيب الأولويات',
        },
  );

  readonly helperCardDescription = computed(() =>
    this.isAdmin()
      ? {
          fr: 'Les notifications regroupent les changements de comptes, les messages, le support et les événements critiques avec accès direct au contenu lié.',
          en: 'Notifications gather account changes, messages, support, and critical events with direct access to the related content.',
          ar: 'تجمع الإشعارات تغييرات الحسابات والرسائل والدعم والأحداث المهمة مع وصول مباشر إلى المحتوى المرتبط.',
        }
      : this.isLabHead()
        ? {
            fr: 'Les soumissions d’articles, les demandes d’achat, les messages internes et les mises à jour importantes arrivent ici. Ouvrez le contenu lié puis marquez la notification comme lue si nécessaire.',
            en: 'Article submissions, purchase requests, internal messages, and important updates arrive here. Open the related content, then mark the notification as read when needed.',
            ar: 'تصل هنا مقترحات المقالات وطلبات الشراء والرسائل الداخلية والتحديثات المهمة. افتح المحتوى المرتبط ثم علّم الإشعار كمقروء عند الحاجة.',
          }
        : {
            fr: 'Le flux centralise vos retours d’articles, achats et messages. Ouvrez chaque élément lié pour suivre rapidement l’action attendue.',
            en: 'This feed centralizes your article, purchase, and message updates. Open each related item to follow the next expected action quickly.',
            ar: 'يوحّد هذا التدفق تحديثات المقالات والشراء والرسائل الخاصة بك. افتح كل عنصر مرتبط لمتابعة الإجراء المطلوب بسرعة.',
          },
  );

  readonly summaryCards = computed(() => {
    if (this.isAdmin()) {
      return [
        {
          key: 'total',
          label: this.site.localize({
            fr: 'Total notifications',
            en: 'Total notifications',
            ar: 'إجمالي الإشعارات',
          }),
          value: this.allNotifications().length,
          meta: this.site.localize({
            fr: 'Flux chargé dans cet espace',
            en: 'Feed loaded in this space',
            ar: 'الإشعارات المحمّلة في هذه المساحة',
          }),
          icon: this.icons.Bell,
          iconClass: 'bg-primary/10 text-primary',
        },
        {
          key: 'unread',
          label: this.site.localize({
            fr: 'Non lues',
            en: 'Unread',
            ar: 'غير المقروءة',
          }),
          value: this.unreadCount(),
          meta: this.site.localize({
            fr: 'Alertes restant à traiter',
            en: 'Alerts still requiring attention',
            ar: 'تنبيهات ما زالت تحتاج إلى متابعة',
          }),
          icon: this.icons.CheckCheck,
          iconClass: 'bg-amber-100 text-amber-700',
        },
        {
          key: 'message',
          label: this.site.localize({
            fr: 'Messages',
            en: 'Messages',
            ar: 'الرسائل',
          }),
          value: this.countByCategory('message'),
          meta: this.site.localize({
            fr: 'Échanges récents et retours directs',
            en: 'Recent exchanges and direct feedback',
            ar: 'أحدث التبادلات والردود المباشرة',
          }),
          icon: this.icons.MessagesSquare,
          iconClass: 'bg-sky-100 text-sky-700',
        },
        {
          key: 'support',
          label: this.site.localize({
            fr: 'Support',
            en: 'Support',
            ar: 'الدعم',
          }),
          value: this.countByCategory('support'),
          meta: this.site.localize({
            fr: 'Suivi des tickets et actions techniques',
            en: 'Ticket follow-up and technical actions',
            ar: 'متابعة التذاكر والإجراءات التقنية',
          }),
          icon: this.icons.LifeBuoy,
          iconClass: 'bg-violet-100 text-violet-700',
        },
      ];
    }

    return [
      {
        key: 'total',
        label: this.site.localize({
          fr: 'Total notifications',
          en: 'Total notifications',
          ar: 'إجمالي الإشعارات',
        }),
        value: this.allNotifications().length,
        meta: this.site.localize({
          fr: 'Flux opérationnel récent',
          en: 'Recent operational feed',
          ar: 'تدفق تشغيلي حديث',
        }),
        icon: this.icons.Bell,
        iconClass: 'bg-primary/10 text-primary',
      },
      {
        key: 'unread',
        label: this.site.localize({
          fr: 'Non lues',
          en: 'Unread',
          ar: 'غير المقروءة',
        }),
        value: this.unreadCount(),
        meta: this.site.localize({
          fr: 'Éléments encore à ouvrir',
          en: 'Items still to review',
          ar: 'عناصر ما زالت بحاجة للمراجعة',
        }),
        icon: this.icons.CheckCheck,
        iconClass: 'bg-amber-100 text-amber-700',
      },
      {
        key: 'article',
        label: this.site.localize({
          fr: 'Articles',
          en: 'Articles',
          ar: 'المقالات',
        }),
        value: this.countByCategory('article'),
        meta: this.site.localize({
          fr: 'Soumissions, validations et décisions',
          en: 'Submissions, validations, and decisions',
          ar: 'الإرساليات والتحققات والقرارات',
        }),
        icon: this.icons.FileText,
        iconClass: 'bg-sky-100 text-sky-700',
      },
      {
        key: 'purchase',
        label: this.site.localize({
          fr: 'Achats',
          en: 'Purchases',
          ar: 'المشتريات',
        }),
        value: this.countByCategory('purchase'),
        meta: this.site.localize({
          fr: 'Demandes et changements de statut',
          en: 'Requests and status changes',
          ar: 'الطلبات وتغييرات الحالة',
        }),
        icon: this.icons.ShoppingCart,
        iconClass: 'bg-emerald-100 text-emerald-700',
      },
    ];
  });

  readonly typeFilters = computed<
    Array<{ value: NotificationTypeFilter; label: string }>
  >(() => {
    if (this.isAdmin()) {
      return [
        { value: 'all', label: this.site.localize({ fr: 'Toutes', en: 'All', ar: 'الكل' }) },
        {
          value: 'registration',
          label: this.site.localize({
            fr: 'Inscriptions',
            en: 'Registrations',
            ar: 'التسجيلات',
          }),
        },
        {
          value: 'account',
          label: this.site.localize({
            fr: 'Comptes',
            en: 'Accounts',
            ar: 'الحسابات',
          }),
        },
        {
          value: 'message',
          label: this.site.localize({
            fr: 'Messages',
            en: 'Messages',
            ar: 'الرسائل',
          }),
        },
        {
          value: 'role',
          label: this.site.localize({
            fr: 'Rôles',
            en: 'Roles',
            ar: 'الأدوار',
          }),
        },
        {
          value: 'support',
          label: this.site.localize({
            fr: 'Support',
            en: 'Support',
            ar: 'الدعم',
          }),
        },
      ];
    }

    return [
      { value: 'all', label: this.site.localize({ fr: 'Toutes', en: 'All', ar: 'الكل' }) },
      {
        value: 'article',
        label: this.site.localize({
          fr: 'Articles',
          en: 'Articles',
          ar: 'المقالات',
        }),
      },
      {
        value: 'purchase',
        label: this.site.localize({
          fr: 'Achats',
          en: 'Purchases',
          ar: 'المشتريات',
        }),
      },
      {
        value: 'message',
        label: this.site.localize({
          fr: 'Messages',
          en: 'Messages',
          ar: 'الرسائل',
        }),
      },
      {
        value: 'project',
        label: this.site.localize({
          fr: 'Projets',
          en: 'Projects',
          ar: 'المشاريع',
        }),
      },
      {
        value: 'system',
        label: this.site.localize({
          fr: 'Système',
          en: 'System',
          ar: 'النظام',
        }),
      },
      {
        value: 'support',
        label: this.site.localize({
          fr: 'Support',
          en: 'Support',
          ar: 'الدعم',
        }),
      },
    ];
  });

  readonly readFilters = computed<
    Array<{ value: NotificationReadFilter; label: string }>
  >(() => [
    { value: 'all', label: this.site.localize({ fr: 'Toutes', en: 'All', ar: 'الكل' }) },
    {
      value: 'unread',
      label: this.site.localize({
        fr: 'Non lues',
        en: 'Unread',
        ar: 'غير المقروءة',
      }),
    },
    {
      value: 'read',
      label: this.site.localize({
        fr: 'Lues',
        en: 'Read',
        ar: 'المقروءة',
      }),
    },
  ]);

  readonly visibleNotifications = computed(() =>
    this.allNotifications().filter((item) => {
      const currentType = this.selectedType();
      if (currentType !== 'all' && this.resolveCategory(item) !== currentType) {
        return false;
      }

      const currentRead = this.selectedRead();
      if (currentRead === 'unread') {
        return !item.estLue;
      }

      if (currentRead === 'read') {
        return item.estLue;
      }

      return true;
    }),
  );

  readonly preferenceOptions = computed<
    Array<{
      key: NotificationPreferenceKey;
      label: string;
      description: string;
    }>
  >(() => [
    {
      key: 'canalApplication',
      label: this.site.localize({
        fr: 'Canal application',
        en: 'App channel',
        ar: 'قناة التطبيق',
      }),
      description: this.site.localize({
        fr: 'Afficher les alertes dans le dashboard.',
        en: 'Show alerts directly in the dashboard.',
        ar: 'عرض التنبيهات مباشرة داخل لوحة التحكم.',
      }),
    },
    {
      key: 'canalEmail',
      label: this.site.localize({
        fr: 'Canal email',
        en: 'Email channel',
        ar: 'قناة البريد الإلكتروني',
      }),
      description: this.site.localize({
        fr: 'Recevoir les notifications importantes par email.',
        en: 'Receive important notifications by email.',
        ar: 'استقبال الإشعارات المهمة عبر البريد الإلكتروني.',
      }),
    },
    {
      key: 'notifArticles',
      label: this.site.localize({
        fr: 'Alertes articles',
        en: 'Article alerts',
        ar: 'تنبيهات المقالات',
      }),
      description: this.site.localize({
        fr: 'Soumissions, validations, rejets et publications.',
        en: 'Submissions, validations, rejections, and publications.',
        ar: 'الإرساليات والتحققات والرفض والنشر.',
      }),
    },
    {
      key: 'notifDemandesAchat',
      label: this.site.localize({
        fr: 'Alertes achats',
        en: 'Purchase alerts',
        ar: 'تنبيهات الشراء',
      }),
      description: this.site.localize({
        fr: 'Nouvelles demandes et changements de statut.',
        en: 'New requests and status changes.',
        ar: 'الطلبات الجديدة وتغييرات الحالة.',
      }),
    },
    {
      key: 'notifMessages',
      label: this.site.localize({
        fr: 'Alertes messages',
        en: 'Message alerts',
        ar: 'تنبيهات الرسائل',
      }),
      description: this.site.localize({
        fr: 'Nouveaux messages et échanges internes.',
        en: 'New messages and internal conversations.',
        ar: 'الرسائل الجديدة والمحادثات الداخلية.',
      }),
    },
    {
      key: 'notifProjets',
      label: this.site.localize({
        fr: 'Alertes projets',
        en: 'Project alerts',
        ar: 'تنبيهات المشاريع',
      }),
      description: this.site.localize({
        fr: 'Créations et mises à jour de projets.',
        en: 'Project creations and updates.',
        ar: 'إنشاء المشاريع وتحديثاتها.',
      }),
    },
    {
      key: 'notifLivraisons',
      label: this.site.localize({
        fr: 'Alertes livraisons',
        en: 'Delivery alerts',
        ar: 'تنبيهات التسليم',
      }),
      description: this.site.localize({
        fr: 'Suivi des commandes et livraisons reçues.',
        en: 'Track orders and received deliveries.',
        ar: 'متابعة الطلبات وعمليات التسليم المستلمة.',
      }),
    },
  ]);

  readonly markAllReadLabel = {
    fr: 'Tout marquer comme lu',
    en: 'Mark all as read',
    ar: 'تحديد الكل كمقروء',
  };
  readonly unreadChipLabel = {
    fr: 'non lue(s)',
    en: 'unread',
    ar: 'غير مقروءة',
  };
  readonly totalShownLabel = {
    fr: 'chargées',
    en: 'loaded',
    ar: 'محمّلة',
  };
  readonly typeFilterLabel = {
    fr: 'Catégories',
    en: 'Categories',
    ar: 'الفئات',
  };
  readonly readFilterLabel = {
    fr: 'État de lecture',
    en: 'Read state',
    ar: 'حالة القراءة',
  };
  readonly feedTitleLabel = {
    fr: 'Flux des notifications',
    en: 'Notifications feed',
    ar: 'تدفق الإشعارات',
  };
  readonly filteredCountLabel = {
    fr: 'notification(s) affichée(s)',
    en: 'notification(s) shown',
    ar: 'إشعار/إشعارات معروضة',
  };
  readonly filteredStateLabel = {
    fr: 'Filtres actifs',
    en: 'Active filters',
    ar: 'فلاتر مفعلة',
  };
  readonly loadingLabel = {
    fr: 'Chargement des notifications...',
    en: 'Loading notifications...',
    ar: 'جار تحميل الإشعارات...',
  };
  readonly openRelatedLabel = {
    fr: 'Ouvrir le contenu lié',
    en: 'Open related content',
    ar: 'فتح المحتوى المرتبط',
  };
  readonly markReadLabel = {
    fr: 'Marquer comme lue',
    en: 'Mark as read',
    ar: 'تحديد كمقروء',
  };
  readonly readStateLabel = {
    fr: 'Lue',
    en: 'Read',
    ar: 'مقروءة',
  };
  readonly newStateLabel = {
    fr: 'Nouvelle',
    en: 'New',
    ar: 'جديد',
  };
  readonly emptyLabel = {
    fr: 'Aucune notification ne correspond aux filtres sélectionnés.',
    en: 'No notifications match the selected filters.',
    ar: 'لا توجد إشعارات تطابق الفلاتر المحددة.',
  };
  readonly preferencesTitleLabel = {
    fr: 'Préférences de notification',
    en: 'Notification preferences',
    ar: 'تفضيلات الإشعارات',
  };
  readonly preferencesDescriptionLabel = {
    fr: 'Ajustez les canaux et catégories que vous souhaitez suivre.',
    en: 'Adjust the channels and categories you want to follow.',
    ar: 'اضبط القنوات والفئات التي تريد متابعتها.',
  };
  readonly savePreferencesLabel = {
    fr: 'Enregistrer les préférences',
    en: 'Save preferences',
    ar: 'حفظ التفضيلات',
  };
  readonly savingLabel = {
    fr: 'Enregistrement...',
    en: 'Saving...',
    ar: 'جار الحفظ...',
  };

  async ngOnInit() {
    await this.loadPage();
  }

  async loadPage() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.preferencesError.set('');
    this.preferencesMessage.set('');

    try {
      const notificationsResponse = await (this.isAdmin()
        ? api.listAdminNotifications(token, { limit: 50 })
        : api.listNotifications(token, { limit: 50 }));

      this.allNotifications.set(notificationsResponse.elements || []);
      this.unreadCount.set(notificationsResponse.unreadCount || 0);
      this.notificationsState.setUnreadCount(notificationsResponse.unreadCount || 0);

      if (this.showPreferences()) {
        try {
          const preferencesResponse = await api.getNotificationPreferences(token);
          this.preferencesDraft.set(preferencesResponse);
          this.preferencesLoaded.set(true);
        } catch {
          this.preferencesLoaded.set(false);
          this.preferencesError.set(
            this.site.localize({
              fr: 'Les préférences n’ont pas pu être chargées pour le moment.',
              en: 'Preferences could not be loaded right now.',
              ar: 'تعذر تحميل التفضيلات في الوقت الحالي.',
            }),
          );
        }
      } else {
        this.preferencesLoaded.set(false);
      }
    } catch (error) {
      this.allNotifications.set([]);
      this.unreadCount.set(0);
      this.notificationsState.setUnreadCount(0);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de charger les notifications.',
              en: 'Unable to load notifications.',
              ar: 'تعذر تحميل الإشعارات.',
            }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  selectType(value: NotificationTypeFilter) {
    this.selectedType.set(value);
  }

  selectRead(value: NotificationReadFilter) {
    this.selectedRead.set(value);
  }

  async markRead(notificationId: number) {
    this.statusMessage.set('');
    this.errorMessage.set('');
    await this.markNotificationAsRead(notificationId);
  }

  async markAllRead() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.statusMessage.set('');
    this.errorMessage.set('');

    try {
      const result = this.isAdmin()
        ? await api.markAllAdminNotificationsRead(token)
        : await api.markAllNotificationsRead(token);

      this.allNotifications.update((items) =>
        items.map((item) => ({
          ...item,
          estLue: true,
          lueLe: item.lueLe || new Date().toISOString(),
        })),
      );
      this.unreadCount.set(0);
      this.notificationsState.setUnreadCount(0);
      this.statusMessage.set(
        result.updatedCount > 0
          ? this.site.localize({
              fr: `${result.updatedCount} notification(s) marquée(s) comme lue(s).`,
              en: `${result.updatedCount} notification(s) marked as read.`,
              ar: `تم تحديد ${result.updatedCount} إشعار/إشعارات كمقروءة.`,
            })
          : this.site.localize({
              fr: 'Aucune notification à marquer.',
              en: 'No notifications to mark.',
              ar: 'لا توجد إشعارات لتحديدها.',
            }),
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Action impossible.',
              en: 'Action failed.',
              ar: 'تعذر تنفيذ الإجراء.',
            }),
      );
    }
  }

  async openNotificationLink(item: NotificationItem) {
    if (!item.lienDirect) {
      return;
    }

    this.statusMessage.set('');
    this.errorMessage.set('');

    if (!item.estLue) {
      const success = await this.markNotificationAsRead(item.id, true);
      if (!success) {
        return;
      }
    }

    await this.router.navigateByUrl(item.lienDirect);
  }

  updatePreference(key: NotificationPreferenceKey, value: boolean) {
    this.preferencesDraft.update((current) => ({
      ...current,
      [key]: Boolean(value),
    }));
  }

  preferenceValue(key: NotificationPreferenceKey) {
    return Boolean(this.preferencesDraft()[key]);
  }

  async savePreferences() {
    if (!this.showPreferences()) {
      return;
    }

    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.savingPreferences.set(true);
    this.preferencesError.set('');
    this.preferencesMessage.set('');

    try {
      const updated = await api.updateNotificationPreferences(
        token,
        this.preferencesDraft(),
      );
      this.preferencesDraft.set(updated);
      this.preferencesLoaded.set(true);
      this.preferencesMessage.set(
        this.site.localize({
          fr: 'Préférences de notification mises à jour.',
          en: 'Notification preferences updated.',
          ar: 'تم تحديث تفضيلات الإشعارات.',
        }),
      );
    } catch (error) {
      this.preferencesError.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible d’enregistrer les préférences.',
              en: 'Unable to save preferences.',
              ar: 'تعذر حفظ التفضيلات.',
            }),
      );
    } finally {
      this.savingPreferences.set(false);
    }
  }

  categoryLabel(item: NotificationItem) {
    const category = this.resolveCategory(item);

    if (category === 'article') {
      return this.site.localize({ fr: 'Articles', en: 'Articles', ar: 'المقالات' });
    }
    if (category === 'purchase') {
      return this.site.localize({ fr: 'Achats', en: 'Purchases', ar: 'المشتريات' });
    }
    if (category === 'message') {
      return this.site.localize({ fr: 'Messages', en: 'Messages', ar: 'الرسائل' });
    }
    if (category === 'system') {
      return this.site.localize({ fr: 'Système', en: 'System', ar: 'النظام' });
    }
    if (category === 'project') {
      return this.site.localize({ fr: 'Projets', en: 'Projects', ar: 'المشاريع' });
    }
    if (category === 'support') {
      return this.site.localize({ fr: 'Support', en: 'Support', ar: 'الدعم' });
    }
    if (category === 'registration') {
      return this.site.localize({
        fr: 'Inscriptions',
        en: 'Registrations',
        ar: 'التسجيلات',
      });
    }
    if (category === 'account') {
      return this.site.localize({ fr: 'Comptes', en: 'Accounts', ar: 'الحسابات' });
    }
    if (category === 'role') {
      return this.site.localize({ fr: 'Rôles', en: 'Roles', ar: 'الأدوار' });
    }

    return this.site.localize({
      fr: 'Notification',
      en: 'Notification',
      ar: 'إشعار',
    });
  }

  relatedEntityLabel(item: NotificationItem) {
    if (item.articleId) {
      return this.site.localize({
        fr: `Article #${item.articleId}`,
        en: `Article #${item.articleId}`,
        ar: `مقالة #${item.articleId}`,
      });
    }

    if (item.demandeAchatId) {
      return this.site.localize({
        fr: `Achat #${item.demandeAchatId}`,
        en: `Purchase #${item.demandeAchatId}`,
        ar: `شراء #${item.demandeAchatId}`,
      });
    }

    if (item.projetId) {
      return this.site.localize({
        fr: `Projet #${item.projetId}`,
        en: `Project #${item.projetId}`,
        ar: `مشروع #${item.projetId}`,
      });
    }

    if (item.conversationId) {
      return this.site.localize({
        fr: `Conversation #${item.conversationId}`,
        en: `Conversation #${item.conversationId}`,
        ar: `محادثة #${item.conversationId}`,
      });
    }

    return null;
  }

  notificationIcon(item: NotificationItem) {
    const category = this.resolveCategory(item);

    if (category === 'article') {
      return this.icons.FileText;
    }
    if (category === 'purchase') {
      return this.icons.ShoppingCart;
    }
    if (category === 'message') {
      return this.icons.MessagesSquare;
    }
    if (category === 'project') {
      return this.icons.FolderKanban;
    }
    if (category === 'support') {
      return this.icons.LifeBuoy;
    }
    if (category === 'registration') {
      return this.icons.FileSearch;
    }
    if (category === 'account' || category === 'role') {
      return this.icons.Shield;
    }

    return this.icons.Bell;
  }

  notificationIconContainerClass(item: NotificationItem) {
    const category = this.resolveCategory(item);

    if (category === 'article') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700';
    }
    if (category === 'purchase') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700';
    }
    if (category === 'message') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700';
    }
    if (category === 'project') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700';
    }
    if (category === 'support') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700';
    }
    if (category === 'registration') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700';
    }
    if (category === 'account' || category === 'role') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-700';
    }

    return 'inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground';
  }

  private countByCategory(category: NotificationCategory) {
    return this.allNotifications().filter(
      (item) => this.resolveCategory(item) === category,
    ).length;
  }

  private resolveCategory(item: NotificationItem): NotificationCategory {
    if (item.categorie === 'registration') {
      return 'registration';
    }
    if (item.categorie === 'account') {
      return 'account';
    }
    if (item.categorie === 'message') {
      return 'message';
    }
    if (item.categorie === 'role') {
      return 'role';
    }
    if (item.categorie === 'support') {
      return 'support';
    }

    const type = String(item.typeNotification || '').toUpperCase();

    if (type.startsWith('SUPPORT_')) {
      return 'support';
    }
    if (type.includes('MESSAGE')) {
      return 'message';
    }
    if (type.includes('ARTICLE')) {
      return 'article';
    }
    if (type.includes('DEMANDE_ACHAT') || type.includes('ACHAT')) {
      return 'purchase';
    }
    if (type.includes('PROJET')) {
      return 'project';
    }
    if (type.includes('INSCRIPTION')) {
      return 'registration';
    }
    if (type.includes('COMPTE')) {
      return 'account';
    }
    if (type.includes('ROLE')) {
      return 'role';
    }
    if (type === 'SYSTEME') {
      return 'system';
    }

    return 'other';
  }

  private async markNotificationAsRead(
    notificationId: number,
    silent = false,
  ) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return false;
    }

    const current = this.allNotifications().find((item) => item.id === notificationId);
    if (!current || current.estLue) {
      return true;
    }

    try {
      if (this.isAdmin()) {
        await api.markAdminNotificationRead(token, notificationId);
      } else {
        await api.markNotificationRead(token, notificationId);
      }

      this.allNotifications.update((items) =>
        items.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                estLue: true,
                lueLe: item.lueLe || new Date().toISOString(),
              }
            : item,
        ),
      );

      const nextUnread = Math.max(0, this.unreadCount() - 1);
      this.unreadCount.set(nextUnread);
      this.notificationsState.setUnreadCount(nextUnread);

      if (!silent) {
        this.statusMessage.set(
          this.site.localize({
            fr: 'Notification marquée comme lue.',
            en: 'Notification marked as read.',
            ar: 'تم تحديد الإشعار كمقروء.',
          }),
        );
      }

      return true;
    } catch (error) {
      if (!silent) {
        this.errorMessage.set(
          error instanceof Error
            ? error.message
            : this.site.localize({
                fr: 'Action impossible.',
                en: 'Action failed.',
                ar: 'تعذر تنفيذ الإجراء.',
              }),
        );
      }

      return false;
    }
  }
}
