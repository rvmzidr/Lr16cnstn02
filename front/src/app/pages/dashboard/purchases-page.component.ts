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
import type { Project, PurchaseRequest } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(purchasesTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(purchasesDescription) }}
          </p>
        </div>
        @if (canCreateRequest()) {
          <button class="btn-primary" (click)="startNewRequest()">
            {{ site.localize(newRequestLabel) }}
          </button>
        }
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

      <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div
          class="surface-card space-y-4 p-6"
          [id]="formAnchorId"
        >
          <div class="relative">
            <lucide-icon
              [img]="icons.Search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></lucide-icon>
            <input
              class="input-shell pl-11"
              [placeholder]="site.localize(searchPlaceholder)"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
            />
          </div>

          <div class="space-y-3">
            @for (request of filteredRequests(); track request.id) {
              <div class="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="font-semibold text-foreground">{{ request.objet }}</div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ request.projetTitre || 'Projet non renseigne' }}
                    </div>
                  </div>

                  <span [class]="statusBadgeClass(request.statut)">
                    {{ request.statut }}
                  </span>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-xl bg-muted/40 px-3 py-2">
                    <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Demandeur</p>
                    <p class="mt-1 text-sm font-medium text-foreground">
                      {{ request.creePar?.nomComplet || 'Non renseigne' }}
                    </p>
                  </div>
                  <div class="rounded-xl bg-muted/40 px-3 py-2">
                    <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">Montant</p>
                    <p class="mt-1 text-sm font-medium text-foreground">
                      {{ request.estimationCout !== null ? formatCurrency(request.estimationCout) : 'N/A' }}
                    </p>
                  </div>
                </div>

                <div class="mt-3 text-xs text-muted-foreground">
                  Cree le {{ formatDate(request.creeLe) }}
                </div>

                <div class="mt-2 text-sm text-muted-foreground">{{ request.description }}</div>

                @if (request.pieceJointe) {
                  <button
                    type="button"
                    class="btn-outline mt-3"
                    (click)="downloadAttachment(request)"
                  >
                    Piece jointe
                  </button>
                }

                @if (isLabHead() && request.statut === 'EN_ATTENTE') {
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="btn-secondary" (click)="decide(request.id, 'ACCEPTER')">
                      Accepter
                    </button>
                    <button type="button" class="btn-outline" (click)="decide(request.id, 'REJETER')">
                      Rejeter
                    </button>
                  </div>
                } @else if (isLabHead() && request.statut === 'ACCEPTEE') {
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="btn-outline" (click)="moveStatus(request.id, 'EN_COURS_TRAITEMENT')">
                      Passer en cours
                    </button>
                    <button type="button" class="btn-outline" (click)="moveStatus(request.id, 'COMMANDEE')">
                      Marquer commandee
                    </button>
                    <button type="button" class="btn-outline" (click)="moveStatus(request.id, 'LIVREE')">
                      Marquer livree
                    </button>
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-state">Aucune demande d'achat.</div>
            }
          </div>
        </div>

        <div class="surface-card space-y-4 p-6">
          <h3 class="text-xl font-semibold text-foreground">Nouvelle demande</h3>

          @if (canCreateRequest()) {
            <select class="select-shell" [(ngModel)]="form.projetId">
              <option value="">Choisir un projet</option>
              @for (project of projects(); track project.id) {
                <option [value]="project.id">{{ project.titre }}</option>
              }
            </select>
            <input class="input-shell" placeholder="Objet" [(ngModel)]="form.objet" />
            <textarea
              class="textarea-shell"
              placeholder="Description"
              [(ngModel)]="form.description"
            ></textarea>
            <textarea
              class="textarea-shell"
              placeholder="Justification scientifique"
              [(ngModel)]="form.justificationScientifique"
            ></textarea>
            <div class="grid gap-3 sm:grid-cols-2">
              <input type="number" min="1" class="input-shell" [(ngModel)]="form.quantite" />
              <input
                type="number"
                min="0"
                step="0.001"
                class="input-shell"
                placeholder="Cout estime"
                [(ngModel)]="form.estimationCout"
              />
            </div>
            <label class="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" [(ngModel)]="form.urgente" />
              Demande urgente
            </label>
            <input type="file" class="input-shell" (change)="onAttachmentSelected($event)" />
            @if (selectedAttachmentName()) {
              <div class="text-xs text-muted-foreground">{{ selectedAttachmentName() }}</div>
            }
            <button type="button" class="btn-secondary" (click)="createRequest()">
              Soumettre la demande
            </button>
          } @else {
            <div class="empty-state">Les actions de decision sont disponibles dans la liste.</div>
          }
        </div>
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
export class PurchasesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly requests = signal<PurchaseRequest[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly search = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedAttachmentName = signal('');
  readonly formatDate = formatDate;
  selectedAttachment: File | null = null;
  form = {
    projetId: '',
    objet: '',
    description: '',
    quantite: 1,
    estimationCout: '',
    justificationScientifique: '',
    urgente: false,
  };
  readonly formAnchorId = 'purchase-request-form';
  readonly role = computed(
    () => this.auth.session()?.utilisateur.role || 'MEMBRE',
  );
  readonly isLabHead = computed(
    () => this.role() === 'CHEF_LABO',
  );
  readonly canCreateRequest = computed(() => this.role() === 'MEMBRE');
  readonly filteredRequests = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) {
      return this.requests();
    }

    return this.requests().filter((request) =>
      [request.objet, request.description, request.projetTitre || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });
  readonly summaryCards = computed(() => {
    const requests = this.requests();
    const pending = requests.filter((item) => item.statut === 'EN_ATTENTE').length;
    const approved = requests.filter((item) => item.statut === 'ACCEPTEE').length;
    const delivered = requests.filter((item) => item.statut === 'LIVREE').length;
    const totalAmount = requests.reduce(
      (sum, item) => sum + (item.estimationCout ?? 0),
      0,
    );

    return [
      {
        label: 'Demandes totales',
        value: requests.length,
        meta: 'Historique global',
      },
      {
        label: 'En attente',
        value: pending,
        meta: 'A traiter prioritairement',
      },
      {
        label: 'Approuvees',
        value: approved,
        meta: 'Decision favorable',
      },
      {
        label: 'Montant cumule',
        value: this.formatCurrency(totalAmount),
        meta: 'Estimation des demandes',
      },
    ];
  });
  readonly purchasesTitle = {
    fr: 'Demandes d achat',
    en: 'Purchase requests',
    ar: 'طلبات الشراء',
  };
  readonly purchasesDescription = {
    fr: 'Créer une demande liée à un projet, suivre son statut et traiter les décisions.',
    en: 'Create a project-linked request, track its status, and process decisions.',
    ar: 'إنشاء طلب مرتبط بمشروع وتتبع الحالة ومعالجة القرارات.',
  };
  readonly newRequestLabel = {
    fr: 'Nouvelle demande',
    en: 'New request',
    ar: 'طلب جديد',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher par matériel ou demandeur...',
    en: 'Search by equipment or requester...',
    ar: 'ابحث حسب المعدّات أو مقدم الطلب...',
  };
  async ngOnInit() {
    await this.loadData();
  }

  startNewRequest() {
    this.errorMessage.set('');
    this.statusMessage.set(
      "Remplissez le formulaire puis cliquez sur 'Soumettre la demande'.",
    );
    const section = document.getElementById(this.formAnchorId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async loadData() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const [requestsResponse, projectsResponse] = await Promise.all([
        api.listPurchaseRequests(token, { limit: 50 }),
        api.listProjects(token, { limit: 50 }),
      ]);
      this.requests.set(requestsResponse.elements);
      this.projects.set(projectsResponse.elements);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur demandes.');
    }
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 3,
    }).format(value);
  }

  statusBadgeClass(status: string) {
    switch (status) {
      case 'ACCEPTEE':
        return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
      case 'EN_ATTENTE':
        return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700';
      case 'REJETEE':
        return 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700';
      case 'LIVREE':
        return 'inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700';
      default:
        return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground';
    }
  }

  onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedAttachment = input.files?.[0] || null;
    this.selectedAttachmentName.set(this.selectedAttachment?.name || '');
  }

  async createRequest() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    if (!this.form.projetId) {
      this.errorMessage.set('Veuillez selectionner un projet.');
      return;
    }
    if (!this.form.objet.trim()) {
      this.errorMessage.set("Veuillez renseigner l'objet de la demande.");
      return;
    }
    if (!this.form.description.trim()) {
      this.errorMessage.set('Veuillez renseigner une description.');
      return;
    }
    if (!this.form.justificationScientifique.trim()) {
      this.errorMessage.set('La justification scientifique est obligatoire.');
      return;
    }
    if (!Number.isFinite(this.form.quantite) || this.form.quantite < 1) {
      this.errorMessage.set('La quantite doit etre superieure ou egale a 1.');
      return;
    }

    const payload = new FormData();
    payload.set('projetId', this.form.projetId);
    payload.set('objet', this.form.objet);
    payload.set('description', this.form.description);
    payload.set('quantite', String(this.form.quantite));
    payload.set('justificationScientifique', this.form.justificationScientifique);
    payload.set('urgente', String(this.form.urgente));
    if (this.form.estimationCout) {
      payload.set('estimationCout', this.form.estimationCout);
    }
    if (this.selectedAttachment) {
      payload.set('pieceJointe', this.selectedAttachment);
    }

    try {
      await api.createPurchaseRequest(token, payload);
      this.statusMessage.set('Demande créée.');
      this.form = {
        projetId: '',
        objet: '',
        description: '',
        quantite: 1,
        estimationCout: '',
        justificationScientifique: '',
        urgente: false,
      };
      this.selectedAttachment = null;
      this.selectedAttachmentName.set('');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Creation impossible.');
    }
  }

  async decide(requestId: number, decision: 'ACCEPTER' | 'REJETER') {
    const token = this.auth.session()?.accessToken;
    if (!token || !this.isLabHead()) {
      return;
    }

    const commentaire =
      decision === 'REJETER'
        ? 'Demande rejetee: justification complementaire requise.'
        : undefined;

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await api.decidePurchaseRequest(token, requestId, { decision, commentaire });
      this.statusMessage.set('Decision enregistree.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Decision impossible.');
    }
  }

  async moveStatus(requestId: number, statut: string) {
    const token = this.auth.session()?.accessToken;
    if (!token || !this.isLabHead()) {
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    try {
      await api.updatePurchaseStatus(token, requestId, { statut });
      this.statusMessage.set('Statut mis a jour.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Mise a jour impossible.');
    }
  }

  async downloadAttachment(request: PurchaseRequest) {
    const token = this.auth.session()?.accessToken;
    if (!token || !request.pieceJointe) {
      return;
    }

    await api.downloadPurchaseAttachment(token, request.id);
  }
}
