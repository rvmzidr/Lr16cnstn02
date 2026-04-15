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
import type { Article, ArticleStatus } from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Articles</h2>
          <p class="app-page-description">
            Suivi des soumissions, validations et publications avec workflow role-aware.
          </p>
        </div>

        @if (roleService.isMembre()) {
          <button type="button" class="btn-secondary" (click)="openEditor()">
            Nouvel article
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

      <section class="surface-card p-5">
        <div class="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div class="relative">
            <lucide-icon
              [img]="icons.Search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></lucide-icon>
            <input
              class="input-shell pl-11"
              placeholder="Rechercher un article..."
              [value]="searchTerm()"
              (input)="onSearch($event)"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            @for (filter of filters; track filter.value) {
              <button
                type="button"
                class="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                [class.bg-secondary]="statusFilter() === filter.value"
                [class.text-secondary-foreground]="statusFilter() === filter.value"
                [class.bg-muted]="statusFilter() !== filter.value"
                [class.text-muted-foreground]="statusFilter() !== filter.value"
                (click)="statusFilter.set(filter.value)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
        </div>
      </section>

      <section class="space-y-3">
        @for (article of filteredArticles(); track article.id) {
          <article class="surface-card p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-xl font-semibold text-foreground">
                  {{ article.titre }}
                </h3>
                <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {{ article.resume }}
                </p>
              </div>

              <span [class]="statusBadgeClass(article.statut)">
                {{ normalizeStatus(article.statut) }}
              </span>
            </div>

            <div class="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <div>Auteur: {{ article.deposant?.nomComplet || 'Membre' }}</div>
              <div>Soumis: {{ article.dateSoumission ? formatDate(article.dateSoumission) : 'N/A' }}</div>
              <div>Valide: {{ article.dateValidation ? formatDate(article.dateValidation) : 'N/A' }}</div>
              <div>Publie: {{ article.publieLe ? formatDate(article.publieLe) : 'N/A' }}</div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="btn-outline" (click)="viewArticle(article)">
                Voir
              </button>

              @if (canModerate() && article.statut === 'SOUMIS') {
                <button type="button" class="btn-secondary" (click)="approveArticle(article.id)">
                  Approuver
                </button>
                <button type="button" class="btn-outline" (click)="rejectArticle(article.id)">
                  Rejeter
                </button>
              }

              @if (canPublish() && article.statut === 'VALIDE') {
                <button type="button" class="btn-secondary" (click)="publishArticle(article.id)">
                  Publier
                </button>
              }
            </div>
          </article>
        } @empty {
          <div class="empty-state">Aucun article pour ce filtre.</div>
        }
      </section>

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
export class ArticlesPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly roleService = inject(RoleService);
  readonly router = inject(Router);
  readonly icons = sharedIcons;

  readonly articles = signal<Article[]>([]);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'TOUS' | 'SOUMIS' | 'VALIDE' | 'PUBLIE' | 'REJETE'>('TOUS');
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');
  readonly formatDate = formatDate;

  readonly filters = [
    { label: 'Tous', value: 'TOUS' as const },
    { label: 'Soumis', value: 'SOUMIS' as const },
    { label: 'Approuve', value: 'VALIDE' as const },
    { label: 'Publie', value: 'PUBLIE' as const },
    { label: 'Rejete', value: 'REJETE' as const },
  ];

  readonly filteredArticles = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.articles().filter((item) => {
      if (status !== 'TOUS' && item.statut !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.titre, item.resume, item.deposant?.nomComplet || '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly summaryCards = computed(() => {
    const articles = this.articles();

    return [
      {
        label: 'Total',
        value: articles.length,
        meta: 'Articles disponibles',
      },
      {
        label: 'Soumis',
        value: articles.filter((item) => item.statut === 'SOUMIS').length,
        meta: 'En attente de decision',
      },
      {
        label: 'Valides',
        value: articles.filter((item) => item.statut === 'VALIDE').length,
        meta: 'Prets pour publication',
      },
      {
        label: 'Publies',
        value: articles.filter((item) => item.statut === 'PUBLIE').length,
        meta: 'Diffuses publiquement',
      },
    ];
  });

  readonly canModerate = computed(() => this.roleService.isChef());

  readonly canPublish = computed(() => this.roleService.isChef());

  async ngOnInit() {
    await this.loadData();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  normalizeStatus(status: ArticleStatus) {
    if (status === 'SOUMIS') {
      return 'Soumis';
    }

    if (status === 'VALIDE') {
      return 'Approuve';
    }

    if (status === 'PUBLIE') {
      return 'Publie';
    }

    if (status === 'REJETE') {
      return 'Rejete';
    }

    return 'Brouillon';
  }

  statusBadgeClass(status: ArticleStatus) {
    if (status === 'PUBLIE') {
      return 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
    }

    if (status === 'VALIDE') {
      return 'inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700';
    }

    if (status === 'SOUMIS') {
      return 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700';
    }

    if (status === 'REJETE') {
      return 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700';
    }

    return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground';
  }

  async loadData() {
    if (!this.token) {
      return;
    }

    this.errorMessage.set('');

    try {
      if (this.roleService.isChef()) {
        const response = await api.getLabHeadArticles(this.token);
        this.articles.set(this.mergeArticles(response.articles, response.articlesValides));
        return;
      }

      const response = await api.listMemberArticles(this.token);
      this.articles.set(response.articles);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erreur chargement des articles.',
      );
    }
  }

  mergeArticles(primary: Article[], secondary: Article[]) {
    const map = new Map<number, Article>();
    [...primary, ...secondary].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }

  openEditor() {
    void this.router.navigateByUrl('/dashboard/articles/editor');
  }

  viewArticle(article: Article) {
    if (this.roleService.isMembre()) {
      void this.router.navigateByUrl('/dashboard/articles/editor');
      return;
    }

    this.statusMessage.set(`Article #${article.id} selectionne.`);
  }

  async approveArticle(articleId: number) {
    try {
      await api.validateArticle(this.token, articleId);

      this.statusMessage.set('Article approuve.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Validation impossible.',
      );
    }
  }

  async rejectArticle(articleId: number) {
    const motifRejet =
      window.prompt('Motif du rejet :', 'Corrections scientifiques requises.')?.trim() ||
      '';

    if (!motifRejet) {
      return;
    }

    try {
      await api.refuseArticle(this.token, articleId, { motifRejet });

      this.statusMessage.set('Article rejete.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Rejet impossible.',
      );
    }
  }

  async publishArticle(articleId: number) {
    try {
      await api.publishArticle(this.token, articleId);

      this.statusMessage.set('Article publie.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Publication impossible.',
      );
    }
  }
}
