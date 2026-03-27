import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import type {
  Actualite,
  AdminAccountsList,
  AdminRegistrationList,
  Article,
  LabHeadArticlesData,
  MemberArticlesData,
} from '../../core/models/models';
import {
  countThisMonth,
  countWithinDays,
  toPercent,
} from '../../core/utils/activity-metrics';
import { formatDateTime } from '../../core/utils/format';
import { AnimatedCounterComponent } from '../../shared/components/animated-counter.component';

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [AnimatedCounterComponent],
  template: `
    <div class="space-y-8">
      <section class="summary-highlight">
        <div>
          <span class="summary-highlight__chip">{{
            site.localize(quickSummaryLabel)
          }}</span>
          <h2 class="mt-4 text-4xl font-bold text-foreground">
            {{ site.localize(quickOverviewTitle) }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            {{ site.localize(quickOverviewText) }}
          </p>
        </div>
        <div class="summary-highlight__list">
          @for (item of quickSummaryItems(); track item.title) {
            <div class="summary-highlight__list-item">
              <div class="text-base font-semibold text-foreground">
                {{ item.title }}
              </div>
              <div class="mt-2 text-sm leading-7 text-muted-foreground">
                {{ item.subtitle }}
              </div>
            </div>
          }
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-5xl font-bold text-foreground">
          {{ site.localize(greetingLabel) }},
          {{
            auth.session()?.utilisateur?.nomComplet ||
              site.localize(adminPlatformLabel)
          }}
        </h2>
        <p class="text-xl text-muted-foreground">
          {{ site.localize(adminOverviewText) }}
        </p>
      </section>

      <section class="grid gap-6 xl:grid-cols-4 md:grid-cols-2">
        @for (stat of summaryCards(); track stat.label) {
          <div class="surface-card p-8">
            <div class="text-2xl font-semibold text-foreground">
              {{ stat.label }}
            </div>
            <div class="mt-3 text-5xl font-bold text-foreground">
              <app-animated-counter [value]="stat.value"></app-animated-counter>
            </div>
            <div class="mt-4 text-sm text-muted-foreground">
              {{ stat.hint }}
            </div>
            <div
              class="mt-5 flex justify-between text-sm text-muted-foreground"
            >
              <span>{{ stat.progressLabel }}</span
              ><span>{{ stat.progress }}%</span>
            </div>
            <div class="progress-track mt-3">
              <div class="progress-fill" [style.width.%]="stat.progress"></div>
            </div>
          </div>
        }
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="surface-card p-8">
          <h3 class="text-3xl font-bold text-foreground">
            {{ site.localize(recentActivityTitle) }}
          </h3>
          <div class="mt-6 space-y-4">
            @for (item of recentItems(); track item.id) {
              <div class="rounded-2xl border border-border/50 bg-muted/20 p-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="text-xl font-semibold text-foreground">
                    {{ item.title }}
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ item.date }}
                  </div>
                </div>
                <div class="mt-2 text-sm text-muted-foreground">
                  {{ item.subtitle }}
                </div>
              </div>
            }
          </div>
        </div>

        <div class="surface-card p-8">
          <h3 class="text-3xl font-bold text-foreground">
            {{ site.localize(attentionPointsTitle) }}
          </h3>
          <div class="mt-6 space-y-4">
            @for (item of attentionItems(); track item.title) {
              <div class="rounded-2xl border border-border/50 bg-muted/20 p-5">
                <div class="text-xl font-semibold text-foreground">
                  {{ item.title }}
                </div>
                <div class="mt-2 text-sm leading-7 text-muted-foreground">
                  {{ item.subtitle }}
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
})
export class DashboardHomePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly memberArticles = signal<MemberArticlesData | null>(null);
  readonly memberNews = signal<Actualite[]>([]);
  readonly adminRegistrations = signal<AdminRegistrationList | null>(null);
  readonly adminAccounts = signal<AdminAccountsList | null>(null);
  readonly labHeadArticles = signal<LabHeadArticlesData | null>(null);
  readonly quickSummaryLabel = {
    fr: 'Résumé rapide',
    en: 'Quick summary',
    ar: 'ملخص سريع',
  };
  readonly quickOverviewTitle = {
    fr: 'Vue d ensemble immédiate',
    en: 'Immediate overview',
    ar: 'نظرة فورية شاملة',
  };
  readonly quickOverviewText = {
    fr: 'Cette zone met en avant les éléments à consulter en priorité, les statistiques majeures et les actions qui demandent votre attention.',
    en: 'This section highlights priority items, key statistics, and actions requiring your attention.',
    ar: 'تعرض هذه المنطقة العناصر ذات الأولوية والإحصائيات الأساسية والإجراءات التي تتطلب انتباهك.',
  };
  readonly greetingLabel = { fr: 'Bonjour', en: 'Hello', ar: 'مرحبًا' };
  readonly adminPlatformLabel = {
    fr: 'Plateforme Admin',
    en: 'Admin Platform',
    ar: 'منصة الإدارة',
  };
  readonly adminOverviewText = {
    fr: 'Vue d ensemble de votre espace administrateur.',
    en: 'Overview of your administrator space.',
    ar: 'نظرة عامة على فضاء الإدارة الخاص بك.',
  };
  readonly recentActivityTitle = {
    fr: 'Activité récente',
    en: 'Recent activity',
    ar: 'النشاط الأخير',
  };
  readonly attentionPointsTitle = {
    fr: 'Points d attention',
    en: 'Attention points',
    ar: 'نقاط الانتباه',
  };

  readonly summaryCards = computed(() => {
    const articles = this.memberArticles()?.articles || [];
    const news = this.memberNews();
    const role = this.auth.session()?.utilisateur.role;
    const cards = [
      {
        label: this.site.localize({
          fr: 'Mes articles',
          en: 'My articles',
          ar: 'مقالاتي',
        }),
        value: articles.length,
        hint: this.site.localize({
          fr: 'Production scientifique personnelle',
          en: 'Personal scientific output',
          ar: 'الإنتاج العلمي الشخصي',
        }),
        progressLabel: this.site.localize({
          fr: 'Taux de publication',
          en: 'Publication rate',
          ar: 'نسبة النشر',
        }),
        progress: toPercent(
          this.memberArticles()?.statistiques.parStatut.PUBLIE || 0,
          articles.length || 1,
        ),
      },
      {
        label: this.site.localize({
          fr: 'Actualités membres',
          en: 'Member news',
          ar: 'أخبار الأعضاء',
        }),
        value: news.length,
        hint: this.site.localize({
          fr: 'Visibilité du flux interne',
          en: 'Internal feed visibility',
          ar: 'وضوح التدفق الداخلي',
        }),
        progressLabel: this.site.localize({
          fr: 'Ce mois',
          en: 'This month',
          ar: 'هذا الشهر',
        }),
        progress: toPercent(
          countThisMonth(news, (item) => item.publieeLe || item.creeLe),
          news.length || 1,
        ),
      },
    ];

    if (role === 'ADMINISTRATEUR') {
      cards.push({
        label: this.site.localize({
          fr: 'Inscriptions en attente',
          en: 'Pending registrations',
          ar: 'التسجيلات المعلقة',
        }),
        value: this.adminRegistrations()?.statistiques.enAttente || 0,
        hint: this.site.localize({
          fr: 'Flux de validation à traiter',
          en: 'Validation flow to process',
          ar: 'تدفق تحقق يحتاج المعالجة',
        }),
        progressLabel: this.site.localize({
          fr: 'Dossiers complets',
          en: 'Complete files',
          ar: 'ملفات مكتملة',
        }),
        progress: toPercent(
          this.adminRegistrations()?.statistiques.attestationsDisponibles || 0,
          this.adminRegistrations()?.statistiques.enAttente || 1,
        ),
      });
      cards.push({
        label: this.site.localize({
          fr: 'Comptes actifs',
          en: 'Active accounts',
          ar: 'حسابات نشطة',
        }),
        value: this.adminAccounts()?.statistiques.actifs || 0,
        hint: this.site.localize({
          fr: 'Vue globale des utilisateurs',
          en: 'Global user view',
          ar: 'رؤية شاملة للمستخدمين',
        }),
        progressLabel: this.site.localize({
          fr: 'Taux de comptes actifs',
          en: 'Active account rate',
          ar: 'نسبة الحسابات النشطة',
        }),
        progress: toPercent(
          this.adminAccounts()?.statistiques.actifs || 0,
          this.adminAccounts()?.statistiques.total || 1,
        ),
      });
    } else if (role === 'CHEF_LABO') {
      cards.push({
        label: this.site.localize({
          fr: 'Articles à arbitrer',
          en: 'Articles to arbitrate',
          ar: 'مقالات للتحكيم',
        }),
        value: this.labHeadArticles()?.statistiques.enAttente || 0,
        hint: this.site.localize({
          fr: 'Modération chef labo',
          en: 'Lab head moderation',
          ar: 'إشراف رئيس المختبر',
        }),
        progressLabel: this.site.localize({
          fr: 'Articles validés',
          en: 'Validated articles',
          ar: 'مقالات مُعتمدة',
        }),
        progress: toPercent(
          this.labHeadArticles()?.statistiques.valides || 0,
          (this.labHeadArticles()?.statistiques.valides || 0) +
            (this.labHeadArticles()?.statistiques.enAttente || 0),
        ),
      });
    }

    return cards;
  });

  readonly recentItems = computed(() => {
    const items = [
      ...(this.memberArticles()?.articles || []).slice(0, 3).map((article) => ({
        id: `article-${article.id}`,
        title: article.titre,
        subtitle: `${this.site.localize({ fr: 'Article', en: 'Article', ar: 'مقال' })} ${article.statut.toLowerCase()}`,
        date: formatDateTime(article.modifieLe),
      })),
      ...(this.memberNews() || []).slice(0, 3).map((news) => ({
        id: `news-${news.id}`,
        title: news.titre,
        subtitle: this.site.localize({
          fr: 'Actualité publiée',
          en: 'Published news',
          ar: 'خبر منشور',
        }),
        date: formatDateTime(news.publieeLe || news.creeLe),
      })),
    ];

    return items.slice(0, 5);
  });

  readonly attentionItems = computed(() => {
    const items = [];
    if (this.auth.session()?.utilisateur.role === 'ADMINISTRATEUR') {
      items.push({
        title: `${this.adminRegistrations()?.statistiques.enAttente || 0} ${this.site.localize({ fr: 'inscription(s) en attente', en: 'pending registration(s)', ar: 'تسجيل(ات) معلقة' })}`,
        subtitle: this.site.localize({
          fr: 'Vérifier les dossiers doctorants et finaliser les validations de compte.',
          en: 'Review doctoral files and finalize account validations.',
          ar: 'راجع ملفات الدكتوراه وأنهِ عمليات التحقق من الحسابات.',
        }),
      });
    }
    if (this.auth.session()?.utilisateur.role === 'CHEF_LABO') {
      items.push({
        title: `${this.labHeadArticles()?.statistiques.enAttente || 0} ${this.site.localize({ fr: 'article(s) à arbitrer', en: 'article(s) to arbitrate', ar: 'مقال(ات) للتحكيم' })}`,
        subtitle: this.site.localize({
          fr: 'Valider, refuser ou publier les soumissions en fonction de leur avancement.',
          en: 'Approve, reject, or publish submissions based on their progress.',
          ar: 'اعتمد أو ارفض أو انشر الإرسالات حسب تقدّمها.',
        }),
      });
    }
    if (!items.length) {
      items.push({
        title: `${countWithinDays(this.memberNews(), (item) => item.publieeLe || item.creeLe, 7)} ${this.site.localize({ fr: 'actualité(s) cette semaine', en: 'news item(s) this week', ar: 'خبر هذا الأسبوع' })}`,
        subtitle: this.site.localize({
          fr: 'Rien de bloquant à signaler. Le flux général de la plateforme reste stable.',
          en: 'No blocking issue to report. The overall platform flow remains stable.',
          ar: 'لا توجد عوائق للإبلاغ. التدفق العام للمنصة مستقر.',
        }),
      });
    }
    return items;
  });

  readonly quickSummaryItems = computed(() => {
    const role = this.auth.session()?.utilisateur.role;
    const publishedArticles =
      this.memberArticles()?.statistiques?.parStatut?.PUBLIE || 0;

    return [
      {
        title: this.site.localize({
          fr: 'Production scientifique',
          en: 'Scientific output',
          ar: 'الإنتاج العلمي',
        }),
        subtitle: `${publishedArticles} ${this.site.localize({ fr: 'article(s) publié(s) sont déjà visibles dans la plateforme.', en: 'published article(s) are already visible on the platform.', ar: 'مقال(ات) منشورة ظاهرة بالفعل على المنصة.' })}`,
      },
      {
        title:
          role === 'ADMINISTRATEUR'
            ? this.site.localize({
                fr: 'Validation des comptes',
                en: 'Account validation',
                ar: 'التحقق من الحسابات',
              })
            : this.site.localize({
                fr: 'Flux de consultation',
                en: 'Consultation flow',
                ar: 'تدفق التصفح',
              }),
        subtitle:
          role === 'ADMINISTRATEUR'
            ? `${this.adminRegistrations()?.statistiques?.enAttente || 0} ${this.site.localize({ fr: 'inscription(s) attendent une vérification.', en: 'registration(s) are awaiting verification.', ar: 'تسجيل(ات) في انتظار التحقق.' })}`
            : `${this.memberNews().length} ${this.site.localize({ fr: 'actualité(s) sont actuellement disponibles pour les membres.', en: 'news item(s) are currently available for members.', ar: 'خبر متاح حاليًا للأعضاء.' })}`,
      },
      {
        title: this.site.localize({
          fr: 'Prochaine action conseillée',
          en: 'Recommended next action',
          ar: 'الإجراء التالي المقترح',
        }),
        subtitle:
          this.attentionItems()[0]?.subtitle ||
          this.site.localize({
            fr: "Aucune alerte prioritaire n'est détectée pour le moment.",
            en: 'No priority alert is currently detected.',
            ar: 'لا توجد تنبيهات ذات أولوية حاليًا.',
          }),
      },
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
        api.listMemberNews(session.accessToken, { limit: 5 }),
      ];

      if (session.utilisateur.role === 'ADMINISTRATEUR') {
        requests.push(
          api.listAdminRegistrations(session.accessToken, {
            statut: 'EN_ATTENTE',
            limit: 5,
          }),
          api.listAdminAccounts(session.accessToken, { limit: 5 }),
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
