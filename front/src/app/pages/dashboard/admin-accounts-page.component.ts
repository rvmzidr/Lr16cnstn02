import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  AdminAccountsList,
  AdminRegistrationList,
  Role,
  UtilisateurComplet,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';

@Component({
  selector: 'app-admin-accounts-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(adminTitle) }}</h2>
          <p class="app-page-description">{{ site.localize(adminIntro) }}</p>
        </div>
      </div>

      <section class="app-kpi-grid">
        @for (card of summaryCards(); track card.label) {
          <div class="app-kpi-card">
            <div class="app-kpi-card__label">{{ card.label }}</div>
            <div class="app-kpi-card__value">{{ card.value }}</div>
            <div class="app-kpi-card__meta">{{ card.meta }}</div>
          </div>
        }
      </section>

      <section class="surface-card overflow-hidden">
        <div class="border-b border-border px-6 py-5">
          <h3 class="text-xl font-semibold text-foreground">
            Inscriptions en attente
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ registrations()?.statistiques?.enAttente || 0 }}
            {{ site.localize(pendingFilesLabel) }}
          </p>
        </div>

        <div class="app-data-table-wrap rounded-none border-0 shadow-none">
          <table class="table-shell">
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Role cible</th>
                <th>Dossier</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (
                item of registrations()?.inscriptions || [];
                track item.id
              ) {
                <tr>
                  <td>
                    <div class="font-semibold text-foreground">
                      {{ item.nomComplet }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ item.emailInstitutionnel }}
                    </div>
                  </td>
                  <td class="w-52">
                    <select
                      [(ngModel)]="selectedRoles[item.id]"
                      [name]="'role-' + item.id"
                      class="select-shell min-w-44"
                    >
                      @for (
                        role of registrations()?.rolesDisponibles || [];
                        track role
                      ) {
                        <option [value]="role">{{ role }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <div class="badge-soft">
                      {{
                        item.doctorat?.attestation?.disponible
                          ? 'Attestation disponible'
                          : 'Sans attestation'
                      }}
                    </div>
                    <div class="mt-2 text-xs text-muted-foreground">
                      {{ item.statut }}
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        class="btn-secondary"
                        (click)="validate(item)"
                      >
                        {{ site.localize(validateLabel) }}
                      </button>
                      <button
                        type="button"
                        class="btn-outline"
                        (click)="refuse(item)"
                      >
                        {{ site.localize(refuseLabel) }}
                      </button>
                      @if (item.doctorat?.attestation?.disponible) {
                        <button
                          type="button"
                          class="btn-outline"
                          (click)="downloadAttestation(item.id)"
                        >
                          {{ site.localize(attestationLabel) }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">
                    <div class="empty-state m-4">
                      Aucune inscription en attente pour le moment.
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="surface-card overflow-hidden">
        <div class="border-b border-border px-6 py-5">
          <h3 class="text-xl font-semibold text-foreground">
            {{ site.localize(accountsTitle) }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ accounts()?.statistiques?.total || 0 }}
            {{ site.localize(accountsSyncedLabel) }}
          </p>
        </div>

        <div class="app-data-table-wrap rounded-none border-0 shadow-none">
          <table class="table-shell">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Role</th>
                <th>Etat</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of accounts()?.comptes || []; track item.id) {
                <tr>
                  <td>
                    <div class="font-semibold text-foreground">
                      {{ item.nomComplet }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ item.emailInstitutionnel }}
                    </div>
                  </td>
                  <td class="w-56">
                    <select
                      [(ngModel)]="selectedRoles[item.id]"
                      [name]="'account-role-' + item.id"
                      class="select-shell min-w-44"
                    >
                      <option value="MEMBRE">MEMBRE</option>
                      <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
                      <option value="CHEF_LABO">CHEF_LABO</option>
                    </select>
                  </td>
                  <td>
                    <div class="badge-soft">{{ item.statut }}</div>
                    <div class="mt-2 text-xs text-muted-foreground">
                      {{
                        item.actif
                          ? site.localize(activeAccountLabel)
                          : site.localize(inactiveAccountLabel)
                      }}
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        class="btn-outline"
                        (click)="changeRole(item)"
                      >
                        {{ site.localize(changeRoleLabel) }}
                      </button>
                      @if (item.actif) {
                        <button
                          type="button"
                          class="btn-outline"
                          (click)="deactivate(item.id)"
                        >
                          {{ site.localize(deactivateLabel) }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="btn-secondary"
                          (click)="activate(item.id)"
                        >
                          {{ site.localize(activateLabel) }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">
                    <div class="empty-state m-4">Aucun compte disponible.</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (statusMessage()) {
        <div
          class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success"
        >
          {{ statusMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div
          class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error"
        >
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class AdminAccountsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly registrations = signal<AdminRegistrationList | null>(null);
  readonly accounts = signal<AdminAccountsList | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedRoles: Record<string, Role> = {};
  readonly adminTitle = {
    fr: 'Administration',
    en: 'Administration',
    ar: 'الإدارة',
  };
  readonly adminIntro = {
    fr: 'Valider les inscriptions, ajuster les rôles et gérer l activation des comptes.',
    en: 'Validate registrations, adjust roles, and manage account activation.',
    ar: 'اعتمد التسجيلات وعدّل الأدوار وأدر تفعيل الحسابات.',
  };
  readonly pendingFilesLabel = {
    fr: 'dossier(s) à traiter',
    en: 'file(s) to process',
    ar: 'ملف(ات) للمعالجة',
  };
  readonly validateLabel = { fr: 'Valider', en: 'Validate', ar: 'اعتماد' };
  readonly refuseLabel = { fr: 'Refuser', en: 'Refuse', ar: 'رفض' };
  readonly attestationLabel = {
    fr: 'Attestation',
    en: 'Certificate',
    ar: 'شهادة',
  };
  readonly accountsTitle = {
    fr: 'Comptes du laboratoire',
    en: 'Laboratory accounts',
    ar: 'حسابات المختبر',
  };
  readonly accountsSyncedLabel = {
    fr: 'compte(s) synchronisés avec la plateforme.',
    en: 'account(s) synced with the platform.',
    ar: 'حساب(ات) متزامنة مع المنصة.',
  };
  readonly activeAccountLabel = {
    fr: 'Compte actif',
    en: 'Active account',
    ar: 'حساب نشط',
  };
  readonly inactiveAccountLabel = {
    fr: 'Compte inactif',
    en: 'Inactive account',
    ar: 'حساب غير نشط',
  };
  readonly changeRoleLabel = {
    fr: 'Changer le rôle',
    en: 'Change role',
    ar: 'تغيير الدور',
  };
  readonly deactivateLabel = {
    fr: 'Désactiver',
    en: 'Deactivate',
    ar: 'تعطيل',
  };
  readonly activateLabel = { fr: 'Activer', en: 'Activate', ar: 'تفعيل' };

  readonly summaryCards = computed(() => [
    {
      label: 'Inscriptions en attente',
      value: this.registrations()?.statistiques.enAttente || 0,
      meta: 'Flux de validation courant',
    },
    {
      label: 'Doctorants a verifier',
      value: this.registrations()?.statistiques.doctorantsEnAttente || 0,
      meta: 'Dossiers doctorants en attente',
    },
    {
      label: 'Attestations disponibles',
      value: this.registrations()?.statistiques.attestationsDisponibles || 0,
      meta: 'Pieces jointes telechargeables',
    },
    {
      label: 'Comptes actifs',
      value: this.accounts()?.statistiques.actifs || 0,
      meta: `${this.accounts()?.statistiques.total || 0} compte(s) au total`,
    },
  ]);

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const [registrations, accounts] = await Promise.all([
        api.listAdminRegistrations(token, { statut: 'EN_ATTENTE', limit: 20 }),
        api.listAdminAccounts(token, { limit: 50 }),
      ]);
      this.registrations.set(registrations);
      this.accounts.set(accounts);
      [...registrations.inscriptions, ...accounts.comptes].forEach((item) => {
        this.selectedRoles[item.id] = (item.role || 'MEMBRE') as Role;
      });
    } catch {
      this.registrations.set(null);
      this.accounts.set(null);
    }
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async validate(item: UtilisateurComplet) {
    try {
      await api.validateRegistration(this.token, item.id, {
        role: this.selectedRoles[item.id] || 'MEMBRE',
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Inscription validée.',
          en: 'Registration validated.',
          ar: 'تم اعتماد التسجيل.',
        }),
      );
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la validation.',
              en: 'Validation error.',
              ar: 'خطأ أثناء الاعتماد.',
            }),
      );
    }
  }

  async refuse(item: UtilisateurComplet) {
    try {
      await api.refuseRegistration(this.token, item.id, {
        motifRejet: 'Dossier incomplet ou a completer.',
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Inscription refusée.',
          en: 'Registration refused.',
          ar: 'تم رفض التسجيل.',
        }),
      );
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors du refus.',
              en: 'Refusal error.',
              ar: 'خطأ أثناء الرفض.',
            }),
      );
    }
  }

  async changeRole(item: UtilisateurComplet) {
    try {
      await api.changeAccountRole(this.token, item.id, {
        role: this.selectedRoles[item.id] || 'MEMBRE',
      });
      this.statusMessage.set('Role modifie.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Erreur lors du changement de role.',
      );
    }
  }

  async activate(userId: string) {
    try {
      await api.activateAccount(this.token, userId);
      this.statusMessage.set('Compte active.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : "Erreur lors de l'activation.",
      );
    }
  }

  async deactivate(userId: string) {
    try {
      await api.deactivateAccount(this.token, userId);
      this.statusMessage.set('Compte desactive.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la desactivation.',
      );
    }
  }

  async downloadAttestation(userId: string) {
    await api.downloadAdminDoctorantAttestation(this.token, userId);
  }
}
