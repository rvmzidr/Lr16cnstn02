import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Article, ArticleSearchFilters, RegistrationReferences, UtilisateurComplet } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-article-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-4xl font-bold text-foreground">Recherche articles</h2>
        <p class="text-lg text-muted-foreground">Filtrer les articles de la plateforme selon plusieurs criteres.</p>
      </div>

      <form class="surface-card grid gap-5 p-8 md:grid-cols-2 xl:grid-cols-3" (ngSubmit)="runSearch()">
        <div><label class="mb-2 block font-semibold">Recherche</label><input [(ngModel)]="filters.q" name="q" class="input-shell" /></div>
        <div><label class="mb-2 block font-semibold">Categorie</label><select [(ngModel)]="filters.categorieId" name="categorieId" class="select-shell"><option value="">Toutes</option>@for (item of references()?.categoriesArticle || []; track item.id) { <option [ngValue]="item.id">{{ item.libelle }}</option> }</select></div>
        <div><label class="mb-2 block font-semibold">Equipe de recherche</label><select [(ngModel)]="filters.equipeRechercheId" name="equipeRechercheId" class="select-shell"><option value="">Toutes</option>@for (item of references()?.equipesRecherche || []; track item.id) { <option [ngValue]="item.id">{{ item.nom }}</option> }</select></div>
        <div><label class="mb-2 block font-semibold">Auteur</label><select [(ngModel)]="filters.auteurId" name="auteurId" class="select-shell"><option value="">Tous</option>@for (item of members(); track item.id) { <option [value]="item.id">{{ item.nomComplet }}</option> }</select></div>
        <div><label class="mb-2 block font-semibold">Statut</label><select [(ngModel)]="filters.statut" name="statut" class="select-shell"><option value="">Tous</option><option value="BROUILLON">BROUILLON</option><option value="SOUMIS">SOUMIS</option><option value="VALIDE">VALIDE</option><option value="REJETE">REJETE</option><option value="PUBLIE">PUBLIE</option></select></div>
        <div class="flex items-end"><button type="submit" class="btn-secondary">Lancer la recherche</button></div>
      </form>

      <div class="grid gap-4">
        @for (article of results(); track article.id) {
          <div class="surface-card p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="badge-soft">{{ article.statut }}</span>
              <span class="text-sm text-muted-foreground">{{ formatDate(article.modifieLe) }}</span>
            </div>
            <h3 class="mt-4 text-2xl font-bold text-foreground">{{ article.titre }}</h3>
            <p class="mt-3 text-muted-foreground">{{ article.resume }}</p>
            <div class="mt-4 text-sm text-muted-foreground">{{ article.deposant?.nomComplet || 'LR16CNSTN02' }}</div>
          </div>
        }
      </div>
    </div>
  `
})
export class ArticleSearchPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly references = signal<RegistrationReferences | null>(null);
  readonly members = signal<UtilisateurComplet[]>([]);
  readonly results = signal<Article[]>([]);
  readonly formatDate = formatDate;
  filters: ArticleSearchFilters = { q: '', categorieId: '', equipeRechercheId: '', auteurId: '', statut: '', limit: 50 };

  async ngOnInit() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }
    try {
      const [profile, members, results] = await Promise.all([
        api.getProfile(token),
        api.listMembers(token, { limit: 50 }),
        api.searchMemberArticles(token, this.filters)
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
