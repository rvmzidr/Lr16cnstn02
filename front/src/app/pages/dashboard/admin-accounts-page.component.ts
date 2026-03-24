
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AdminAccountsList, AdminRegistrationList, Role, UtilisateurComplet } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';

@Component({
  selector: 'app-admin-accounts-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div>
        <h2 class="text-4xl font-bold text-foreground">Administration</h2>
        <p class="text-lg text-muted-foreground">Valider les inscriptions, ajuster les roles et gerer les comptes.</p>
      </div>

      <section class="surface-card p-8">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-3xl font-bold text-foreground">Inscriptions en attente</h3>
            <p class="text-muted-foreground">{{ registrations()?.statistiques?.enAttente || 0 }} dossier(s) a traiter</p>
          </div>
        </div>
        <div class="space-y-4">
          @for (item of registrations()?.inscriptions || []; track item.id) {
            <div class="rounded-2xl border border-border/50 p-5">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="text-xl font-semibold text-foreground">{{ item.nomComplet }}</div>
                  <div class="text-sm text-muted-foreground">{{ item.emailInstitutionnel }}</div>
                </div>
                <div class="flex flex-wrap gap-3">
                  <select [(ngModel)]="selectedRoles[item.id]" [name]="'role-' + item.id" class="select-shell min-w-44">
                    @for (role of registrations()?.rolesDisponibles || []; track role) { <option [value]="role">{{ role }}</option> }
                  </select>
                  <button type="button" class="btn-secondary" (click)="validate(item)">Valider</button>
                  <button type="button" class="btn-outline" (click)="refuse(item)">Refuser</button>
                  @if (item.doctorat?.attestation?.disponible) {
                    <button type="button" class="btn-outline" (click)="downloadAttestation(item.id)">Attestation</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="surface-card p-8">
        <h3 class="text-3xl font-bold text-foreground">Comptes actifs</h3>
        <div class="mt-6 space-y-4">
          @for (item of accounts()?.comptes || []; track item.id) {
            <div class="rounded-2xl border border-border/50 p-5">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="text-xl font-semibold text-foreground">{{ item.nomComplet }}</div>
                  <div class="text-sm text-muted-foreground">{{ item.emailInstitutionnel }} • {{ item.role || 'AUCUN' }} • {{ item.statut }}</div>
                </div>
                <div class="flex flex-wrap gap-3">
                  <select [(ngModel)]="selectedRoles[item.id]" [name]="'account-role-' + item.id" class="select-shell min-w-44">
                    <option value="MEMBRE">MEMBRE</option>
                    <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
                    <option value="CHEF_LABO">CHEF_LABO</option>
                  </select>
                  <button type="button" class="btn-outline" (click)="changeRole(item)">Changer le role</button>
                  @if (item.actif) {
                    <button type="button" class="btn-outline" (click)="deactivate(item.id)">Desactiver</button>
                  } @else {
                    <button type="button" class="btn-secondary" (click)="activate(item.id)">Activer</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </section>

      @if (statusMessage()) { <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">{{ statusMessage() }}</div> }
      @if (errorMessage()) { <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">{{ errorMessage() }}</div> }
    </div>
  `
})
export class AdminAccountsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly registrations = signal<AdminRegistrationList | null>(null);
  readonly accounts = signal<AdminAccountsList | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedRoles: Record<string, Role> = {};

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const [registrations, accounts] = await Promise.all([
        api.listAdminRegistrations(token, { statut: 'EN_ATTENTE', limit: 20 }),
        api.listAdminAccounts(token, { limit: 50 })
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
      await api.validateRegistration(this.token, item.id, { role: this.selectedRoles[item.id] || 'MEMBRE' });
      this.statusMessage.set('Inscription validee.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la validation.');
    }
  }

  async refuse(item: UtilisateurComplet) {
    try {
      await api.refuseRegistration(this.token, item.id, { motifRejet: 'Dossier incomplet ou a completer.' });
      this.statusMessage.set('Inscription refusee.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors du refus.');
    }
  }

  async changeRole(item: UtilisateurComplet) {
    try {
      await api.changeAccountRole(this.token, item.id, { role: this.selectedRoles[item.id] || 'MEMBRE' });
      this.statusMessage.set('Role modifie.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors du changement de role.');
    }
  }

  async activate(userId: string) {
    try {
      await api.activateAccount(this.token, userId);
      this.statusMessage.set('Compte active.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de l\'activation.');
    }
  }

  async deactivate(userId: string) {
    try {
      await api.deactivateAccount(this.token, userId);
      this.statusMessage.set('Compte desactive.');
      await this.ngOnInit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur lors de la desactivation.');
    }
  }

  async downloadAttestation(userId: string) {
    await api.downloadAdminDoctorantAttestation(this.token, userId);
  }
}
