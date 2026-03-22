import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import type { Actualite, AdminAccountsList, AdminRegistrationList, Article, LabHeadArticlesData, MemberArticlesData } from '../../core/models/models';
import { countThisMonth, countWithinDays, toPercent } from '../../core/utils/activity-metrics';
import { formatDateTime } from '../../core/utils/format';
import { AnimatedCounterComponent } from '../../shared/components/animated-counter.component';

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [CommonModule, AnimatedCounterComponent],
  template: `
    <div class="space-y-8">
      <section class="summary-highlight">
        <div>
          <span class="summary-highlight__chip">Resume rapide</span>
          <h2 class="mt-4 text-4xl font-bold text-foreground">Vue d'ensemble immediate</h2>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Cette zone met en avant les elements a consulter en priorite, les statistiques majeures et les actions qui demandent votre attention.
          </p>
        </div>
        <div class="summary-highlight__list">
          @for (item of quickSummaryItems(); track item.title) {
            <div class="summary-highlight__list-item">
              <div class="text-base font-semibold text-foreground">{{ item.title }}</div>
              <div class="mt-2 text-sm leading-7 text-muted-foreground">{{ item.subtitle }}</div>
            </div>
          }
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-5xl font-bold text-foreground">Bonjour, {{ auth.session()?.utilisateur?.nomComplet || 'Plateforme Admin' }}</h2>
        <p class="text-xl text-muted-foreground">Vue d'ensemble de votre espace administrateur.</p>
      </section>

      <section class="grid gap-6 xl:grid-cols-4 md:grid-cols-2">
        @for (stat of summaryCards(); track stat.label) {
          <div class="surface-card p-8">
            <div class="text-2xl font-semibold text-foreground">{{ stat.label }}</div>
            <div class="mt-3 text-5xl font-bold text-foreground"><app-animated-counter [value]="stat.value"></app-animated-counter></div>
            <div class="mt-4 text-sm text-muted-foreground">{{ stat.hint }}</div>
            <div class="mt-5 flex justify-between text-sm text-muted-foreground"><span>{{ stat.progressLabel }}</span><span>{{ stat.progress }}%</span></div>
            <div class="progress-track mt-3"><div class="progress-fill" [style.width.%]="stat.progress"></div></div>
          </div>
        }
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="surface-card p-8">
          <h3 class="text-3xl font-bold text-foreground">Activite recente</h3>
          <div class="mt-6 space-y-4">
            @for (item of recentItems(); track item.id) {
              <div class="rounded-2xl border border-border/50 bg-muted/20 p-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="text-xl font-semibold text-foreground">{{ item.title }}</div>
                  <div class="text-sm text-muted-foreground">{{ item.date }}</div>
                </div>
                <div class="mt-2 text-sm text-muted-foreground">{{ item.subtitle }}</div>
              </div>
            }
          </div>
        </div>

        <div class="surface-card p-8">
          <h3 class="text-3xl font-bold text-foreground">Points d'attention</h3>
          <div class="mt-6 space-y-4">
            @for (item of attentionItems(); track item.title) {
              <div class="rounded-2xl border border-border/50 bg-muted/20 p-5">
                <div class="text-xl font-semibold text-foreground">{{ item.title }}</div>
                <div class="mt-2 text-sm leading-7 text-muted-foreground">{{ item.subtitle }}</div>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `
})
export class DashboardHomePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly memberArticles = signal<MemberArticlesData | null>(null);
  readonly memberNews = signal<Actualite[]>([]);
  readonly adminRegistrations = signal<AdminRegistrationList | null>(null);
  readonly adminAccounts = signal<AdminAccountsList | null>(null);
  readonly labHeadArticles = signal<LabHeadArticlesData | null>(null);

  readonly summaryCards = computed(() => {
    const articles = this.memberArticles()?.articles || [];
    const news = this.memberNews();
    const role = this.auth.session()?.utilisateur.role;
    const cards = [
      {
        label: 'Mes articles',
        value: articles.length,
        hint: 'Production scientifique personnelle',
        progressLabel: 'Taux de publication',
        progress: toPercent((this.memberArticles()?.statistiques.parStatut.PUBLIE || 0), articles.length || 1)
      },
      {
        label: 'Actualites membres',
        value: news.length,
        hint: 'Visibilite du flux interne',
        progressLabel: 'Ce mois',
        progress: toPercent(countThisMonth(news, (item) => item.publieeLe || item.creeLe), news.length || 1)
      }
    ];

    if (role === 'ADMINISTRATEUR') {
      cards.push({
        label: 'Inscriptions en attente',
        value: this.adminRegistrations()?.statistiques.enAttente || 0,
        hint: 'Flux de validation a traiter',
        progressLabel: 'Dossiers complets',
        progress: toPercent(
          this.adminRegistrations()?.statistiques.attestationsDisponibles || 0,
          this.adminRegistrations()?.statistiques.enAttente || 1
        )
      });
      cards.push({
        label: 'Comptes actifs',
        value: this.adminAccounts()?.statistiques.actifs || 0,
        hint: 'Vue globale des utilisateurs',
        progressLabel: 'Taux de comptes actifs',
        progress: toPercent(
          this.adminAccounts()?.statistiques.actifs || 0,
          this.adminAccounts()?.statistiques.total || 1
        )
      });
    } else if (role === 'CHEF_LABO') {
      cards.push({
        label: 'Articles a arbitrer',
        value: this.labHeadArticles()?.statistiques.enAttente || 0,
        hint: 'Moderation chef labo',
        progressLabel: 'Articles valides',
        progress: toPercent(
          this.labHeadArticles()?.statistiques.valides || 0,
          (this.labHeadArticles()?.statistiques.valides || 0) + (this.labHeadArticles()?.statistiques.enAttente || 0)
        )
      });
    }

    return cards;
  });

  readonly recentItems = computed(() => {
    const items = [
      ...(this.memberArticles()?.articles || []).slice(0, 3).map((article) => ({
        id: `article-${article.id}`,
        title: article.titre,
        subtitle: `Article ${article.statut.toLowerCase()}`,
        date: formatDateTime(article.modifieLe)
      })),
      ...(this.memberNews() || []).slice(0, 3).map((news) => ({
        id: `news-${news.id}`,
        title: news.titre,
        subtitle: 'Actualite publiee',
        date: formatDateTime(news.publieeLe || news.creeLe)
      }))
    ];

    return items.slice(0, 5);
  });

  readonly attentionItems = computed(() => {
    const items = [];
    if (this.auth.session()?.utilisateur.role === 'ADMINISTRATEUR') {
      items.push({
        title: `${this.adminRegistrations()?.statistiques.enAttente || 0} inscription(s) en attente`,
        subtitle: 'Verifier les dossiers doctorants et finaliser les validations de compte.'
      });
    }
    if (this.auth.session()?.utilisateur.role === 'CHEF_LABO') {
      items.push({
        title: `${this.labHeadArticles()?.statistiques.enAttente || 0} article(s) a arbitrer`,
        subtitle: 'Valider, refuser ou publier les soumissions en fonction de leur avancement.'
      });
    }
    if (!items.length) {
      items.push({
        title: `${countWithinDays(this.memberNews(), (item) => item.publieeLe || item.creeLe, 7)} actualite(s) cette semaine`,
        subtitle: 'Rien de bloquant a signaler. Le flux general de la plateforme reste stable.'
      });
    }
    return items;
  });

  readonly quickSummaryItems = computed(() => {
    const role = this.auth.session()?.utilisateur.role;
    const publishedArticles = this.memberArticles()?.statistiques?.parStatut?.PUBLIE || 0;

    return [
      {
        title: 'Production scientifique',
        subtitle: `${publishedArticles} article(s) publie(s) sont deja visibles dans la plateforme.`
      },
      {
        title: role === 'ADMINISTRATEUR' ? 'Validation des comptes' : 'Flux de consultation',
        subtitle:
          role === 'ADMINISTRATEUR'
            ? `${this.adminRegistrations()?.statistiques?.enAttente || 0} inscription(s) attendent une verification.`
            : `${this.memberNews().length} actualite(s) sont actuellement disponibles pour les membres.`
      },
      {
        title: 'Prochaine action conseillee',
        subtitle: this.attentionItems()[0]?.subtitle || 'Aucune alerte prioritaire n\'est detectee pour le moment.'
      }
    ];
  });

  async ngOnInit() {
    const session = this.auth.session();
    if (!session?.accessToken) {
      return;
    }

    try {
      const requests: Promise<unknown>[] = [
        api.listMemberArticles(session.accessToken),
        api.listMemberNews(session.accessToken, { limit: 5 })
      ];

      if (session.utilisateur.role === 'ADMINISTRATEUR') {
        requests.push(
          api.listAdminRegistrations(session.accessToken, { statut: 'EN_ATTENTE', limit: 5 }),
          api.listAdminAccounts(session.accessToken, { limit: 5 })
        );
      }

      if (session.utilisateur.role === 'CHEF_LABO') {
        requests.push(api.getLabHeadArticles(session.accessToken));
      }

      const responses = await Promise.all(requests);
      this.memberArticles.set(responses[0] as MemberArticlesData);
      this.memberNews.set((responses[1] as { elements: Actualite[] }).elements);
      if (session.utilisateur.role === 'ADMINISTRATEUR') {
        this.adminRegistrations.set(responses[2] as AdminRegistrationList);
        this.adminAccounts.set(responses[3] as AdminAccountsList);
      }
      if (session.utilisateur.role === 'CHEF_LABO') {
        this.labHeadArticles.set(responses[2] as LabHeadArticlesData);
      }
    } catch {
      this.memberArticles.set(null);
      this.memberNews.set([]);
      this.adminRegistrations.set(null);
      this.adminAccounts.set(null);
      this.labHeadArticles.set(null);
    }
  }
}
