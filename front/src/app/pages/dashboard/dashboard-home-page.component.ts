import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import type {
  AdminDashboardKPIs,
  Article,
  LabHeadDashboardKPIs,
  NotificationItem,
  Project,
  PurchaseRequest,
} from '../../core/models/models';
import { AnimatedCounterComponent } from '../../shared/components/animated-counter.component';
import { formatDate } from '../../core/utils/format';

type QuickAction = {
  label: string;
  route: string;
  emphasis?: 'primary' | 'secondary';
};

type KpiCard = {
  label: string;
  value: number;
  meta: string;
  route: string;
  color: string;
};

@Component({
  selector: 'app-dashboard-home-page',
  standalone: true,
  imports: [AnimatedCounterComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <section class="surface-card overflow-hidden border-l-4 p-7 lg:p-9" [style.border-left-color]="heroAccent()">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-3">
            <div class="tag-chip">{{ roleLabel() }}</div>
            <h2 class="text-3xl font-semibold tracking-tight text-foreground lg:text-5xl">
              {{ site.localize(greetingLabel) }},
              {{ auth.session()?.utilisateur?.nomComplet || site.localize(platformLabel) }}
            </h2>
            <p class="max-w-3xl text-sm text-muted-foreground lg:text-base">
              {{ roleDescription() }}
            </p>
          </div>
        </div>
      </section>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-feedback-error">
          {{ errorMessage() }}
        </div>
      }

      @if (statusMessage()) {
        <div class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-feedback-success">
          {{ statusMessage() }}
        </div>
      }

      @if (loading()) {
        <section class="surface-card p-8">
          <div class="text-sm text-muted-foreground">
            {{ site.localize({ fr: 'Chargement du dashboard...', en: 'Loading dashboard...', ar: 'جار تحميل لوحة التحكم...' }) }}
          </div>
        </section>
      } @else if (isAdmin()) {
        <section class="app-kpi-grid">
          @for (card of adminKpiCards(); track card.label) {
            <a
              [routerLink]="card.route"
              class="app-kpi-card surface-card--interactive block border-l-4"
              [style.border-left-color]="card.color"
            >
              <div class="app-kpi-card__label">{{ card.label }}</div>
              <div class="app-kpi-card__value" [style.color]="card.color">
                <app-animated-counter [value]="card.value"></app-animated-counter>
              </div>
              <div class="app-kpi-card__meta">{{ card.meta }}</div>
            </a>
          }
        </section>

        <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div class="surface-card p-6 lg:p-7">
            <div>
              <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Comptes par statut', en: 'Accounts by status', ar: 'الحسابات حسب الحالة' }) }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Repartition des comptes pour la supervision technique.', en: 'Account distribution for technical supervision.', ar: 'توزيع الحسابات من أجل الإشراف التقني.' }) }}
              </p>
            </div>

            <div class="mt-6 space-y-4">
              @for (item of adminAccountStatusChart(); track item.status) {
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ normalizeStatusLabel(item.label) }}</span>
                    <span class="text-muted-foreground">{{ item.value }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-muted">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      [style.width.%]="barWidth(item.value, adminArticleStatusMax())"
                      [style.background]="statusColor(item.status)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="surface-card p-6 lg:p-7">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Nouveaux comptes / 6 mois', en: 'New accounts / 6 months', ar: 'الحسابات الجديدة / 6 أشهر' }) }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ site.localize({ fr: 'Tendances des nouvelles inscriptions utilisateurs sur la plateforme.', en: 'User onboarding trends on the platform.', ar: 'اتجاهات انضمام المستخدمين إلى المنصة.' }) }}
                </p>
              </div>
            </div>

            <div class="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
              <svg viewBox="0 0 320 120" class="h-36 w-full">
                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  stroke-width="3"
                  [attr.points]="memberLinePoints()"
                ></polyline>
              </svg>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              @for (point of memberGrowthChart(); track point.label) {
                <div class="rounded-xl border border-border bg-card px-3 py-3">
                  <div class="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {{ point.label }}
                  </div>
                  <div class="mt-2 text-lg font-semibold text-foreground">
                    {{ point.value }}
                  </div>
                </div>
              }
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div class="surface-card p-6 lg:p-7">
            <div>
              <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Repartition des roles', en: 'Role distribution', ar: 'توزيع الأدوار' }) }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Distribution actuelle des droits applicatifs.', en: 'Current distribution of application permissions.', ar: 'التوزيع الحالي لصلاحيات التطبيق.' }) }}
              </p>
            </div>

            <div class="mt-6 space-y-3">
              @for (item of adminRoleDistributionChart(); track item.role) {
                <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div class="flex items-center gap-3">
                    <span
                      class="inline-flex h-3 w-3 rounded-full"
                      [style.background]="roleColor(item.role)"
                    ></span>
                    <span class="text-sm font-medium text-foreground">{{ roleDisplayLabel(item.role, item.label) }}</span>
                  </div>
                  <span class="text-sm text-muted-foreground">{{ item.value }}</span>
                </div>
              } @empty {
                <div class="empty-state">{{ site.localize({ fr: 'Aucune donnee role disponible.', en: 'No role data available.', ar: 'لا توجد بيانات أدوار متاحة.' }) }}</div>
              }
            </div>
          </div>

          <div class="surface-card p-6 lg:p-7">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Activite recente', en: 'Recent activity', ar: 'النشاط الأخير' }) }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ site.localize({ fr: 'Les 10 derniers evenements detectes sur la plateforme.', en: 'The last 10 events detected on the platform.', ar: 'آخر 10 أحداث تم رصدها على المنصة.' }) }}
                </p>
              </div>
            </div>

            <div class="mt-6 space-y-3">
              @for (item of adminRecentActivity(); track item.id) {
                <a
                  [routerLink]="item.link || '/dashboard'"
                  class="flex items-start gap-4 rounded-2xl border border-border bg-card px-4 py-4 transition hover:border-primary/25 hover:bg-muted/50"
                >
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
                    [style.background]="activitySurface(item.type)"
                    [style.color]="activityColor(item.type)"
                  >
                    {{ activityShortLabel(item.type) }}
                  </span>

                  <div class="min-w-0 flex-1">
                    <div class="font-medium text-foreground">{{ item.label }}</div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ formatDate(item.timestamp) }}
                    </div>
                  </div>
                </a>
              } @empty {
                <div class="empty-state">{{ site.localize({ fr: 'Aucune activite recente.', en: 'No recent activity.', ar: 'لا يوجد نشاط حديث.' }) }}</div>
              }
            </div>
          </div>
        </section>
      } @else if (isLabHead()) {
        <section class="app-kpi-grid">
          @for (card of labKpiCards(); track card.label) {
            <a
              [routerLink]="card.route"
              class="app-kpi-card surface-card--interactive block border-l-4"
              [style.border-left-color]="card.color"
            >
              <div class="app-kpi-card__label">{{ card.label }}</div>
              <div class="app-kpi-card__value" [style.color]="card.color">
                <app-animated-counter [value]="card.value"></app-animated-counter>
              </div>
              <div class="app-kpi-card__meta">{{ card.meta }}</div>
            </a>
          }
        </section>

        <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div class="surface-card p-6 lg:p-7">
            <div>
              <h3 class="text-xl font-semibold text-foreground">
                {{ site.localize({ fr: 'File prioritaire articles', en: 'Priority article queue', ar: 'قائمة المقالات ذات الاولوية' }) }}
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Suivi des articles prioritaires depuis cette vue.', en: 'Track priority articles directly from this view.', ar: 'متابعة المقالات ذات الاولوية مباشرة من هذه الصفحة.' }) }}
              </p>
            </div>

            <div class="mt-6 space-y-3">
              @for (item of priorityArticles(); track item.id) {
                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="flex flex-col gap-4">
                    <div>
                      <div class="font-semibold text-foreground">{{ item.title }}</div>
                      <div class="mt-1 text-sm text-muted-foreground">
                        {{ item.author }} • {{ item.submittedDate ? formatDate(item.submittedDate) : site.localize({ fr: 'Date indisponible', en: 'Date unavailable', ar: 'تاريخ غير متاح' }) }}
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">{{ site.localize({ fr: 'Aucun article en attente de validation.', en: 'No article pending review.', ar: 'لا توجد مقالات بانتظار المراجعة.' }) }}</div>
              }
            </div>
          </div>

          <div class="surface-card p-6 lg:p-7">
            <div>
              <h3 class="text-xl font-semibold text-foreground">
                {{ site.localize({ fr: 'File prioritaire achats', en: 'Priority purchase queue', ar: 'قائمة المشتريات ذات الاولوية' }) }}
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Suivi des demandes achats prioritaires.', en: 'Track priority purchase requests.', ar: 'متابعة طلبات الشراء ذات الاولوية.' }) }}
              </p>
            </div>

            <div class="mt-6 space-y-3">
              @for (item of priorityPurchases(); track item.id) {
                <div class="rounded-2xl border border-border bg-card px-4 py-4">
                  <div class="flex flex-col gap-4">
                    <div>
                      <div class="font-semibold text-foreground">
                        {{ item.projectName || site.localize({ fr: 'Projet non renseigne', en: 'Project not specified', ar: 'مشروع غير محدد' }) }}
                      </div>
                      <div class="mt-1 text-sm text-muted-foreground">
                        {{ item.requester }} • {{ item.amount !== null ? formatCurrency(item.amount) : site.localize({ fr: 'Montant non renseigne', en: 'Amount not specified', ar: 'قيمة غير محددة' }) }}
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">{{ site.localize({ fr: 'Aucune demande achat en attente.', en: 'No purchase request pending.', ar: 'لا توجد طلبات شراء معلقة.' }) }}</div>
              }
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div class="surface-card overflow-hidden">
            <div class="border-b border-border px-6 py-5">
              <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Etat des projets', en: 'Project status', ar: 'حالة المشاريع' }) }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ site.localize({ fr: 'Projets que vous pilotez avec progression temporelle.', en: 'Projects you lead with timeline progress.', ar: 'المشاريع التي تديرها مع التقدم الزمني.' }) }}
              </p>
            </div>

            <div class="app-data-table-wrap rounded-none border-0 shadow-none">
              <table class="table-shell">
                <thead>
                  <tr>
                    <th>{{ site.localize({ fr: 'Projet', en: 'Project', ar: 'المشروع' }) }}</th>
                    <th>{{ site.localize({ fr: 'Statut', en: 'Status', ar: 'الحالة' }) }}</th>
                    <th>{{ site.localize({ fr: 'Membres', en: 'Members', ar: 'الاعضاء' }) }}</th>
                    <th>{{ site.localize({ fr: 'Date fin', en: 'End date', ar: 'تاريخ النهاية' }) }}</th>
                    <th>{{ site.localize({ fr: 'Progression', en: 'Progress', ar: 'التقدم' }) }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (project of projectStatusOverview(); track project.id) {
                    <tr>
                      <td class="font-medium text-foreground">{{ project.name }}</td>
                      <td>
                        <span class="badge-soft">{{ normalizeStatusLabel(project.status) }}</span>
                      </td>
                      <td>{{ project.membersCount }}</td>
                      <td>{{ project.endDate ? formatDate(project.endDate) : site.localize({ fr: 'Non definie', en: 'Not defined', ar: 'غير محدد' }) }}</td>
                      <td class="min-w-48">
                        <div class="h-2 rounded-full bg-muted">
                          <div
                            class="h-2 rounded-full"
                            [style.width.%]="project.progress"
                            [style.background]="projectProgressColor(project.status)"
                          ></div>
                        </div>
                        <div class="mt-2 text-xs text-muted-foreground">{{ project.progress }}%</div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5">
                        <div class="empty-state m-4">{{ site.localize({ fr: 'Aucun projet pilote pour le moment.', en: 'No managed project for now.', ar: 'لا يوجد مشروع مدار حاليا.' }) }}</div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-6">
            <div class="surface-card p-6 lg:p-7">
              <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Dernieres decisions articles', en: 'Latest article decisions', ar: 'احدث قرارات المقالات' }) }}</h3>
              <div class="mt-5 space-y-3">
                @for (decision of recentArticleDecisions(); track decision.id) {
                  <div class="rounded-2xl border border-border bg-card px-4 py-4">
                    <div class="font-medium text-foreground">{{ decision.title }}</div>
                    <div class="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span class="badge-soft">{{ normalizeStatusLabel(decision.decision) }}</span>
                      <span class="text-muted-foreground">
                        {{ decision.date ? formatDate(decision.date) : site.localize({ fr: 'Date indisponible', en: 'Date unavailable', ar: 'تاريخ غير متاح' }) }}
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">{{ site.localize({ fr: 'Aucune decision recente.', en: 'No recent decision.', ar: 'لا توجد قرارات حديثة.' }) }}</div>
                }
              </div>
            </div>

          </div>
        </section>
      } @else {
        <section class="app-kpi-grid">
          @for (card of memberKpiCards(); track card.label) {
            <a
              [routerLink]="card.route"
              class="app-kpi-card surface-card--interactive block border-l-4"
              [style.border-left-color]="card.color"
            >
              <div class="app-kpi-card__label">{{ card.label }}</div>
              <div class="app-kpi-card__value" [style.color]="card.color">
                <app-animated-counter [value]="card.value"></app-animated-counter>
              </div>
              <div class="app-kpi-card__meta">{{ card.meta }}</div>
            </a>
          }
        </section>

        <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div class="surface-card p-6 lg:p-7">
            <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Mes articles par statut', en: 'My articles by status', ar: 'مقالاتي حسب الحالة' }) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ site.localize({ fr: 'Distribution de vos soumissions scientifiques.', en: 'Distribution of your scientific submissions.', ar: 'توزيع مساهماتك العلمية.' }) }}
            </p>

            <div class="mt-6 space-y-4">
              @for (item of memberArticleStatusChart(); track item.status) {
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ normalizeStatusLabel(item.label) }}</span>
                    <span class="text-muted-foreground">{{ item.value }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-muted">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      [style.width.%]="barWidth(item.value, memberArticleStatusMax())"
                      [style.background]="statusColor(item.status)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="surface-card p-6 lg:p-7">
            <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Demandes achat', en: 'Purchase requests', ar: 'طلبات الشراء' }) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ site.localize({ fr: 'Repartition de vos demandes selon le statut.', en: 'Distribution of your requests by status.', ar: 'توزيع طلباتك حسب الحالة.' }) }}
            </p>

            <div class="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                class="mx-auto h-40 w-40 rounded-full border border-border"
                [style.background]="memberPurchaseDonutGradient()"
              ></div>

              <div class="flex-1 space-y-3">
                @for (item of memberPurchaseStatusChart(); track item.status) {
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span
                        class="inline-flex h-3 w-3 rounded-full"
                        [style.background]="purchaseStatusColor(item.status)"
                      ></span>
                      <span class="text-sm font-medium text-foreground">{{ normalizeStatusLabel(item.status) }}</span>
                    </div>
                    <span class="text-sm text-muted-foreground">{{ item.value }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </section>

        <section class="surface-card overflow-hidden">
          <div class="border-b border-border px-6 py-5">
            <h3 class="text-xl font-semibold text-foreground">{{ site.localize({ fr: 'Articles recents', en: 'Recent articles', ar: 'المقالات الحديثة' }) }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ site.localize({ fr: 'Vos derniers articles modifies ou soumis.', en: 'Your latest updated or submitted articles.', ar: 'اخر مقالاتك المعدلة او المرسلة.' }) }}
            </p>
          </div>

          <div class="app-data-table-wrap rounded-none border-0 shadow-none">
            <table class="table-shell">
              <thead>
                <tr>
                  <th>{{ site.localize({ fr: 'Titre', en: 'Title', ar: 'العنوان' }) }}</th>
                  <th>{{ site.localize({ fr: 'Statut', en: 'Status', ar: 'الحالة' }) }}</th>
                  <th>{{ site.localize({ fr: 'Derniere mise a jour', en: 'Last update', ar: 'اخر تحديث' }) }}</th>
                </tr>
              </thead>
              <tbody>
                @for (article of memberRecentArticles(); track article.id) {
                  <tr>
                    <td class="font-medium text-foreground">{{ article.titre }}</td>
                    <td>
                      <span class="badge-soft">{{ normalizeStatusLabel(article.statut) }}</span>
                    </td>
                    <td>{{ formatDate(article.modifieLe) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3">
                      <div class="empty-state m-4">{{ site.localize({ fr: 'Aucun article recent.', en: 'No recent article.', ar: 'لا توجد مقالات حديثة.' }) }}</div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
})
export class DashboardHomePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);

  readonly adminKpis = signal<AdminDashboardKPIs | null>(null);
  readonly labHeadKpis = signal<LabHeadDashboardKPIs | null>(null);
  readonly memberArticles = signal<Article[]>([]);
  readonly memberProjects = signal<Project[]>([]);
  readonly memberPurchases = signal<PurchaseRequest[]>([]);
  readonly memberNotifications = signal<NotificationItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');
  readonly formatDate = formatDate;

  readonly role = computed(
    () => this.auth.session()?.utilisateur?.role || 'MEMBRE',
  );
  readonly isAdmin = computed(() => this.role() === 'ADMINISTRATEUR');
  readonly isLabHead = computed(() => this.role() === 'CHEF_LABO');

  readonly roleLabel = computed(() => {
    if (this.isAdmin()) {
      return this.site.localize({
        fr: 'Dashboard administrateur technique',
        en: 'Technical admin dashboard',
        ar: 'لوحة تحكم المسؤول التقني',
      });
    }
    if (this.isLabHead()) {
      return this.site.localize({
        fr: 'Dashboard chef du laboratoire',
        en: 'Lab head dashboard',
        ar: 'لوحة تحكم رئيس المختبر',
      });
    }
    return this.site.localize({
      fr: 'Dashboard membre',
      en: 'Member dashboard',
      ar: 'لوحة تحكم العضو',
    });
  });

  readonly roleDescription = computed(() => {
    if (this.isAdmin()) {
      return this.site.localize({
        fr: 'Supervision des comptes, validation des inscriptions, gestion des roles et suivi des flux techniques (messages/notifications).',
        en: 'Oversee accounts, validate registrations, manage roles, and monitor technical flows (messages/notifications).',
        ar: 'الإشراف على الحسابات، اعتماد التسجيلات، إدارة الأدوار، ومتابعة التدفقات التقنية (الرسائل/الإشعارات).',
      });
    }
    if (this.isLabHead()) {
      return this.site.localize({
        fr: 'Pilotage scientifique du laboratoire, arbitrage des articles et decisions rapides sur les demandes prioritaires.',
        en: 'Scientific leadership of the lab, article arbitration, and fast decisions on priority requests.',
        ar: 'قيادة علمية للمختبر، تحكيم المقالات، واتخاذ قرارات سريعة بشأن الطلبات ذات الأولوية.',
      });
    }
    return this.site.localize({
      fr: 'Espace de travail du membre du laboratoire.',
      en: 'Workspace for lab members.',
      ar: 'مساحة عمل عضو المختبر.',
    });
  });

  readonly heroAccent = computed(() =>
    this.isAdmin() ? '#00c8ff' : this.isLabHead() ? '#00e676' : 'var(--primary)',
  );

  readonly quickActions = computed<QuickAction[]>(() => {
    if (this.isAdmin()) {
      return [
        {
          label: this.site.localize({
            fr: 'Valider les inscriptions',
            en: 'Review registrations',
            ar: 'مراجعة التسجيلات',
          }),
          route: '/dashboard/registrations',
          emphasis: 'primary',
        },
        {
          label: this.site.localize({
            fr: 'Gerer les utilisateurs',
            en: 'Manage users',
            ar: 'إدارة المستخدمين',
          }),
          route: '/dashboard/users',
        },
        {
          label: this.site.localize({
            fr: 'Mettre a jour les roles',
            en: 'Update roles',
            ar: 'تحديث الأدوار',
          }),
          route: '/dashboard/roles',
        },
        {
          label: this.site.localize({
            fr: 'Ouvrir la messagerie',
            en: 'Open messaging',
            ar: 'فتح المراسلة',
          }),
          route: '/dashboard/messages',
        },
      ];
    }

    if (this.isLabHead()) {
      return [
        {
          label: this.site.localize({
            fr: 'Revoir la file articles',
            en: 'Review article queue',
            ar: 'مراجعة قائمة المقالات',
          }),
          route: '/dashboard/articles',
          emphasis: 'primary',
        },
        {
          label: this.site.localize({
            fr: 'Gerer mes projets',
            en: 'Manage my projects',
            ar: 'ادارة مشاريعي',
          }),
          route: '/dashboard/projects',
        },
        {
          label: this.site.localize({
            fr: 'Envoyer un message',
            en: 'Send a message',
            ar: 'ارسال رسالة',
          }),
          route: '/dashboard/messages',
        },
        {
          label: this.site.localize({
            fr: 'Traiter les achats',
            en: 'Process purchases',
            ar: 'معالجة المشتريات',
          }),
          route: '/dashboard/purchases',
        },
      ];
    }

    return [
      {
        label: this.site.localize({
          fr: 'Voir mon espace',
          en: 'Open my space',
          ar: 'فتح مساحتي',
        }),
        route: '/dashboard',
      },
    ];
  });

  readonly adminKpiCards = computed<KpiCard[]>(() => {
    const kpis = this.adminKpis()?.kpis;

    return [
      {
        label: this.site.localize({
          fr: 'Inscriptions en attente',
          en: 'Pending registrations',
          ar: 'تسجيلات قيد الانتظار',
        }),
        value: kpis?.pendingRegistrations || 0,
        meta: this.site.localize({
          fr: 'Dossiers a traiter',
          en: 'Files to process',
          ar: 'ملفات للمعالجة',
        }),
        route: '/dashboard/registrations',
        color: '#ffab00',
      },
      {
        label: this.site.localize({
          fr: 'Comptes actifs',
          en: 'Active accounts',
          ar: 'حسابات نشطة',
        }),
        value: kpis?.activeAccounts || 0,
        meta: this.site.localize({
          fr: 'Acces autorises',
          en: 'Authorized access',
          ar: 'وصول مصرح',
        }),
        route: '/dashboard/users',
        color: '#00c8ff',
      },
      {
        label: this.site.localize({
          fr: 'Changements de role (30j)',
          en: 'Role changes (30d)',
          ar: 'تغييرات الأدوار (30 يوما)',
        }),
        value: kpis?.roleChangesLast30Days || 0,
        meta: this.site.localize({
          fr: 'Evolutions de droits recentes',
          en: 'Recent permission updates',
          ar: 'تحديثات صلاحيات حديثة',
        }),
        route: '/dashboard/roles',
        color: '#00e676',
      },
      {
        label: this.site.localize({
          fr: 'Messages non lus',
          en: 'Unread messages',
          ar: 'رسائل غير مقروءة',
        }),
        value: kpis?.unreadMessages || 0,
        meta: this.site.localize({
          fr: 'A consulter en priorite',
          en: 'To review as priority',
          ar: 'للمراجعة بأولوية',
        }),
        route: '/dashboard/messages',
        color: '#1d4ed8',
      },
      {
        label: this.site.localize({
          fr: 'Notifications non lues',
          en: 'Unread notifications',
          ar: 'إشعارات غير مقروءة',
        }),
        value: kpis?.unreadNotifications || 0,
        meta: this.site.localize({
          fr: 'Alertes a consulter',
          en: 'Alerts to review',
          ar: 'تنبيهات للمراجعة',
        }),
        route: '/dashboard/notifications',
        color: '#ff5252',
      },
    ];
  });

  readonly labKpiCards = computed<KpiCard[]>(() => {
    const kpis = this.labHeadKpis()?.kpis;

    return [
      {
        label: this.site.localize({
          fr: 'Articles en attente',
          en: 'Pending articles',
          ar: 'مقالات قيد الانتظار',
        }),
        value: kpis?.articlesPendingReview || 0,
        meta: this.site.localize({
          fr: 'Validation scientifique requise',
          en: 'Scientific validation required',
          ar: 'يتطلب اعتمادا علميا',
        }),
        route: '/dashboard/articles',
        color: '#ffab00',
      },
      {
        label: this.site.localize({
          fr: 'Projets actifs geres',
          en: 'Managed active projects',
          ar: 'مشاريع نشطة تحت الادارة',
        }),
        value: kpis?.activeManagedProjects || 0,
        meta: this.site.localize({
          fr: 'Pilotage en cours',
          en: 'Ongoing steering',
          ar: 'متابعة جارية',
        }),
        route: '/dashboard/projects',
        color: '#00c8ff',
      },
      {
        label: this.site.localize({
          fr: 'Demandes achat a decider',
          en: 'Purchase requests to decide',
          ar: 'طلبات شراء بانتظار القرار',
        }),
        value: kpis?.purchaseRequestsAwaitingDecision || 0,
        meta: this.site.localize({
          fr: 'Decision attendue',
          en: 'Decision required',
          ar: 'قرار مطلوب',
        }),
        route: '/dashboard/purchases',
        color: '#ff5252',
      },
      {
        label: this.site.localize({
          fr: 'Membres mobilises',
          en: 'Engaged members',
          ar: 'اعضاء مشاركون',
        }),
        value: kpis?.teamMembers || 0,
        meta: this.site.localize({
          fr: 'Ressources actives sur vos projets',
          en: 'Active resources on your projects',
          ar: 'موارد نشطة في مشاريعك',
        }),
        route: '/dashboard/projects',
        color: '#00e676',
      },
    ];
  });

  readonly memberKpiCards = computed<KpiCard[]>(() => {
    const articles = this.memberArticles();
    const projects = this.memberProjects();
    const purchases = this.memberPurchases();
    const notifications = this.memberNotifications();

    return [
      {
        label: this.site.localize({
          fr: 'Mes articles',
          en: 'My articles',
          ar: 'مقالاتي',
        }),
        value: articles.length,
        meta: this.site.localize({
          fr: 'Soumissions personnelles',
          en: 'Personal submissions',
          ar: 'ارسالات شخصية',
        }),
        route: '/dashboard/articles',
        color: '#00c8ff',
      },
      {
        label: this.site.localize({
          fr: 'Projets actifs',
          en: 'Active projects',
          ar: 'مشاريع نشطة',
        }),
        value: projects.filter((item) => item.statut === 'EN_COURS').length,
        meta: this.site.localize({
          fr: 'Participations en cours',
          en: 'Current participations',
          ar: 'مشاركات جارية',
        }),
        route: '/dashboard/projects',
        color: '#00e676',
      },
      {
        label: this.site.localize({
          fr: 'Demandes achat ouvertes',
          en: 'Open purchase requests',
          ar: 'طلبات شراء مفتوحة',
        }),
        value: purchases.filter((item) => item.statut === 'EN_ATTENTE').length,
        meta: this.site.localize({
          fr: 'En attente de decision',
          en: 'Pending decision',
          ar: 'بانتظار القرار',
        }),
        route: '/dashboard/purchases',
        color: '#ffab00',
      },
      {
        label: this.site.localize({
          fr: 'Notifications non lues',
          en: 'Unread notifications',
          ar: 'اشعارات غير مقروءة',
        }),
        value: notifications.filter((item) => !item.estLue).length,
        meta: this.site.localize({
          fr: 'Alertes a traiter',
          en: 'Alerts to process',
          ar: 'تنبيهات للمعالجة',
        }),
        route: '/dashboard/notifications',
        color: '#ff5252',
      },
    ];
  });

  readonly adminAccountStatusChart = computed(
    () => this.adminKpis()?.charts.accountsByStatus || [],
  );
  readonly memberGrowthChart = computed(
    () => this.adminKpis()?.charts.newAccountsPerMonth || [],
  );
  readonly adminRoleDistributionChart = computed(
    () => this.adminKpis()?.charts.rolesDistribution || [],
  );
  readonly adminRecentActivity = computed(
    () => this.adminKpis()?.recentActivity || [],
  );
  readonly priorityArticles = computed(
    () => this.labHeadKpis()?.priorityQueue.articles || [],
  );
  readonly priorityPurchases = computed(
    () => this.labHeadKpis()?.priorityQueue.purchaseRequests || [],
  );
  readonly projectStatusOverview = computed(
    () => this.labHeadKpis()?.projectStatusOverview || [],
  );
  readonly recentArticleDecisions = computed(
    () => this.labHeadKpis()?.recentArticleDecisions || [],
  );
  readonly memberArticleStatusChart = computed(() => {
    const byStatus = this.memberArticles().reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.statut] = (acc[item.statut] || 0) + 1;
        return acc;
      },
      {},
    );

    return [
      { status: 'BROUILLON', label: 'BROUILLON', value: byStatus['BROUILLON'] || 0 },
      { status: 'SOUMIS', label: 'SOUMIS', value: byStatus['SOUMIS'] || 0 },
      { status: 'VALIDE', label: 'VALIDE', value: byStatus['VALIDE'] || 0 },
      { status: 'PUBLIE', label: 'PUBLIE', value: byStatus['PUBLIE'] || 0 },
      { status: 'REJETE', label: 'REJETE', value: byStatus['REJETE'] || 0 },
    ];
  });
  readonly memberPurchaseStatusChart = computed(() => {
    const byStatus = this.memberPurchases().reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.statut] = (acc[item.statut] || 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(byStatus).map(([status, value]) => ({
      status,
      value,
    }));
  });

  readonly greetingLabel = { fr: 'Bonjour', en: 'Hello', ar: 'مرحبا' };
  readonly platformLabel = { fr: 'Plateforme', en: 'Platform', ar: 'المنصة' };

  async ngOnInit() {
    await this.loadDashboard();
  }

  private get token() {
    return this.auth.session()?.accessToken || '';
  }

  async loadDashboard() {
    if (!this.token) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      if (this.isAdmin()) {
        const adminData = await api.getAdminDashboardKPIs(this.token);
        this.adminKpis.set(adminData);
        this.labHeadKpis.set(null);
        this.memberArticles.set([]);
        this.memberProjects.set([]);
        this.memberPurchases.set([]);
        this.memberNotifications.set([]);
      } else if (this.isLabHead()) {
        const labHeadData = await api.getLabHeadDashboardKPIs(this.token);
        this.labHeadKpis.set(labHeadData);
        this.adminKpis.set(null);
        this.memberArticles.set([]);
        this.memberProjects.set([]);
        this.memberPurchases.set([]);
        this.memberNotifications.set([]);
      } else {
        const [articlesResponse, projectsResponse, purchasesResponse, notificationsResponse] =
          await Promise.all([
            api.listMemberArticles(this.token),
            api.listProjects(this.token, { limit: 20 }),
            api.listPurchaseRequests(this.token, { limit: 20 }),
            api.listNotifications(this.token, { limit: 20 }),
          ]);

        this.adminKpis.set(null);
        this.labHeadKpis.set(null);
        this.memberArticles.set(articlesResponse.articles);
        this.memberProjects.set(projectsResponse.elements);
        this.memberPurchases.set(purchasesResponse.elements);
        this.memberNotifications.set(notificationsResponse.elements);
      }
    } catch (error) {
      this.adminKpis.set(null);
      this.labHeadKpis.set(null);
      this.memberArticles.set([]);
      this.memberProjects.set([]);
      this.memberPurchases.set([]);
      this.memberNotifications.set([]);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Impossible de charger le dashboard.',
              en: 'Unable to load dashboard.',
              ar: 'تعذر تحميل لوحة التحكم.',
            }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  adminArticleStatusMax() {
    const values = this.adminAccountStatusChart().map((item) => item.value);
    return Math.max(1, ...values);
  }

  memberArticleStatusMax() {
    const values = this.memberArticleStatusChart().map((item) => item.value);
    return Math.max(1, ...values);
  }

  barWidth(value: number, max: number) {
    if (!value) {
      return 0;
    }

    return Math.max(8, Math.round((value / Math.max(1, max)) * 100));
  }

  memberLinePoints() {
    const points = this.memberGrowthChart();
    const width = 320;
    const height = 120;
    const padding = 10;
    const max = Math.max(1, ...points.map((item) => item.value));

    if (!points.length) {
      return `${padding},${height - padding} ${width - padding},${height - padding}`;
    }

    return points
      .map((point, index) => {
        const x =
          padding +
          (index * (width - padding * 2)) / Math.max(1, points.length - 1);
        const y =
          height -
          padding -
          (point.value / max) * (height - padding * 2);

        return `${x},${y}`;
      })
      .join(' ');
  }

  purchaseDonutGradient() {
    const segments = this.adminRoleDistributionChart().filter((item) => item.value > 0);
    const total = segments.reduce((sum, item) => sum + item.value, 0);

    if (!segments.length || !total) {
      return 'conic-gradient(var(--muted) 0deg 360deg)';
    }

    let start = 0;
    const stops = segments.map((segment) => {
      const end = start + (segment.value / total) * 360;
      const color = this.roleColor(segment.role);
      const stop = `${color} ${start}deg ${end}deg`;
      start = end;
      return stop;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  memberPurchaseDonutGradient() {
    const segments = this.memberPurchaseStatusChart().filter((item) => item.value > 0);
    const total = segments.reduce((sum, item) => sum + item.value, 0);

    if (!segments.length || !total) {
      return 'conic-gradient(var(--muted) 0deg 360deg)';
    }

    let start = 0;
    const stops = segments.map((segment) => {
      const end = start + (segment.value / total) * 360;
      const color = this.purchaseStatusColor(segment.status);
      const stop = `${color} ${start}deg ${end}deg`;
      start = end;
      return stop;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  memberRecentArticles() {
    return [...this.memberArticles()]
      .sort((a, b) =>
        new Date(b.modifieLe).getTime() - new Date(a.modifieLe).getTime(),
      )
      .slice(0, 8);
  }

  statusColor(status: string) {
    switch (status) {
      case 'ACTIF':
        return '#00e676';
      case 'DESACTIVE':
        return '#7f94b0';
      case 'BROUILLON':
        return '#7f94b0';
      case 'SOUMIS':
      case 'EN_ATTENTE':
        return '#ffab00';
      case 'VALIDE':
      case 'ACCEPTEE':
        return '#00e676';
      case 'REJETE':
      case 'REFUSE':
      case 'REJETEE':
        return '#ff5252';
      case 'PUBLIE':
      case 'COMMANDEE':
        return '#00c8ff';
      case 'LIVREE':
        return '#1d4ed8';
      default:
        return 'var(--primary)';
    }
  }

  purchaseStatusColor(status: string) {
    return this.statusColor(status);
  }

  roleColor(role: string) {
    switch (role) {
      case 'ADMINISTRATEUR':
        return '#00c8ff';
      case 'CHEF_LABO':
        return '#ffab00';
      case 'MEMBRE':
        return '#00e676';
      default:
        return '#7f94b0';
    }
  }

  activityShortLabel(type: string) {
    switch (type) {
      case 'INSCRIPTION':
        return 'NEW';
      case 'ROLE':
        return 'RLE';
      case 'ARTICLE':
        return 'ART';
      case 'DEMANDE':
        return 'ACH';
      case 'MESSAGE':
        return 'MSG';
      case 'PROJET':
        return 'PRJ';
      case 'COMPTE':
        return 'USR';
      default:
        return 'LOG';
    }
  }

  activityColor(type: string) {
    switch (type) {
      case 'INSCRIPTION':
        return '#ffab00';
      case 'ROLE':
        return '#00c8ff';
      case 'ARTICLE':
        return '#00c8ff';
      case 'DEMANDE':
        return '#ffab00';
      case 'MESSAGE':
        return '#1d4ed8';
      case 'PROJET':
        return '#00e676';
      case 'COMPTE':
        return '#ff5252';
      default:
        return 'var(--primary)';
    }
  }

  activitySurface(type: string) {
    const color = this.activityColor(type);
    return `color-mix(in srgb, ${color} 15%, white)`;
  }

  normalizeStatusLabel(status: string) {
    let normalized = status;
    switch (status) {
      case 'SOUMIS':
        normalized = 'EN_ATTENTE';
        break;
      case 'REJETE':
        normalized = 'REFUSE';
        break;
      case 'EN_COURS_TRAITEMENT':
        normalized = 'EN_COURS';
        break;
      default:
        normalized = status;
        break;
    }

    switch (normalized) {
      case 'BROUILLON':
        return this.site.localize({ fr: 'Brouillon', en: 'Draft', ar: 'مسودة' });
      case 'EN_ATTENTE':
        return this.site.localize({
          fr: 'En attente',
          en: 'Pending',
          ar: 'قيد الانتظار',
        });
      case 'VALIDE':
        return this.site.localize({ fr: 'Valide', en: 'Approved', ar: 'معتمد' });
      case 'PUBLIE':
        return this.site.localize({
          fr: 'Publie',
          en: 'Published',
          ar: 'منشور',
        });
      case 'REFUSE':
      case 'REJETEE':
        return this.site.localize({ fr: 'Refuse', en: 'Rejected', ar: 'مرفوض' });
      case 'ACTIF':
        return this.site.localize({ fr: 'Actif', en: 'Active', ar: 'نشط' });
      case 'DESACTIVE':
        return this.site.localize({
          fr: 'Desactive',
          en: 'Disabled',
          ar: 'معطل',
        });
      case 'EN_COURS':
        return this.site.localize({
          fr: 'En cours',
          en: 'In progress',
          ar: 'قيد التنفيذ',
        });
      case 'TERMINE':
        return this.site.localize({
          fr: 'Termine',
          en: 'Completed',
          ar: 'مكتمل',
        });
      case 'ARCHIVE':
        return this.site.localize({
          fr: 'Archive',
          en: 'Archived',
          ar: 'مؤرشف',
        });
      case 'ACCEPTEE':
      case 'ACCEPTER':
        return this.site.localize({
          fr: 'Acceptee',
          en: 'Accepted',
          ar: 'مقبول',
        });
      case 'REJETER':
        return this.site.localize({
          fr: 'Rejetee',
          en: 'Rejected',
          ar: 'مرفوض',
        });
      case 'COMMANDEE':
        return this.site.localize({
          fr: 'Commandee',
          en: 'Ordered',
          ar: 'تم الطلب',
        });
      case 'LIVREE':
        return this.site.localize({ fr: 'Livree', en: 'Delivered', ar: 'تم التسليم' });
      default:
        return normalized;
    }
  }

  roleDisplayLabel(role: string, fallback: string) {
    switch (role) {
      case 'ADMINISTRATEUR':
        return this.site.localize({
          fr: 'Administrateur',
          en: 'Administrator',
          ar: 'مسؤول',
        });
      case 'CHEF_LABO':
        return this.site.localize({ fr: 'Chef labo', en: 'Lab head', ar: 'رئيس المختبر' });
      case 'MEMBRE':
        return this.site.localize({ fr: 'Membre', en: 'Member', ar: 'عضو' });
      default:
        return fallback;
    }
  }

  projectProgressColor(status: string) {
    switch (status) {
      case 'TERMINE':
        return '#00e676';
      case 'ARCHIVE':
        return '#7f94b0';
      default:
        return '#00c8ff';
    }
  }

  formatCurrency(value: number) {
    try {
      const locale =
        this.site.language() === 'ar'
          ? 'ar-MA'
          : this.site.language() === 'en'
            ? 'en-GB'
            : 'fr-FR';

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'TND',
        maximumFractionDigits: 3,
      }).format(value);
    } catch {
      return `${value} TND`;
    }
  }

  async validatePriorityArticle(articleId: number) {
    try {
      await api.validateArticle(this.token, articleId);
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article valide depuis la file prioritaire.',
          en: 'Article approved from the priority queue.',
          ar: 'تم اعتماد المقال من قائمة الاولوية.',
        }),
      );
      await this.loadDashboard();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Validation impossible.',
              en: 'Approval failed.',
              ar: 'تعذر الاعتماد.',
            }),
      );
    }
  }

  async rejectPriorityArticle(articleId: number) {
    const motifRejet = window.prompt(
      this.site.localize({
        fr: 'Saisir le motif de rejet de article :',
        en: 'Enter the reason for article rejection:',
        ar: 'ادخل سبب رفض المقال:',
      }),
      this.site.localize({
        fr: 'Precisions methodologiques requises.',
        en: 'Methodological details are required.',
        ar: 'مطلوبة تفاصيل منهجية اضافية.',
      }),
    );

    if (!motifRejet || !motifRejet.trim()) {
      return;
    }

    try {
      await api.refuseArticle(this.token, articleId, {
        motifRejet: motifRejet.trim(),
      });
      this.statusMessage.set(
        this.site.localize({
          fr: 'Article refuse depuis la file prioritaire.',
          en: 'Article rejected from the priority queue.',
          ar: 'تم رفض المقال من قائمة الاولوية.',
        }),
      );
      await this.loadDashboard();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Refus impossible.',
              en: 'Rejection failed.',
              ar: 'تعذر الرفض.',
            }),
      );
    }
  }

  async decidePriorityPurchase(
    purchaseId: number,
    decision: 'ACCEPTER' | 'REJETER',
  ) {
    let commentaire: string | undefined;

    if (decision === 'REJETER') {
      commentaire =
        window.prompt(
          this.site.localize({
            fr: 'Saisir le motif de refus de la demande :',
            en: 'Enter the reason for request rejection:',
            ar: 'ادخل سبب رفض الطلب:',
          }),
          this.site.localize({
            fr: 'Budget ou justification a completer.',
            en: 'Budget or justification must be completed.',
            ar: 'يجب استكمال الميزانية او التبرير.',
          }),
        )?.trim() || '';

      if (!commentaire) {
        return;
      }
    }

    try {
      await api.decidePurchaseRequest(this.token, purchaseId, {
        decision,
        commentaire,
      });
      this.statusMessage.set(
        decision === 'ACCEPTER'
          ? this.site.localize({
              fr: 'Demande achat acceptee.',
              en: 'Purchase request accepted.',
              ar: 'تم قبول طلب الشراء.',
            })
          : this.site.localize({
              fr: 'Demande achat rejetee.',
              en: 'Purchase request rejected.',
              ar: 'تم رفض طلب الشراء.',
            }),
      );
      await this.loadDashboard();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Decision impossible.',
              en: 'Decision failed.',
              ar: 'تعذر تنفيذ القرار.',
            }),
      );
    }
  }
}
