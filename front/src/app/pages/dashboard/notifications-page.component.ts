import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type {
  AdminNotificationCategory,
  NotificationItem,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

type NotificationFilterType =
  | 'all'
  | 'registration'
  | 'account'
  | 'message'
  | 'role';

type NotificationReadFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-7">
      <div class="app-page-header">
        <div class="space-y-1.5">
          <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(pageDescription) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <div class="inline-flex h-11 items-center rounded-xl border border-primary/20 bg-primary/10 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {{ unreadCount() }} {{ site.localize(unreadChipLabel) }}
          </div>
          <button
            type="button"
            class="btn-outline min-w-[13rem]"
            [disabled]="loading() || unreadCount() === 0"
            (click)="markAllRead()"
          >
            {{ site.localize(markAllReadLabel) }}
          </button>
        </div>
      </div>

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
        @if (loading()) {
          <div class="rounded-2xl border border-border bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
            {{ site.localize(loadingLabel) }}
          </div>
        }

        @for (item of notifications(); track item.id) {
          <article
            class="rounded-2xl border px-4 py-4 shadow-sm transition lg:px-5"
            [class.border-primary/40]="!item.estLue"
            [class.bg-primary/5]="!item.estLue"
            [class.border-border]="item.estLue"
            [class.bg-card]="item.estLue"
          >
            <div class="flex items-start gap-3">
              <span [class]="notificationIconContainerClass(item)">
                <lucide-icon [img]="notificationIcon(item)" class="h-4 w-4"></lucide-icon>
              </span>

              <div class="min-w-0 flex-1 space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {{ categoryLabel(item) }}
                  </p>
                  <p class="text-xs font-medium text-muted-foreground">{{ formatDate(item.creeLe) }}</p>
                </div>

                <div class="space-y-1">
                  <h3 class="text-base font-semibold leading-6 text-foreground">{{ item.titre }}</h3>
                  <p class="text-sm leading-6 text-muted-foreground">{{ item.message }}</p>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-1.5">
                  @if (item.lienDirect) {
                    <button type="button" class="btn-secondary" (click)="openNotificationLink(item)">
                      {{ site.localize(openLabel) }}
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
          @if (!loading()) {
            <div class="empty-state py-12">
              {{ site.localize(emptyLabel) }}
            </div>
          }
        }
      </div>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {{ statusMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class NotificationsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly roleService = inject(RoleService);
  readonly router = inject(Router);
  readonly icons = sharedIcons;

  readonly isAdmin = computed(() => this.roleService.isAdmin());
  readonly loading = signal(false);
  readonly selectedType = signal<NotificationFilterType>('all');
  readonly selectedRead = signal<NotificationReadFilter>('all');
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  readonly pageTitle = {
    fr: 'Notifications administrateur',
    en: 'Admin notifications',
    ar: 'إشعارات الإدارة',
  };
  readonly pageDescription = {
    fr: 'Suivez les inscriptions, les comptes, les messages et les changements de role.',
    en: 'Track registrations, accounts, messages, and role changes.',
    ar: 'تابع التسجيلات والحسابات والرسائل وتغييرات الأدوار.',
  };
  readonly unreadChipLabel = {
    fr: 'non lue(s)',
    en: 'unread',
    ar: 'غير مقروءة',
  };
  readonly markAllReadLabel = {
    fr: 'Tout marquer comme lu',
    en: 'Mark all as read',
    ar: 'تحديد الكل كمقروء',
  };
  readonly typeFilterLabel = {
    fr: 'Type de notification',
    en: 'Notification type',
    ar: 'نوع الإشعار',
  };
  readonly readFilterLabel = {
    fr: 'Etat de lecture',
    en: 'Read state',
    ar: 'حالة القراءة',
  };
  readonly loadingLabel = {
    fr: 'Chargement des notifications...',
    en: 'Loading notifications...',
    ar: 'جار تحميل الإشعارات...',
  };
  readonly openLabel = { fr: 'Ouvrir', en: 'Open', ar: 'فتح' };
  readonly markReadLabel = {
    fr: 'Marquer comme lue',
    en: 'Mark as read',
    ar: 'تحديد كمقروء',
  };
  readonly readStateLabel = { fr: 'Lue', en: 'Read', ar: 'مقروء' };
  readonly emptyLabel = {
    fr: 'Aucune notification pour ces filtres.',
    en: 'No notifications for these filters.',
    ar: 'لا توجد إشعارات وفق هذه الفلاتر.',
  };

  readonly typeFilters = computed<Array<{ value: NotificationFilterType; label: string }>>(() => [
    {
      value: 'all',
      label: this.site.localize({ fr: 'Toutes', en: 'All', ar: 'الكل' }),
    },
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
      label: this.site.localize({ fr: 'Comptes', en: 'Accounts', ar: 'الحسابات' }),
    },
    {
      value: 'message',
      label: this.site.localize({ fr: 'Messages', en: 'Messages', ar: 'الرسائل' }),
    },
    {
      value: 'role',
      label: this.site.localize({ fr: 'Roles', en: 'Roles', ar: 'الأدوار' }),
    },
  ]);

  readonly readFilters = computed<Array<{ value: NotificationReadFilter; label: string }>>(() => [
    {
      value: 'all',
      label: this.site.localize({ fr: 'Toutes', en: 'All', ar: 'الكل' }),
    },
    {
      value: 'unread',
      label: this.site.localize({ fr: 'Non lues', en: 'Unread', ar: 'غير مقروءة' }),
    },
    {
      value: 'read',
      label: this.site.localize({ fr: 'Lues', en: 'Read', ar: 'مقروءة' }),
    },
  ]);

  async ngOnInit() {
    if (!this.isAdmin()) {
      await this.router.navigateByUrl('/dashboard');
      return;
    }

    await this.loadNotifications();
  }

  async loadNotifications() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const notificationsResponse = await api.listAdminNotifications(token, {
        type: this.selectedType(),
        read: this.selectedRead(),
        limit: 50,
      });

      this.notifications.set(notificationsResponse.elements);
      this.unreadCount.set(notificationsResponse.unreadCount || 0);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur notifications.',
              en: 'Notifications error.',
              ar: 'خطأ في الإشعارات.',
            }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async selectType(value: NotificationFilterType) {
    if (value === this.selectedType()) {
      return;
    }

    this.selectedType.set(value);
    await this.loadNotifications();
  }

  async selectRead(value: NotificationReadFilter) {
    if (value === this.selectedRead()) {
      return;
    }

    this.selectedRead.set(value);
    await this.loadNotifications();
  }

  async markRead(notificationId: number) {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const cible = this.notifications().find((item) => item.id === notificationId);
      if (!cible || cible.estLue) {
        return;
      }

      await api.markAdminNotificationRead(token, notificationId);
      this.notifications.update((items) =>
        items.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                estLue: true,
                lueLe: new Date().toISOString(),
              }
            : item,
        ),
      );
      this.unreadCount.update((value) => Math.max(0, value - 1));
      this.statusMessage.set(
        this.site.localize({
          fr: 'Notification marquee comme lue.',
          en: 'Notification marked as read.',
          ar: 'تم تحديد الإشعار كمقروء.',
        }),
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Action impossible.',
              en: 'Action failed.',
              ar: 'تعذّر تنفيذ الإجراء.',
            }),
      );
    }
  }

  async markAllRead() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const result = await api.markAllAdminNotificationsRead(token);
      this.notifications.update((items) =>
        items.map((item) => ({
          ...item,
          estLue: true,
          lueLe: item.lueLe || new Date().toISOString(),
        })),
      );
      this.unreadCount.set(0);
      this.statusMessage.set(
        result.updatedCount > 0
          ? this.site.localize({
              fr: `${result.updatedCount} notification(s) marquee(s) comme lue(s).`,
              en: `${result.updatedCount} notification(s) marked as read.`,
              ar: `تم تحديد ${result.updatedCount} إشعار/إشعارات كمقروءة.`,
            })
          : this.site.localize({
              fr: 'Aucune notification a marquer.',
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
              ar: 'تعذّر تنفيذ الإجراء.',
            }),
      );
    }
  }

  async openNotificationLink(item: NotificationItem) {
    if (!item.lienDirect) {
      return;
    }

    await this.router.navigateByUrl(item.lienDirect);
  }

  categoryLabel(item: NotificationItem) {
    const categorie = this.resolveCategory(item);

    if (categorie === 'registration') {
      return this.site.localize({
        fr: 'Inscription',
        en: 'Registration',
        ar: 'تسجيل',
      });
    }

    if (categorie === 'account') {
      return this.site.localize({ fr: 'Compte', en: 'Account', ar: 'حساب' });
    }

    if (categorie === 'message') {
      return this.site.localize({ fr: 'Message', en: 'Message', ar: 'رسالة' });
    }

    if (categorie === 'role') {
      return this.site.localize({ fr: 'Role', en: 'Role', ar: 'دور' });
    }

    return this.site.localize({
      fr: 'Notification',
      en: 'Notification',
      ar: 'إشعار',
    });
  }

  notificationIcon(item: NotificationItem) {
    const categorie = this.resolveCategory(item);

    if (categorie === 'registration') {
      return this.icons.FileSearch;
    }

    if (categorie === 'account') {
      return this.icons.Shield;
    }

    if (categorie === 'message') {
      return this.icons.MessagesSquare;
    }

    if (categorie === 'role') {
      return this.icons.KeyRound;
    }

    return this.icons.Bell;
  }

  notificationIconContainerClass(item: NotificationItem) {
    const categorie = this.resolveCategory(item);

    if (categorie === 'registration') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700';
    }

    if (categorie === 'account') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700';
    }

    if (categorie === 'message') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700';
    }

    if (categorie === 'role') {
      return 'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-700';
    }

    return 'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground';
  }

  private resolveCategory(item: NotificationItem): AdminNotificationCategory | null {
    if (item.categorie) {
      return item.categorie;
    }

    if (item.typeNotification === 'NOUVELLE_INSCRIPTION') {
      return 'registration';
    }

    if (
      ['COMPTE_VALIDE', 'COMPTE_REJETE', 'COMPTE_DESACTIVE'].includes(
        item.typeNotification,
      )
    ) {
      return 'account';
    }

    if (item.typeNotification === 'NOUVEAU_MESSAGE') {
      return 'message';
    }

    if (item.typeNotification === 'SYSTEME') {
      return 'role';
    }

    return null;
  }
}
