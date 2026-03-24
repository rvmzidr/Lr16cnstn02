
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type { Actualite } from '../core/models/models';
import { api } from '../core/services/api';
import { formatDate } from '../core/utils/format';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card px-8 py-12 lg:px-12">
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">Actualites</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">Actualites</h1>
          <p class="text-xl leading-9 text-muted-foreground">
            Restez informes des annonces, activites et avancees du laboratoire LR16CNSTN02.
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input [ngModel]="query()" (ngModelChange)="query.set($event)" class="input-shell pl-11" placeholder="Rechercher une actualite..." />
        </div>
      </div>
    </section>

    <section class="page-shell py-4">
      <div class="grid gap-6 lg:grid-cols-2">
        @for (item of filteredNews(); track item.id) {
          <a [routerLink]="['/news', item.id]" class="surface-card surface-card--interactive block p-8 hover:border-primary/35">
            <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span class="badge-soft">A la une</span>
              <span>{{ formatDate(item.publieeLe || item.creeLe) }}</span>
            </div>
            <h2 class="mt-5 text-4xl font-bold leading-tight text-foreground">{{ item.titre }}</h2>
            <p class="mt-5 text-lg leading-8 text-muted-foreground">{{ item.resume || item.contenu }}</p>
            <div class="mt-6 text-base text-muted-foreground">{{ item.auteur?.nomComplet || 'LR16CNSTN02' }}</div>
            <div class="mt-7 text-lg font-semibold text-primary">Lire</div>
          </a>
        }
      </div>

      @if (!filteredNews().length) {
        <div class="empty-state mt-8">Aucune actualite ne correspond a vos criteres.</div>
      }
    </section>
  `
})
export class NewsPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly query = signal('');
  readonly news = signal<Actualite[]>([]);
  readonly formatDate = formatDate;

  readonly filteredNews = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.news().filter((item) =>
      !q ||
      item.titre.toLowerCase().includes(q) ||
      (item.resume || '').toLowerCase().includes(q) ||
      item.contenu.toLowerCase().includes(q)
    );
  });

  async ngOnInit() {
    try {
      const response = await api.listPublicNews({ limit: 24 });
      this.news.set(response.elements);
    } catch {
      this.news.set([]);
    }
  }
}
