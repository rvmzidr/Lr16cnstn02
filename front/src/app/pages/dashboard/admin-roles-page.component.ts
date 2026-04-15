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
import type { AdminAccountsList, Role, UtilisateurComplet } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { getInitials } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-admin-roles-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(rolesTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(rolesDescription) }}
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
            <h3 class="text-xl font-semibold text-foreground">{{ site.localize(assignmentsTitle) }}</h3>
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

              <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label class="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {{ site.localize(newRoleLabel) }}
                  </label>
                  <select
                    [(ngModel)]="selectedRoles[item.id]"
                    [name]="'role-' + item.id"
                    class="select-shell"
                  >
                    <option value="MEMBRE">{{ site.localize(roleMemberLabel) }}</option>
                    <option value="ADMINISTRATEUR">{{ site.localize(roleAdminLabel) }}</option>
                    <option value="CHEF_LABO">{{ site.localize(roleLabHeadLabel) }}</option>
                  </select>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn-outline"
                    [disabled]="!canChangeRole(item)"
                    (click)="changeRole(item)"
                  >
                    {{ site.localize(updateRoleLabel) }}
                  </button>
                </div>
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
export class AdminRolesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly accounts = signal<AdminAccountsList | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly selectedRoles: Record<string, Role> = {};
  readonly initials = getInitials;
  readonly rolesTitle = {
    fr: 'Gestion des roles',
    en: 'Roles & permissions',
    ar: 'الأدوار والصلاحيات',
  };
  readonly rolesDescription = {
    fr: 'Attribution et mise a jour des roles applicatifs.',
    en: 'Assign and update application roles.',
    ar: 'تعيين وتحديث أدوار التطبيق.',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un compte pour modifier son role...',
    en: 'Search an account to change its role...',
    ar: 'ابحث عن حساب لتغيير دوره...',
  };
  readonly assignmentsTitle = {
    fr: 'Attribution des roles',
    en: 'Role assignments',
    ar: 'تعيين الأدوار',
  };
  readonly accountsShownLabel = {
    fr: 'compte(s) affiche(s).',
    en: 'account(s) shown.',
    ar: 'حساب/حسابات معروضة.',
  };
  readonly newRoleLabel = { fr: 'Nouveau role', en: 'New role', ar: 'الدور الجديد' };
  readonly roleMemberLabel = { fr: 'MEMBRE', en: 'MEMBER', ar: 'عضو' };
  readonly roleAdminLabel = {
    fr: 'ADMINISTRATEUR',
    en: 'ADMINISTRATOR',
    ar: 'مسؤول',
  };
  readonly roleLabHeadLabel = {
    fr: 'CHEF_LABO',
    en: 'LAB_HEAD',
    ar: 'رئيس_مختبر',
  };
  readonly updateRoleLabel = {
    fr: 'Mettre a jour le role',
    en: 'Update role',
    ar: 'تحديث الدور',
  };
  readonly emptyLabel = {
    fr: 'Aucun compte disponible.',
    en: 'No account available.',
    ar: 'لا توجد حسابات متاحة.',
  };

  readonly summaryCards = computed(() => {
    const comptes = this.accounts()?.comptes || [];

    return [
      {
        label: this.site.localize({ fr: 'MEMBRE', en: 'MEMBER', ar: 'عضو' }),
        value: comptes.filter((item) => item.role === 'MEMBRE').length,
        meta: this.site.localize({
          fr: 'Role standard',
          en: 'Standard role',
          ar: 'دور قياسي',
        }),
      },
      {
        label: this.site.localize({
          fr: 'CHEF_LABO',
          en: 'LAB_HEAD',
          ar: 'رئيس_مختبر',
        }),
        value: comptes.filter((item) => item.role === 'CHEF_LABO').length,
        meta: this.site.localize({
          fr: 'Pilotage scientifique',
          en: 'Scientific leadership',
          ar: 'قيادة علمية',
        }),
      },
      {
        label: this.site.localize({
          fr: 'ADMINISTRATEUR',
          en: 'ADMINISTRATOR',
          ar: 'مسؤول',
        }),
        value: comptes.filter((item) => item.role === 'ADMINISTRATEUR').length,
        meta: this.site.localize({
          fr: 'Administration technique',
          en: 'Technical administration',
          ar: 'إدارة تقنية',
        }),
      },
      {
        label: this.site.localize({
          fr: 'Sans role',
          en: 'No role',
          ar: 'بدون دور',
        }),
        value: comptes.filter((item) => !item.role).length,
        meta: this.site.localize({
          fr: 'A regulariser',
          en: 'Needs assignment',
          ar: 'بحاجة إلى تعيين',
        }),
      },
    ];
  });

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

  canChangeRole(item: UtilisateurComplet) {
    return item.statut === 'ACTIF' || item.statut === 'DESACTIVE';
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

    return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'Member' });
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

      accounts.comptes.forEach((item) => {
        this.selectedRoles[item.id] = (item.role || 'MEMBRE') as Role;
      });
    } catch (error) {
      this.accounts.set(null);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur chargement roles.',
              en: 'Failed to load roles.',
              ar: 'تعذر تحميل الأدوار.',
            }),
      );
    }
  }

  async changeRole(item: UtilisateurComplet) {
    if (!this.canChangeRole(item)) {
      this.errorMessage.set(
        this.site.localize({
          fr: 'Le role ne peut etre modifie que pour un compte ACTIF ou DESACTIVE.',
          en: 'Role can be changed only for ACTIVE or DISABLED accounts.',
          ar: 'يمكن تغيير الدور فقط للحسابات النشطة أو المعطلة.',
        }),
      );
      return;
    }

    const commentaire =
      window.prompt(
        this.site.localize({
          fr: 'Commentaire optionnel pour le changement de role :',
          en: 'Optional comment for the role change:',
          ar: 'تعليق اختياري لتغيير الدور:',
        }),
        this.site.localize({
          fr: 'Mise a jour du role par administration technique.',
          en: 'Role updated by technical administration.',
          ar: 'تم تحديث الدور بواسطة الإدارة التقنية.',
        }),
      )?.trim() || undefined;

    try {
      await api.changeAccountRole(this.token, item.id, {
        role: this.selectedRoles[item.id] || 'MEMBRE',
        commentaire,
      });
      this.statusMessage.set(
        this.site.localize({ fr: 'Role modifie.', en: 'Role updated.', ar: 'تم تحديث الدور.' }),
      );
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors du changement de role.',
              en: 'Role change failed.',
              ar: 'فشل تغيير الدور.',
            }),
      );
    }
  }
}
