
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { curatedArticles, localizeCuratedArticle } from '../core/content/curated-articles';
import type { HomeData } from '../core/models/models';
import { api } from '../core/services/api';
import { SitePreferencesService } from '../core/services/site-preferences.service';
import { estimateReadTime, formatDate } from '../core/utils/format';
import { stripReleaseMention } from '../core/utils/text';
import { CnstnLogoComponent } from '../shared/components/cnstn-logo.component';
import { sharedIcons } from '../shared/lucide-icons';
import { AnimatedCounterComponent } from '../shared/components/animated-counter.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, AnimatedCounterComponent, CnstnLogoComponent],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="hero-banner hero-banner--home hero-dynamic-background px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div class="grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] xl:items-start">
          <div class="space-y-6">
            <div class="hero-brand-strip">
              <span class="hero-brand-strip__logo">
                <app-cnstn-logo [width]="84"></app-cnstn-logo>
              </span>
              <div>
                <div class="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">{{ site.localize(heroBrandTitle) }}</div>
                <div class="mt-1 text-sm text-white/66">{{ site.localize(heroBrandSubtitle) }}</div>
              </div>
            </div>
            <div class="tag-chip border-white/20 bg-white/8 text-white/80">{{ site.localize(releaseLabel) }}</div>
            <h1 class="hero-contrast-title max-w-4xl text-5xl font-bold leading-tight text-white lg:text-7xl">{{ heroTitle() || site.localize(defaultHeroTitle) }}</h1>
            <p class="max-w-3xl text-lg text-white/88 lg:text-2xl">{{ heroSubtitle() || site.localize(defaultHeroSubtitle) }}</p>
            <p class="max-w-2xl text-base text-white/76 lg:text-lg">{{ heroTagline() }}</p>
            <div class="flex flex-wrap gap-3">
              <a routerLink="/articles" class="btn-secondary hero-banner__primary-action">{{ site.localize(viewArticlesLabel) }}</a>
              <a routerLink="/inscription" class="btn-outline hero-banner__ghost-action">{{ site.localize(createAccountLabel) }}</a>
            </div>
          </div>

          <div class="hero-stats-panel hero-banner--panel surface-card--interactive">
            <div class="mb-5 flex items-center justify-between">
              <div>
                <div class="text-sm uppercase tracking-[0.22em] text-white/60">{{ site.localize(indicatorsLabel) }}</div>
                <div class="mt-2 text-2xl font-semibold">{{ site.localize(quickViewLabel) }}</div>
              </div>
              <lucide-icon [img]="icons.TrendingUp" class="h-7 w-7 text-white/70"></lucide-icon>
            </div>
            <div class="hero-stats-grid">
              @for (stat of homeData()?.chiffres || []; track stat.libelle) {
                <div class="hero-stat-card">
                  <div class="text-sm text-white/60">{{ stat.libelle }}</div>
                  <div class="stats-grid__value"><app-animated-counter [value]="stat.valeur"></app-animated-counter></div>
                </div>
              }
            </div>
            <div class="hero-analytics-grid">
              <div class="hero-chart-card">
                <div class="mb-4 text-lg font-semibold">{{ site.localize(yearlyEvolutionLabel) }}</div>
                <div class="hero-bar-chart">
                  @for (metric of yearlyMetrics; track metric.year) {
                    <div class="hero-bar-chart__group">
                      <div class="hero-bar-chart__bars">
                        <div class="hero-bar-chart__bar bg-white/85" [style.height.%]="metric.publications"></div>
                        <div class="hero-bar-chart__bar bg-secondary/90" [style.height.%]="metric.collaborations"></div>
                      </div>
                      <div class="text-xs text-white/70">{{ metric.year }}</div>
                    </div>
                  }
                </div>
              </div>
              <div class="hero-chart-card">
                <div class="mb-4 text-lg font-semibold">{{ site.localize(splitLabel) }}</div>
                <div class="hero-donut-wrap">
                  <div class="hero-donut-chart" style="border-top-color: rgba(255,255,255,0.86); border-right-color: rgba(217,222,228,0.65); border-bottom-color: rgba(170,178,188,0.54); border-left-color: rgba(111,133,152,0.54);"></div>
                </div>
                <div class="hero-donut-legend">
                  <span>{{ site.localize(teamsLabel) }}</span>
                  <span>{{ site.localize(articlesLabel) }}</span>
                  <span>{{ site.localize(newsLabel) }}</span>
                  <span>{{ site.localize(referencesLabel) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="summary-highlight">
        <div>
          <span class="summary-highlight__chip">{{ site.localize(quickSummaryLabel) }}</span>
          <h2 class="mt-4 text-4xl font-bold text-foreground">{{ site.localize(summaryTitle) }}</h2>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{{ site.localize(summaryCopy) }}</p>
        </div>
        <div class="summary-highlight__list">
          @for (item of quickFocusItems(); track item.title) {
            <div class="summary-highlight__list-item">
              <div class="text-base font-semibold text-foreground">{{ item.title }}</div>
              <div class="mt-2 text-sm leading-7 text-muted-foreground">{{ item.subtitle }}</div>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="grid gap-6 md:grid-cols-3">
        @for (pillar of localizedPillars(); track pillar.titre; let index = $index) {
          <div class="surface-card surface-card--interactive p-7">
            <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/70">
              <lucide-icon [img]="featureIcons[index]" class="h-7 w-7 text-primary"></lucide-icon>
            </div>
            <h2 class="text-3xl font-bold text-foreground">{{ pillar.titre }}</h2>
            <p class="mt-4 text-lg leading-8 text-muted-foreground">{{ pillar.description }}</p>
          </div>
        }
      </div>
    </section>

    <section class="page-shell py-8">
      <div class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="surface-card overflow-hidden">
          <div class="grid lg:grid-cols-[1.15fr_0.85fr]">
            <iframe title="Carte du laboratoire LR16CNSTN02" src="https://www.openstreetmap.org/export/embed.html?bbox=10.063%2C36.830%2C10.205%2C36.920&layer=mapnik&marker=36.875%2C10.134" class="h-[26rem] w-full border-0"></iframe>
            <div class="p-8">
              <div class="tag-chip">{{ site.localize(locationLabel) }}</div>
              <h2 class="mt-5 text-5xl font-bold text-foreground">LR16CNSTN02</h2>
              <p class="mt-5 text-lg leading-8 text-muted-foreground">{{ site.localize(locationCopy) }}</p>
            </div>
          </div>
        </div>

        <div class="surface-card p-8">
          <div class="tag-chip">{{ site.localize(recentArticlesLabel) }}</div>
          <div class="mt-6 space-y-4">
            @for (article of homeData()?.articlesRecents || []; track article.id) {
          <a [routerLink]="['/articles', article.id]" class="surface-card--interactive block rounded-2xl border border-border/50 bg-muted/20 p-5 hover:border-primary/35 hover:bg-muted/40">
                <div class="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span class="badge-soft">{{ article.categorie?.libelle || 'AUTRE' }}</span>
                  <span>{{ estimateReadTime(article.contenu) }}</span>
                </div>
                <h3 class="mt-4 text-2xl font-bold text-foreground">{{ article.titre }}</h3>
                <p class="mt-3 text-base leading-7 text-muted-foreground">{{ article.resume }}</p>
                <div class="mt-4 text-sm text-muted-foreground">{{ formatDate(article.publieLe || article.creeLe) }}</div>
              </a>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-8">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <div class="tag-chip">{{ site.localize(recommendedLabel) }}</div>
          <h2 class="mt-4 text-5xl font-bold text-foreground">{{ site.localize(recommendedTitle) }}</h2>
        </div>
        <a routerLink="/articles" class="btn-outline btn-outline--contrast">{{ site.localize(viewAllLabel) }}</a>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        @for (article of localizedCuratedArticles().slice(0, 3); track article.id) {
          <a [href]="article.link" target="_blank" rel="noreferrer" class="surface-card surface-card--interactive block p-7 hover:border-primary/35">
            <div class="flex items-center justify-between gap-4">
              <span class="badge-soft">{{ article.category }}</span>
              <lucide-icon [img]="icons.ExternalLink" class="h-4 w-4 text-muted-foreground"></lucide-icon>
            </div>
            <h3 class="mt-5 text-3xl font-bold text-foreground">{{ article.title }}</h3>
            <p class="mt-4 text-base leading-7 text-muted-foreground">{{ article.summary }}</p>
            <div class="mt-6 text-sm font-semibold text-foreground">{{ article.source }} • {{ article.year }}</div>
          </a>
        }
      </div>
    </section>

    <section class="page-shell py-8 pb-16">
      <div class="mb-6">
        <div class="tag-chip">{{ site.localize(recentNewsLabel) }}</div>
        <h2 class="mt-4 text-5xl font-bold text-foreground">{{ site.localize(recentNewsTitle) }}</h2>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        @for (news of homeData()?.actualitesRecentes || []; track news.id) {
          <a [routerLink]="['/news', news.id]" class="surface-card surface-card--interactive block p-7 hover:border-primary/35">
            <div class="badge-soft">A la une</div>
            <h3 class="mt-5 text-3xl font-bold text-foreground">{{ news.titre }}</h3>
            <p class="mt-4 text-base leading-7 text-muted-foreground">{{ news.resume || news.contenu }}</p>
            <div class="mt-6 text-sm text-muted-foreground">{{ formatDate(news.publieeLe || news.creeLe) }}</div>
          </a>
        }
      </div>
    </section>
  `
})
export class HomePageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly homeData = signal<HomeData | null>(null);
  readonly formatDate = formatDate;
  readonly estimateReadTime = estimateReadTime;
  readonly featureIcons = [sharedIcons.Atom, sharedIcons.Microscope, sharedIcons.TrendingUp];

  readonly yearlyMetrics = [
    { year: 2022, publications: 42, collaborations: 18 },
    { year: 2023, publications: 54, collaborations: 28 },
    { year: 2024, publications: 70, collaborations: 42 },
    { year: 2025, publications: 86, collaborations: 56 }
  ];
  readonly heroBrandTitle = { fr: 'CNSTN', en: 'CNSTN', ar: 'CNSTN' };
  readonly heroBrandSubtitle = {
    fr: 'Centre National des Sciences et Technologies Nucleaires',
    en: 'National Center for Nuclear Sciences and Technologies',
    ar: 'National Center for Nuclear Sciences and Technologies'
  };
  readonly releaseLabel = { fr: 'Release 1', en: 'Release 1', ar: 'الإصدار 1' };
  readonly defaultHeroTitle = {
    fr: 'Portail scientifique institutionnel du LR16CNSTN02',
    en: 'Institutional scientific portal of LR16CNSTN02',
    ar: 'البوابة العلمية المؤسسية لـ LR16CNSTN02'
  };
  readonly defaultHeroSubtitle = {
    fr: 'Un espace unifie pour la recherche, la publication et la valorisation scientifique.',
    en: 'A unified space for research, publication, and scientific outreach.',
    ar: 'فضاء موحد للبحث والنشر والتثمين العلمي.'
  };
  readonly viewArticlesLabel = { fr: 'Voir les articles', en: 'View articles', ar: 'عرض المقالات' };
  readonly createAccountLabel = { fr: 'Creer un compte', en: 'Create account', ar: 'إنشاء حساب' };
  readonly indicatorsLabel = { fr: 'Indicateurs', en: 'Indicators', ar: 'المؤشرات' };
  readonly quickViewLabel = { fr: 'Vue rapide du laboratoire', en: 'Quick lab overview', ar: 'نظرة سريعة على المختبر' };
  readonly yearlyEvolutionLabel = { fr: 'Evolution annuelle', en: 'Yearly evolution', ar: 'التطور السنوي' };
  readonly splitLabel = { fr: 'Repartition des composantes', en: 'Component split', ar: 'توزيع المكونات' };
  readonly teamsLabel = { fr: 'Equipes', en: 'Teams', ar: 'الفرق' };
  readonly articlesLabel = { fr: 'Articles', en: 'Articles', ar: 'المقالات' };
  readonly newsLabel = { fr: 'Actualites', en: 'News', ar: 'الأخبار' };
  readonly referencesLabel = { fr: 'References', en: 'References', ar: 'المراجع' };
  readonly quickSummaryLabel = { fr: 'Resume rapide', en: 'Quick summary', ar: 'ملخص سريع' };
  readonly summaryTitle = { fr: 'Informations prioritaires a consulter', en: 'Priority information to review', ar: 'معلومات ذات أولوية' };
  readonly summaryCopy = {
    fr: 'Les points saillants du laboratoire sont reunis ici pour guider rapidement la navigation et la consultation des contenus importants.',
    en: 'The most relevant laboratory updates are gathered here to guide navigation and highlight important content.',
    ar: 'تم تجميع أهم عناصر المختبر هنا لتوجيه التصفح بسرعة وإبراز المحتويات ذات الأولوية.'
  };
  readonly locationLabel = { fr: 'Localisation du laboratoire', en: 'Laboratory location', ar: 'موقع المختبر' };
  readonly locationCopy = {
    fr: 'Centre National des Sciences et Technologies Nucleaires, Grand Tunis.',
    en: 'National Center for Nuclear Sciences and Technologies, Greater Tunis.',
    ar: 'المركز الوطني للعلوم والتكنولوجيا النووية، تونس الكبرى.'
  };
  readonly recentArticlesLabel = { fr: 'Articles recents', en: 'Recent articles', ar: 'مقالات حديثة' };
  readonly recommendedLabel = { fr: 'References recommandees', en: 'Recommended references', ar: 'مراجع موصى بها' };
  readonly recommendedTitle = { fr: 'Articles supplementaires recommandes', en: 'Recommended additional articles', ar: 'مقالات إضافية موصى بها' };
  readonly viewAllLabel = { fr: 'Voir tout', en: 'View all', ar: 'عرض الكل' };
  readonly recentNewsLabel = { fr: 'Actualites recentes', en: 'Recent news', ar: 'أخبار حديثة' };
  readonly recentNewsTitle = { fr: 'Dernieres actualites publiees', en: 'Latest published news', ar: 'آخر الأخبار المنشورة' };

  readonly localizedCuratedArticles = computed(() =>
    curatedArticles.map((article) => localizeCuratedArticle(article, (copy) => this.site.localize(copy)))
  );

  readonly quickFocusItems = computed(() => {
    const article = this.homeData()?.articlesRecents?.[0];
    const news = this.homeData()?.actualitesRecentes?.[0];

    return [
      {
        title: this.site.localize({ fr: 'Derniere publication', en: 'Latest publication', ar: 'آخر منشور' }),
        subtitle: article ? article.titre : this.site.localize({ fr: 'Les nouveaux articles apparaitront ici.', en: 'New articles will appear here.', ar: 'ستظهر المقالات الجديدة هنا.' })
      },
      {
        title: this.site.localize({ fr: 'Actualite a consulter', en: 'News to read', ar: 'خبر يستحق القراءة' }),
        subtitle: news ? news.titre : this.site.localize({ fr: 'Les nouvelles importantes seront affichees ici.', en: 'Important news will be shown here.', ar: 'سيتم عرض الأخبار المهمة هنا.' })
      },
      {
        title: this.site.localize({ fr: 'Acces prioritaire', en: 'Priority access', ar: 'وصول ذو أولوية' }),
        subtitle: this.site.localize({
          fr: 'Consultez d\'abord les actualites, puis les articles recents et les indicateurs du laboratoire.',
          en: 'Start with the news feed, then recent articles and laboratory indicators.',
          ar: 'ابدأ بالأخبار، ثم المقالات الحديثة ومؤشرات المختبر.'
        })
      }
    ];
  });

  readonly localizedPillars = computed(() =>
    (this.homeData()?.piliers || []).map((pillar) => ({
      titre: stripReleaseMention(pillar.titre),
      description: stripReleaseMention(pillar.description)
    }))
  );

  readonly heroTitle = computed(() => stripReleaseMention(this.homeData()?.hero.titre));
  readonly heroSubtitle = computed(() => stripReleaseMention(this.homeData()?.hero.sousTitre));
  readonly heroTagline = computed(
    () =>
      stripReleaseMention(this.homeData()?.hero.accroche) ||
      this.site.localize({
        fr: 'Une plateforme premium pour piloter les activites scientifiques et les collaborations du laboratoire.',
        en: 'A premium platform to orchestrate scientific activities and collaborations across the laboratory.',
        ar: 'منصة متميزة لتنظيم الأنشطة العلمية والتعاون داخل المختبر.'
      })
  );

  async ngOnInit() {
    try {
      this.homeData.set(await api.getHome());
    } catch {
      this.homeData.set(null);
    }
  }
}
