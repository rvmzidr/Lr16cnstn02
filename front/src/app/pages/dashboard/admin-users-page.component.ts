import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { AdminAccountsList } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { getInitials } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(usersTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(usersDescription) }}
          </p>
        </div>
      </div>

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="app-kpi-card">
            <p class="app-kpi-card__label">{{ card.label }}</p>
            <p class="app-kpi-card__value">{{ card.value }}</p>
            <p class="app-kpi-card__meta">{{ card.meta }}</p>
          </article>
        }
      </section>

      <section class="surface-card p-5">
        <div class="relative">
          <lucide-icon
            [img]="icons.Search"
            class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          ></lucide-icon>
          <input
            class="input-shell pl-11"
            [placeholder]="site.localize(searchPlaceholder)"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
        </div>
      </section>

      <section class="surface-card p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold text-foreground">{{ site.localize(accountsTitle) }}</h3>
            <p class="text-sm text-muted-foreground">
              {{ filteredAccounts().length }} {{ site.localize(accountsShownLabel) }}
            </p>
          </div>
        </div>

        <div class="space-y-3">
          @for (item of filteredAccounts(); track item.id) {
            <div class="rounded-2xl border border-border bg-card p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span
                    class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-secondary-foreground"
                  >
                    {{ initials(item.nomComplet) }}
                  </span>

                  <div class="min-w-0">
                    <p class="truncate font-semibold text-foreground">{{ item.nomComplet }}</p>
                    <p class="truncate text-sm text-muted-foreground">
                      {{ item.emailInstitutionnel }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <span [class]="roleBadgeClass(item.role)">{{ formatRole(item.role) }}</span>
                      <span [class]="statusBadgeClass(item.statut)">{{ statusLabel(item.statut) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                @if (item.actif) {
                  <button type="button" class="btn-outline" (click)="deactivate(item.id)">
                    {{ site.localize(deactivateLabel) }}
                  </button>
                } @else {
                  <button type="button" class="btn-secondary" (click)="activate(item.id)">
                    {{ site.localize(activateLabel) }}
                  </button>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">{{ site.localize(emptyLabel) }}</div>
          }
        </div>
      </section>

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class AdminUsersPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly accounts = signal<AdminAccountsList | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly initials = getInitials;
  readonly usersTitle = {
    fr: 'Gestion des utilisateurs',
    en: 'Users management',
    ar: 'إدارة المستخدمين',
  };
  readonly usersDescription = {
    fr: 'Activation, desactivation et supervision technique des comptes.',
    en: 'Activation, deactivation, and technical supervision of accounts.',
    ar: 'تفعيل وتعطيل الحسابات والإشراف التقني عليها.',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un utilisateur (nom, email, role, statut)...',
    en: 'Search a user (name, email, role, status)...',
    ar: 'ابحث عن مستخدم (الاسم، البريد، الدور، الحالة)...',
  };
  readonly accountsTitle = {
    fr: 'Comptes',
    en: 'Accounts',
    ar: 'الحسابات',
  };
  readonly accountsShownLabel = {
    fr: 'compte(s) affiche(s).',
    en: 'account(s) shown.',
    ar: 'حساب/حسابات معروضة.',
  };
  readonly activateLabel = { fr: 'Activer', en: 'Activate', ar: 'تفعيل' };
  readonly deactivateLabel = {
    fr: 'Desactiver',
    en: 'Deactivate',
    ar: 'تعطيل',
  };
  readonly emptyLabel = {
    fr: 'Aucun compte disponible.',
    en: 'No account available.',
    ar: 'لا توجد حسابات متاحة.',
  };

  readonly summaryCards = computed(() => [
    {
      label: this.site.localize({
        fr: 'Comptes actifs',
        en: 'Active accounts',
        ar: 'حسابات نشطة',
      }),
      value: this.accounts()?.statistiques.actifs || 0,
      meta: this.site.localize({
        fr: 'Acces autorises',
        en: 'Access enabled',
        ar: 'وصول مفعّل',
      }),
    },
    {
      label: this.site.localize({
        fr: 'Comptes desactives',
        en: 'Disabled accounts',
        ar: 'حسابات معطلة',
      }),
      value: this.accounts()?.statistiques.desactives || 0,
      meta: this.site.localize({
        fr: 'Acces suspendus',
        en: 'Access suspended',
        ar: 'وصول موقوف',
      }),
    },
    {
      label: this.site.localize({
        fr: 'Doctorants actifs',
        en: 'Active PhD students',
        ar: 'دكتوراه نشطة',
      }),
      value: this.accounts()?.statistiques.doctorants || 0,
      meta: this.site.localize({
        fr: 'Population suivie',
        en: 'Tracked population',
        ar: 'الفئة المتابعة',
      }),
    },
    {
      label: this.site.localize({
        fr: 'Total comptes',
        en: 'Total accounts',
        ar: 'إجمالي الحسابات',
      }),
      value: this.accounts()?.statistiques.total || 0,
      meta: this.site.localize({
        fr: 'Tous statuts confondus',
        en: 'All statuses combined',
        ar: 'جميع الحالات',
      }),
    },
  ]);

  readonly filteredAccounts = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const accounts = this.accounts()?.comptes || [];

    if (!q) {
      return accounts;
    }

    return accounts.filter((item) =>
      [item.nomComplet, item.emailInstitutionnel, item.role || '', item.statut]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  async ngOnInit() {
    await this.loadData();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  roleBadgeClass(role: string | null) {
    if (role === 'CHEF_LABO') {
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700';
    }

    if (role === 'ADMINISTRATEUR') {
      return 'inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700';
    }

    return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground';
  }

  formatRole(role: string | null) {
    if (role === 'CHEF_LABO') {
      return this.site.localize({
        fr: 'Chef de labo',
        en: 'Lab head',
        ar: 'رئيس المختبر',
      });
    }

    if (role === 'ADMINISTRATEUR') {
      return this.site.localize({
        fr: 'Administrateur',
        en: 'Administrator',
        ar: 'مسؤول',
      });
    }

    return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'عضو' });
  }

  statusLabel(status: string) {
    if (status === 'ACTIF') {
      return this.site.localize({ fr: 'Actif', en: 'Active', ar: 'نشط' });
    }

    if (status === 'EN_ATTENTE') {
      return this.site.localize({ fr: 'En attente', en: 'Pending', ar: 'قيد الانتظار' });
    }

    if (status === 'REJETE') {
      return this.site.localize({ fr: 'Rejete', en: 'Rejected', ar: 'مرفوض' });
    }

    if (status === 'DESACTIVE') {
      return this.site.localize({ fr: 'Desactive', en: 'Disabled', ar: 'معطل' });
    }

    return status;
  }

  statusBadgeClass(status: string) {
    if (status === 'ACTIF') {
      return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
    }

    if (status === 'EN_ATTENTE') {
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700';
    }

    return 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700';
  }

  async loadData() {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');

    try {
      const accounts = await api.listAdminAccounts(this.token, { limit: 120 });
      this.accounts.set(accounts);
    } catch (error) {
      this.accounts.set(null);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur chargement utilisateurs.',
              en: 'Failed to load users.',
              ar: 'تعذر تحميل المستخدمين.',
            }),
      );
    }
  }

  async activate(userId: string) {
    try {
      await api.activateAccount(this.token, userId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Compte active.',
          en: 'Account activated.',
          ar: 'تم تفعيل الحساب.',
        }),
      );
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: "Erreur lors de l'activation.",
              en: 'Activation failed.',
              ar: 'فشل التفعيل.',
            }),
      );
    }
  }

  async deactivate(userId: string) {
    try {
      await api.deactivateAccount(this.token, userId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Compte desactive.',
          en: 'Account deactivated.',
          ar: 'تم تعطيل الحساب.',
        }),
      );
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la desactivation.',
              en: 'Deactivation failed.',
              ar: 'فشل التعطيل.',
            }),
      );
    }
  }
}
