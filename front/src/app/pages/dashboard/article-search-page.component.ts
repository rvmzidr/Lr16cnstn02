import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  Article,
  ArticleSearchFilters,
  RegistrationReferences,
  UtilisateurComplet,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-article-search-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-8">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(searchTitle) }}</h2>
          <p class="app-page-description">{{ site.localize(searchIntro) }}</p>
        </div>
      </div>

      <form
        class="surface-card grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3"
        (ngSubmit)="runSearch()"
      >
        <div>
          <label class="mb-2 block">{{ site.localize(searchFieldLabel) }}</label
          ><input [(ngModel)]="filters.q" name="q" class="input-shell" />
        </div>
        <div>
          <label class="mb-2 block">Categorie</label
          ><select
            [(ngModel)]="filters.categorieId"
            name="categorieId"
            class="select-shell"
          >
            <option value="">Toutes</option>
            @for (
              item of references()?.categoriesArticle || [];
              track item.id
            ) {
              <option [ngValue]="item.id">{{ item.libelle }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-2 block">Equipe de recherche</label
          ><select
            [(ngModel)]="filters.equipeRechercheId"
            name="equipeRechercheId"
            class="select-shell"
          >
            <option value="">Toutes</option>
            @for (item of references()?.equipesRecherche || []; track item.id) {
              <option [ngValue]="item.id">{{ item.nom }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-2 block">Auteur</label
          ><select
            [(ngModel)]="filters.auteurId"
            name="auteurId"
            class="select-shell"
          >
            <option value="">Tous</option>
            @for (item of members(); track item.id) {
              <option [value]="item.id">{{ item.nomComplet }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-2 block">Statut</label
          ><select
            [(ngModel)]="filters.statut"
            name="statut"
            class="select-shell"
          >
            <option value="">Tous</option>
            <option value="BROUILLON">BROUILLON</option>
            <option value="SOUMIS">SOUMIS</option>
            <option value="VALIDE">VALIDE</option>
            <option value="REJETE">REJETE</option>
            <option value="PUBLIE">PUBLIE</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            type="submit"
            class="btn-secondary w-full justify-center xl:w-auto"
          >
            {{ site.localize(runSearchLabel) }}
          </button>
        </div>
      </form>

      <section class="surface-card overflow-hidden">
        <div class="border-b border-border px-6 py-5">
          <h3 class="text-xl font-semibold text-foreground">
            {{ site.localize(resultsTitle) }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ results().length }} {{ site.localize(resultsMeta) }}
          </p>
        </div>

        <div class="app-data-table-wrap rounded-none border-0 shadow-none">
          <table class="table-shell">
            <thead>
              <tr>
                <th>Article</th>
                <th>Categorie</th>
                <th>Auteur</th>
                <th>Statut</th>
                <th>Maj</th>
              </tr>
            </thead>
            <tbody>
              @for (article of results(); track article.id) {
                <tr>
                  <td>
                    <div class="font-semibold text-foreground">
                      {{ article.titre }}
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ article.resume }}
                    </div>
                  </td>
                  <td>{{ article.categorie?.libelle || 'Non classe' }}</td>
                  <td>
                    {{
                      article.deposant?.nomComplet ||
                        site.localize(defaultAuthor)
                    }}
                  </td>
                  <td>
                    <span class="badge-soft">{{ article.statut }}</span>
                  </td>
                  <td>{{ formatDate(article.modifieLe) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="empty-state m-4">
                      Aucun article ne correspond aux criteres actuels.
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class ArticleSearchPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly references = signal<RegistrationReferences | null>(null);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly results = signal<Article[]>([]);
  readonly formatDate = formatDate;
  readonly searchTitle = {
    fr: 'Recherche d articles',
    en: 'Article search',
    ar: 'البحث في المقالات',
  };
  readonly searchIntro = {
    fr: 'Filtrer les articles de la plateforme selon plusieurs critères sans changer la logique de recherche existante.',
    en: 'Filter platform articles with multiple criteria without changing existing search logic.',
    ar: 'تصفية مقالات المنصة وفق معايير متعددة دون تغيير منطق البحث الحالي.',
  };
  readonly searchFieldLabel = { fr: 'Recherche', en: 'Search', ar: 'بحث' };
  readonly runSearchLabel = {
    fr: 'Lancer la recherche',
    en: 'Run search',
    ar: 'تشغيل البحث',
  };
  readonly resultsTitle = { fr: 'Résultats', en: 'Results', ar: 'النتائج' };
  readonly resultsMeta = {
    fr: 'article(s) correspondant aux filtres actifs.',
    en: 'article(s) matching active filters.',
    ar: 'مقال(ات) تطابق الفلاتر النشطة.',
  };
  readonly defaultAuthor = {
    fr: 'LR16CNSTN02',
    en: 'LR16CNSTN02',
    ar: 'LR16CNSTN02',
  };
  filters: ArticleSearchFilters = {
    q: '',
    categorieId: '',
    equipeRechercheId: '',
    auteurId: '',
    statut: '',
    limit: 50,
  };

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    try {
      const [profile, members, results] = await Promise.all([
        api.getProfile(token),
        api.listMembers(token, { limit: 50 }),
        api.searchMemberArticles(token, this.filters),
      ]);
      this.references.set(profile.references);
      this.members.set(members.elements);
      this.results.set(results.elements);
    } catch {
      this.references.set(null);
      this.members.set([]);
      this.results.set([]);
    }
  }

  async runSearch() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    const response = await api.searchMemberArticles(token, this.filters);
    this.results.set(response.elements);
  }
}
