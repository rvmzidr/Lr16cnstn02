import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { Article, Category } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { estimateReadTime, formatDate } from '../../core/utils/format';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div
        class="hero-banner--light surface-card overflow-hidden px-8 py-12 lg:px-12"
      >
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">{{ site.localize(articlesLabel) }}</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">
            Articles scientifiques
          </h1>
          <p class="text-xl leading-9 text-muted-foreground">
            {{ site.localize(subtitle) }}
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-6">
        <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <label
            class="flex h-[58px] items-center gap-3 rounded-2xl border border-border bg-input-background px-4 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30"
          >
            <lucide-icon
              [img]="icons.Search"
              class="h-5 w-5 shrink-0 text-muted-foreground"
            ></lucide-icon>
            <input
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              class="w-full bg-transparent text-base text-foreground outline-none"
              [placeholder]="site.localize(searchPlaceholder)"
            />
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >{{ site.localize(filtersLabel) }}</span
            >
            <button
              type="button"
              class="btn-outline h-10"
              (click)="resetFilters()"
            >
              {{ site.localize(resetFiltersLabel) }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2 lg:col-start-2">
            <button
              type="button"
              class="btn-outline"
              [class.bg-secondary]="selectedCategoryId() === null"
              [class.text-secondary-foreground]="selectedCategoryId() === null"
              (click)="setCategory(null)"
            >
              {{ site.localize(allLabel) }}
            </button>
            @for (category of categories(); track category.id) {
              <button
                type="button"
                class="btn-outline"
                [class.bg-secondary]="selectedCategoryId() === category.id"
                [class.text-secondary-foreground]="
                  selectedCategoryId() === category.id
                "
                (click)="setCategory(category.id)"
              >
                {{ category.libelle }}
              </button>
            }
          </div>

          <div class="flex flex-wrap items-center gap-2 lg:col-span-2">
            <span
              class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >{{ site.localize(yearFilterLabel) }}</span
            >
            <label
              class="flex h-10 items-center rounded-xl border border-border bg-input-background px-3 shadow-sm"
            >
              <input
                type="number"
                min="1900"
                max="2100"
                step="1"
                [ngModel]="selectedYearInput()"
                (ngModelChange)="setYearExact($event)"
                class="w-24 bg-transparent text-sm text-foreground outline-none"
                [placeholder]="site.localize(yearPlaceholder)"
              />
            </label>
            <button
              type="button"
              class="btn-outline h-10"
              [class.bg-secondary]="selectedYearInput() === ''"
              [class.text-secondary-foreground]="selectedYearInput() === ''"
              (click)="setYear(null)"
            >
              {{ site.localize(allYearsLabel) }}
            </button>
            @for (year of availableYears(); track year) {
              <button
                type="button"
                class="btn-outline h-10"
                [class.bg-secondary]="selectedYear() === year"
                [class.text-secondary-foreground]="selectedYear() === year"
                (click)="setYear(year)"
              >
                {{ year }}
              </button>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-4">
      <div class="grid gap-6 lg:grid-cols-2">
        @for (article of filteredArticles(); track article.id) {
          <a
            [routerLink]="['/articles', article.id]"
            class="surface-card surface-card--interactive block p-8 hover:border-primary/35"
          >
            <div
              class="flex items-center justify-between gap-3 text-sm text-muted-foreground"
            >
              <span class="badge-soft">{{
                article.categorie?.libelle || 'AUTRE'
              }}</span>
              <span>{{ estimateReadTime(article.contenu) }}</span>
            </div>
            <h2 class="mt-5 text-4xl font-bold leading-tight text-foreground">
              {{ article.titre }}
            </h2>
            <div class="mt-3 text-base text-muted-foreground">
              {{ formatDate(article.publieLe || article.creeLe) }} •
              {{ article.deposant?.nomComplet || 'LR16CNSTN02' }}
            </div>
            <p class="mt-5 text-lg leading-8 text-muted-foreground">
              {{ article.resume }}
            </p>
            <div class="mt-7 text-lg font-semibold text-primary">
              Lire l'article ->
            </div>
          </a>
        }
      </div>

      @if (!filteredArticles().length) {
        <div class="empty-state mt-8">{{ site.localize(emptyLabel) }}</div>
      }
    </section>
  `,
})
export class ArticlesPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly query = signal('');
  readonly articles = signal<Article[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedYear = signal<number | null>(null);
  readonly selectedYearInput = signal('');
  readonly formatDate = formatDate;
  readonly estimateReadTime = estimateReadTime;
  readonly articlesLabel = { fr: 'Articles', en: 'Articles', ar: 'المقالات' };
  readonly subtitle = {
    fr: 'Explorez les publications evaluees et les contributions scientifiques du laboratoire.',
    en: 'Explore the reviewed publications and scientific contributions of the laboratory.',
    ar: 'استكشف المنشورات العلمية والمساهمات البحثية الخاصة بالمختبر.',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un article...',
    en: 'Search an article...',
    ar: 'ابحث عن مقال...',
  };
  readonly filtersLabel = { fr: 'Filtres', en: 'Filters', ar: 'عوامل التصفية' };
  readonly resetFiltersLabel = {
    fr: 'Réinitialiser',
    en: 'Reset',
    ar: 'إعادة تعيين',
  };
  readonly yearFilterLabel = { fr: 'Année', en: 'Year', ar: 'السنة' };
  readonly yearPlaceholder = { fr: 'AAAA', en: 'YYYY', ar: 'السنة' };
  readonly allYearsLabel = { fr: 'Toutes', en: 'All', ar: 'الكل' };
  readonly allLabel = { fr: 'Tous', en: 'All', ar: 'الكل' };
  readonly emptyLabel = {
    fr: 'Aucun article ne correspond a vos criteres.',
    en: 'No article matches your current filters.',
    ar: 'لا توجد مقالات تطابق معاييرك الحالية.',
  };

  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const article of this.articles()) {
      years.add(this.getArticleYear(article));
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  readonly filteredArticles = computed(() => {
    const q = this.query().trim().toLowerCase();
    const yearFilter = this.selectedYearInput().trim();

    return this.articles().filter((article) => {
      const matchesQuery =
        !q ||
        article.titre.toLowerCase().includes(q) ||
        article.resume.toLowerCase().includes(q) ||
        article.contenu.toLowerCase().includes(q);
      const matchesCategory =
        !this.selectedCategoryId() ||
        article.categorie?.id === this.selectedCategoryId();
      const matchesYear =
        !yearFilter || String(this.getArticleYear(article)) === yearFilter;
      return matchesQuery && matchesCategory && matchesYear;
    });
  });

  private getArticleYear(article: Article) {
    const date = new Date(article.publieLe || article.creeLe);
    return Number.isNaN(date.getTime())
      ? new Date().getFullYear()
      : date.getFullYear();
  }

  setCategory(categoryId: number | null) {
    this.selectedCategoryId.set(categoryId);
  }

  setYear(year: number | null) {
    this.selectedYear.set(year);
    this.selectedYearInput.set(year ? String(year) : '');
  }

  setYearExact(rawValue: string | number | null) {
    const text = String(rawValue ?? '')
      .replace(/[^0-9]/g, '')
      .slice(0, 4);
    this.selectedYearInput.set(text);

    if (text.length === 4) {
      const year = Number(text);
      this.selectedYear.set(Number.isFinite(year) ? year : null);
    } else {
      this.selectedYear.set(null);
    }
  }

  resetFilters() {
    this.query.set('');
    this.selectedCategoryId.set(null);
    this.setYear(null);
  }

  async ngOnInit() {
    try {
      const [articlesResponse, about] = await Promise.all([
        api.listPublicArticles({ limit: 24 }),
        api.getAbout(),
      ]);
      this.articles.set(articlesResponse.elements);
      this.categories.set(about.categoriesArticle);
    } catch {
      this.articles.set([]);
      this.categories.set([]);
    }
  }
}
