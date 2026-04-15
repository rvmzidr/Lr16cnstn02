import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartData,
  ArcElement,
  Chart,
  Legend,
  Tooltip,
} from 'chart.js';
import { LucideAngularModule } from 'lucide-angular';
import type { PurchaseRequest } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

Chart.register(ArcElement, Tooltip, Legend);

type BudgetCategory = {
  key: string;
  label: string;
  allocated: number;
  spent: number;
  color: string;
};

@Component({
  selector: 'app-budget-page',
  standalone: true,
  imports: [LucideAngularModule, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Budget</h2>
          <p class="app-page-description">
            Suivi budgetaire chef de labo: total, depenses, restant, et progression par rubrique.
          </p>
        </div>
      </div>

      @if (!roleService.isChef()) {
        <section class="surface-card p-8">
          <p class="text-sm text-muted-foreground">
            Cette section est reservee au chef de laboratoire.
          </p>
        </section>
      } @else {
        <section class="app-kpi-grid">
          @for (card of summaryCards(); track card.label) {
            <article class="app-kpi-card">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="app-kpi-card__label">{{ card.label }}</p>
                  <p class="app-kpi-card__value">{{ card.value }}</p>
                  <p class="app-kpi-card__meta">{{ card.meta }}</p>
                </div>
                <span [class]="card.badgeClass">
                  <lucide-icon [img]="card.icon" class="h-4 w-4"></lucide-icon>
                </span>
              </div>
            </article>
          }
        </section>

        <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article class="surface-card p-6">
            <h3 class="text-xl font-semibold text-foreground">Repartition budgetaire</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Vue des depenses cumulees par categorie.
            </p>

            <div class="mt-5 h-[280px]">
              <canvas
                baseChart
                [data]="pieChartData()"
                [options]="pieChartOptions"
                [type]="'pie'"
              ></canvas>
            </div>
          </article>

          <article class="surface-card p-6">
            <h3 class="text-xl font-semibold text-foreground">Detail par categorie</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Allocation et consommation budgetaire avec progression.
            </p>

            <div class="mt-5 space-y-4">
              @for (cat of categories(); track cat.key) {
                <div class="rounded-2xl border border-border bg-card p-4">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex h-2.5 w-2.5 rounded-full"
                        [style.background]="cat.color"
                      ></span>
                      <span class="font-medium text-foreground">{{ cat.label }}</span>
                    </div>
                    <span class="text-sm text-muted-foreground">
                      {{ formatCurrency(cat.spent) }} / {{ formatCurrency(cat.allocated) }}
                    </span>
                  </div>

                  <div class="h-2 rounded-full bg-muted">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      [style.background]="cat.color"
                      [style.width.%]="progress(cat.spent, cat.allocated)"
                    ></div>
                  </div>

                  <div class="mt-2 text-xs text-muted-foreground">
                    {{ progress(cat.spent, cat.allocated) }}% consomme
                  </div>
                </div>
              }
            </div>
          </article>
        </section>

        <section class="surface-card p-6">
          <h3 class="text-xl font-semibold text-foreground">Synthese financiere</h3>
          <div class="mt-4 grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl bg-muted/50 p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Budget total</p>
              <p class="mt-2 text-xl font-semibold text-foreground">
                {{ formatCurrency(totalBudget()) }}
              </p>
            </div>
            <div class="rounded-2xl bg-muted/50 p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Depense</p>
              <p class="mt-2 text-xl font-semibold text-foreground">
                {{ formatCurrency(spentBudget()) }}
              </p>
            </div>
            <div class="rounded-2xl bg-muted/50 p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Restant</p>
              <p class="mt-2 text-xl font-semibold text-foreground">
                {{ formatCurrency(remainingBudget()) }}
              </p>
            </div>
          </div>
        </section>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class BudgetPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly roleService = inject(RoleService);
  readonly icons = sharedIcons;

  readonly requests = signal<PurchaseRequest[]>([]);
  readonly errorMessage = signal('');

  readonly categories = computed<BudgetCategory[]>(() => {
    const base = [
      {
        key: 'equipements',
        label: 'Equipements scientifiques',
        color: '#1d4ed8',
      },
      {
        key: 'consommables',
        label: 'Consommables et reactifs',
        color: '#d97706',
      },
      { key: 'missions', label: 'Missions et deplacements', color: '#059669' },
      { key: 'logiciels', label: 'Licences logicielles', color: '#7c3aed' },
      { key: 'maintenance', label: 'Maintenance', color: '#dc2626' },
    ];

    const requestBuckets = this.requests().reduce<Record<string, number>>((acc, request) => {
      const amount = request.estimationCout ?? 0;
      const key = this.mapToCategory(request);
      acc[key] = (acc[key] || 0) + amount;
      return acc;
    }, {});

    return base.map((item) => {
      const spent = requestBuckets[item.key] || 0;
      const allocated = Math.max(spent * 1.25, 1_000);

      return {
        key: item.key,
        label: item.label,
        allocated,
        spent,
        color: item.color,
      };
    });
  });

  readonly spentBudget = computed(() =>
    this.requests()
      .filter((item) =>
        ['ACCEPTEE', 'EN_COURS_TRAITEMENT', 'COMMANDEE', 'LIVREE'].includes(
          item.statut,
        ),
      )
      .reduce((sum, item) => sum + (item.estimationCout ?? 0), 0),
  );

  readonly pendingBudget = computed(() =>
    this.requests()
      .filter((item) => item.statut === 'EN_ATTENTE')
      .reduce((sum, item) => sum + (item.estimationCout ?? 0), 0),
  );

  readonly totalBudget = computed(() => {
    const consumed = this.spentBudget() + this.pendingBudget();
    return Math.max(consumed * 1.35, 100_000);
  });

  readonly remainingBudget = computed(() =>
    Math.max(this.totalBudget() - this.spentBudget(), 0),
  );

  readonly summaryCards = computed(() => [
    {
      label: 'Budget total',
      value: this.formatCurrency(this.totalBudget()),
      meta: 'Reference budgetaire annuelle',
      icon: this.icons.Wallet,
      badgeClass:
        'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary',
    },
    {
      label: 'Depense',
      value: this.formatCurrency(this.spentBudget()),
      meta: 'Montant engage et consomme',
      icon: this.icons.TrendingDown,
      badgeClass:
        'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700',
    },
    {
      label: 'Restant',
      value: this.formatCurrency(this.remainingBudget()),
      meta: 'Marge disponible',
      icon: this.icons.TrendingUp,
      badgeClass:
        'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Demandes en attente',
      value: this.requests().filter((item) => item.statut === 'EN_ATTENTE').length,
      meta: 'A arbitrer rapidement',
      icon: this.icons.Bell,
      badgeClass:
        'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700',
    },
  ]);

  readonly pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
    },
  };

  readonly pieChartData = computed<ChartData<'pie'>>(() => {
    const categories = this.categories();
    return {
      labels: categories.map((item) => item.label),
      datasets: [
        {
          data: categories.map((item) => item.spent),
          backgroundColor: categories.map((item) => item.color),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  async ngOnInit() {
    if (!this.roleService.isChef()) {
      return;
    }

    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    try {
      const response = await api.listPurchaseRequests(token, { limit: 200 });
      this.requests.set(response.elements);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les donnees budgetaires.',
      );
    }
  }

  progress(value: number, max: number) {
    const safeMax = Math.max(1, max);
    return Math.min(Math.round((value / safeMax) * 100), 100);
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 3,
    }).format(value);
  }

  private mapToCategory(request: PurchaseRequest): string {
    const source = `${request.objet} ${request.description}`.toLowerCase();

    if (/equip|appareil|instrument|materiel/.test(source)) {
      return 'equipements';
    }

    if (/reactif|consommable|produit|chimique/.test(source)) {
      return 'consommables';
    }

    if (/mission|deplacement|voyage|conference/.test(source)) {
      return 'missions';
    }

    if (/logiciel|licence|license|software/.test(source)) {
      return 'logiciels';
    }

    return 'maintenance';
  }
}
