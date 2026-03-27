import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { AboutData } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { CnstnLogoComponent } from '../../shared/components/cnstn-logo.component';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [LucideAngularModule, CnstnLogoComponent],
  template: `
    <section class="page-shell py-8">
      <div
        class="hero-banner--light surface-card about-hero-shell px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14"
      >
        <div class="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
          <div class="about-logo-shell">
            <app-cnstn-logo [width]="172"></app-cnstn-logo>
          </div>
          <div class="space-y-5">
            <div class="tag-chip">{{ site.localize(aboutTagLabel) }}</div>
            <h1
              class="text-4xl font-bold text-foreground sm:text-5xl lg:text-7xl"
            >
              {{ site.localize(aboutTitle) }}
            </h1>
            <p
              class="max-w-5xl text-base leading-8 text-muted-foreground sm:text-lg sm:leading-9"
            >
              {{ site.localize(introductionText) }}
            </p>
            <p
              class="max-w-4xl text-base leading-7 text-muted-foreground sm:leading-8"
            >
              {{
                about()?.presentation || site.localize(defaultPresentationText)
              }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-6 sm:p-8 lg:p-10">
        <div class="app-page-header">
          <div>
            <div class="tag-chip">{{ site.localize(researchTeamsLabel) }}</div>
            <h2 class="app-page-title mt-4">{{ site.localize(teamsTitle) }}</h2>
            <p class="app-page-description mt-3">
              {{ site.localize(teamsDescription) }}
            </p>
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div class="surface-muted p-6">
            <div
              class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              {{ site.localize(programVisionLabel) }}
            </div>
            <h3 class="mt-3 text-3xl font-semibold text-foreground">
              {{ site.localize(researchCycleTitle) }}
            </h3>
            <p class="mt-4 text-base leading-8 text-muted-foreground">
              {{ site.localize(researchCycleText) }}
            </p>

            <div class="mt-6 space-y-3">
              @for (team of localizedResearchTeams(); track team.order) {
                <div
                  class="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span
                    class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-xs font-semibold text-primary"
                    >{{ team.order }}</span
                  >
                  <div class="text-sm font-medium text-foreground">
                    {{ team.shortTitle }}
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="grid gap-4">
            @for (team of localizedResearchTeams(); track team.order) {
              <article class="about-team-card h-full">
                <div class="flex items-start justify-between gap-4">
                  <div class="about-team-card__index">{{ team.order }}</div>
                  <div
                    class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary"
                  >
                    <lucide-icon
                      [img]="team.icon"
                      class="h-5 w-5"
                    ></lucide-icon>
                  </div>
                </div>
                <h3 class="about-team-card__title">{{ team.title }}</h3>
                <p class="mt-3 text-sm leading-7 text-muted-foreground">
                  {{ team.summary }}
                </p>
                <div class="mt-4">
                  <div
                    class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    {{ site.localize(expertisesLabel) }}
                  </div>
                  <ul class="mt-3 space-y-2">
                    @for (expertise of team.expertises; track expertise) {
                      <li
                        class="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm leading-6 text-muted-foreground"
                      >
                        {{ expertise }}
                      </li>
                    }
                  </ul>
                </div>
                <div class="mt-4">
                  <div
                    class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    {{ site.localize(researchObjectivesLabel) }}
                  </div>
                  <ul class="mt-3 space-y-2">
                    @for (objective of team.objectives; track objective) {
                      <li
                        class="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm leading-6 text-muted-foreground"
                      >
                        {{ objective }}
                      </li>
                    }
                  </ul>
                </div>
              </article>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="surface-card surface-card--interactive p-8">
          <div
            class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60"
          >
            <lucide-icon
              [img]="icons.Atom"
              class="h-7 w-7 text-primary"
            ></lucide-icon>
          </div>
          <h2 class="text-4xl font-bold text-foreground">
            {{ site.localize(contextTitle) }}
          </h2>
          <p class="mt-4 text-lg leading-8 text-muted-foreground">
            {{ site.localize(contextTextPrimary) }}
          </p>
          <p class="mt-4 text-base leading-8 text-muted-foreground">
            {{ site.localize(contextTextSecondary) }}
          </p>
        </div>
        <div class="surface-card surface-card--interactive p-8">
          <div
            class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60"
          >
            <lucide-icon
              [img]="icons.TrendingUp"
              class="h-7 w-7 text-primary"
            ></lucide-icon>
          </div>
          <h2 class="text-4xl font-bold text-foreground">
            {{ site.localize(labObjectivesTitle) }}
          </h2>
          <ul class="mt-4 space-y-2">
            @for (objective of labObjectives; track objective.fr) {
              <li
                class="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm leading-7 text-muted-foreground"
              >
                {{ site.localize(objective) }}
              </li>
            }
          </ul>
        </div>
      </div>
    </section>

    <section class="page-shell py-8">
      <div class="surface-card p-8 lg:p-10">
        <div class="mb-8">
          <div class="tag-chip">
            {{ site.localize(scientificExcellenceLabel) }}
          </div>
          <h2 class="mt-4 text-5xl font-bold text-foreground">
            {{ site.localize(structureExpertiseTitle) }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            {{ site.localize(structureExpertiseText) }}
          </p>
        </div>

        <div class="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div class="surface-muted p-6">
            <div class="mb-5 text-2xl font-semibold text-foreground">
              {{ site.localize(teamsDistributionTitle) }}
            </div>
            <div class="space-y-4">
              @for (team of about()?.equipesRecherche || []; track team.id) {
                <div>
                  <div
                    class="mb-2 flex items-center justify-between gap-4 text-sm"
                  >
                    <span class="font-semibold text-foreground">{{
                      team.code
                    }}</span>
                    <span class="text-muted-foreground">{{ team.nom }}</span>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.width.%]="20 + ($index + 1) * 12"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="surface-muted p-6">
            <div class="mb-5 text-2xl font-semibold text-foreground">
              {{ site.localize(keyFiguresTitle) }}
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">
                  {{ site.localize(institutionsLabel) }}
                </div>
                <div class="mt-2 text-4xl font-bold">
                  {{ about()?.institutions?.length || 0 }}
                </div>
              </div>
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">
                  {{ site.localize(teamsLabel) }}
                </div>
                <div class="mt-2 text-4xl font-bold">
                  {{ about()?.equipesRecherche?.length || 0 }}
                </div>
              </div>
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">
                  {{ site.localize(categoriesLabel) }}
                </div>
                <div class="mt-2 text-4xl font-bold">
                  {{ about()?.categoriesArticle?.length || 0 }}
                </div>
              </div>
            </div>
            <div class="mt-6 rounded-3xl border border-border/60 bg-card p-6">
              <div class="text-2xl font-semibold text-foreground">
                {{ site.localize(coveredDomainsTitle) }}
              </div>
              <div class="mt-4 flex flex-wrap gap-3">
                @for (
                  category of about()?.categoriesArticle || [];
                  track category.id
                ) {
                  <span class="badge-soft">{{ category.libelle }}</span>
                }
              </div>
            </div>
          </div>
        </div>

        <div
          class="mt-8 rounded-3xl border border-border/60 bg-card p-6 lg:p-8"
        >
          <div class="tag-chip">{{ site.localize(timelineTagLabel) }}</div>
          <h3 class="mt-4 text-3xl font-bold text-foreground">
            {{ site.localize(timelineTitle) }}
          </h3>
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            @for (step of timeline; track step.year) {
              <article
                class="rounded-2xl border border-border/70 bg-muted/40 p-5"
              >
                <div class="text-2xl font-bold text-primary">
                  {{ step.year }}
                </div>
                <h4 class="mt-2 text-lg font-semibold text-foreground">
                  {{ site.localize(step.title) }}
                </h4>
                <p class="mt-2 text-sm leading-7 text-muted-foreground">
                  {{ site.localize(step.description) }}
                </p>
              </article>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly site = inject(SitePreferencesService);
  readonly about = signal<AboutData | null>(null);
  readonly aboutTagLabel = { fr: 'À propos', en: 'About', ar: 'حول المختبر' };
  readonly aboutTitle = {
    fr: 'À propos de LR16CNSTN02',
    en: 'About LR16CNSTN02',
    ar: 'حول LR16CNSTN02',
  };
  readonly introductionText = {
    fr: 'Le laboratoire LR16CNSTN02, créé en 2016, est situé au Pôle Technologique Sidi Thabet, Tunis. Il dispose d une expertise héritée de l ancienne unité UR04CNSTN02 consacrée à la maîtrise et au développement des techniques nucléaires pour la protection de l homme et de son environnement.',
    en: 'The LR16CNSTN02 laboratory, created in 2016 and located at the Sidi Thabet Technological Pole in Tunis, builds on expertise inherited from the former UR04CNSTN02 research unit.',
    ar: 'مختبر LR16CNSTN02 أُنشئ سنة 2016 ويتمركز في القطب التكنولوجي بسيدي ثابت - تونس، ويعتمد على خبرة متراكمة من وحدة البحث السابقة UR04CNSTN02.',
  };
  readonly defaultPresentationText = {
    fr: 'Le laboratoire poursuit des travaux de recherche fondamentale et appliquée dans la continuité des efforts nationaux dédiés aux usages pacifiques des sciences nucléaires.',
    en: 'The laboratory continues fundamental and applied research in continuity with national efforts for peaceful nuclear applications.',
    ar: 'يواصل المختبر أبحاثا أساسية وتطبيقية ضمن استمرارية الجهود الوطنية لتطوير الاستخدامات السلمية للعلوم النووية.',
  };
  readonly researchTeamsLabel = {
    fr: 'Équipes de recherche',
    en: 'Research teams',
    ar: 'فرق البحث',
  };
  readonly teamsTitle = {
    fr: '4 équipes structurantes du laboratoire',
    en: '4 structuring laboratory teams',
    ar: '4 فرق بحثية محورية في المختبر',
  };
  readonly teamsDescription = {
    fr: 'Le laboratoire LR16CNSTN02 est organisé en 4 équipes spécialisées, dotées d expertises complémentaires en énergie nucléaire et matériaux.',
    en: 'Each team covers a priority scientific axis with an applied focus on peaceful nuclear uses.',
    ar: 'تغطي كلّ فرقة محورًا علميًا ذا أولوية مع توجّه تطبيقي نحو الاستخدامات السلمية للتقنيات النووية.',
  };
  readonly programVisionLabel = {
    fr: 'Vision de programme',
    en: 'Program vision',
    ar: 'رؤية البرنامج',
  };
  readonly researchCycleTitle = {
    fr: 'Cycle de recherche LR16CNSTN02',
    en: 'LR16CNSTN02 Research cycle',
    ar: 'دورة البحث LR16CNSTN02',
  };
  readonly researchCycleText = {
    fr: 'Le présent cycle correspond au premier cycle complet du laboratoire de recherche, avec consolidation des compétences, structuration des équipes et élargissement des collaborations scientifiques.',
    en: 'The laboratory consolidates the UR04CNSTN02 legacy with a trajectory focused on applications, instrumentation, and modeling for large instruments and environmental challenges.',
    ar: 'يعزّز المختبر إرث UR04CNSTN02 عبر مسار يرتكز على التطبيقات والأجهزة والنمذجة لخدمة المنظومات الكبرى والتحديات البيئية.',
  };
  readonly expertisesLabel = {
    fr: 'Expertises',
    en: 'Expertise',
    ar: 'الخبرات',
  };
  readonly researchObjectivesLabel = {
    fr: 'Objectifs de recherche',
    en: 'Research objectives',
    ar: 'أهداف البحث',
  };
  readonly contextTitle = {
    fr: 'Contexte et problématique',
    en: 'Context and challenges',
    ar: 'السياق والإشكالية',
  };
  readonly contextTextPrimary = {
    fr: 'Le Laboratoire de Recherche en Énergie et Matière s inscrit dans les efforts nationaux pour le développement des applications pacifiques des sciences nucléaires.',
    en: 'The Energy and Matter Research Laboratory is part of national efforts to develop peaceful applications of nuclear sciences.',
    ar: 'يندرج مختبر البحث في الطاقة والمادة ضمن الجهود الوطنية لتطوير التطبيقات السلمية للعلوم النووية.',
  };
  readonly contextTextSecondary = {
    fr: 'La maîtrise des technologies nucléaires représente un enjeu stratégique pour la Tunisie dans les domaines de la santé, de l agriculture, de l environnement et de l énergie.',
    en: 'Mastering nuclear technologies is a strategic challenge for Tunisia in health, agriculture, environment, and energy.',
    ar: 'يمثل التحكم في التقنيات النووية رهانا استراتيجيا لتونس في الصحة والفلاحة والبيئة والطاقة.',
  };
  readonly labObjectivesTitle = {
    fr: 'Objectifs du laboratoire',
    en: 'Laboratory objectives',
    ar: 'أهداف المختبر',
  };
  readonly labObjectives = [
    {
      fr: 'Développer la recherche fondamentale et appliquée dans le domaine de l énergie nucléaire et des matériaux.',
      en: 'Develop fundamental and applied research in nuclear energy and materials.',
      ar: 'تطوير البحث الأساسي والتطبيقي في مجال الطاقة النووية والمواد.',
    },
    {
      fr: 'Contribuer au développement des applications pacifiques du nucléaire en Tunisie.',
      en: 'Contribute to the development of peaceful nuclear applications in Tunisia.',
      ar: 'المساهمة في تطوير التطبيقات السلمية للنووي في تونس.',
    },
    {
      fr: 'Former des chercheurs et des ingénieurs hautement qualifiés.',
      en: 'Train highly qualified researchers and engineers.',
      ar: 'تكوين باحثين ومهندسين ذوي كفاءة عالية.',
    },
    {
      fr: 'Renforcer la coopération scientifique nationale et internationale.',
      en: 'Strengthen national and international scientific cooperation.',
      ar: 'تعزيز التعاون العلمي الوطني والدولي.',
    },
    {
      fr: 'Assurer le transfert de technologie vers le secteur industriel.',
      en: 'Ensure technology transfer to the industrial sector.',
      ar: 'ضمان نقل التكنولوجيا نحو القطاع الصناعي.',
    },
    {
      fr: 'Promouvoir la culture de la sûreté et de la radioprotection.',
      en: 'Promote a culture of safety and radiation protection.',
      ar: 'تعزيز ثقافة السلامة والحماية من الإشعاع.',
    },
  ];
  readonly scientificExcellenceLabel = {
    fr: 'Excellence scientifique',
    en: 'Scientific excellence',
    ar: 'التميّز العلمي',
  };
  readonly structureExpertiseTitle = {
    fr: 'Structure et expertise',
    en: 'Structure and expertise',
    ar: 'البنية والخبرة',
  };
  readonly structureExpertiseText = {
    fr: 'Le laboratoire couvre plusieurs domaines stratégiques de la science nucléaire et de ses applications.',
    en: 'The laboratory covers several strategic domains in nuclear science and its applications.',
    ar: 'يغطي المختبر عدة مجالات استراتيجية في العلوم النووية وتطبيقاتها.',
  };
  readonly teamsDistributionTitle = {
    fr: 'Répartition des équipes',
    en: 'Team distribution',
    ar: 'توزيع الفرق',
  };
  readonly keyFiguresTitle = {
    fr: 'Chiffres clés',
    en: 'Key figures',
    ar: 'الأرقام الرئيسية',
  };
  readonly institutionsLabel = {
    fr: 'Institutions',
    en: 'Institutions',
    ar: 'المؤسسات',
  };
  readonly teamsLabel = { fr: 'Équipes', en: 'Teams', ar: 'الفرق' };
  readonly categoriesLabel = {
    fr: 'Catégories',
    en: 'Categories',
    ar: 'الفئات',
  };
  readonly coveredDomainsTitle = {
    fr: 'Domaines couverts',
    en: 'Covered domains',
    ar: 'المجالات المغطاة',
  };
  readonly timelineTagLabel = {
    fr: 'Évolution du laboratoire',
    en: 'Laboratory evolution',
    ar: 'تطور المختبر',
  };
  readonly timelineTitle = {
    fr: 'Repères historiques',
    en: 'Historical milestones',
    ar: 'محطات تاريخية',
  };
  readonly timeline = [
    {
      year: '2004',
      title: {
        fr: 'Création de l UR04CNSTN02',
        en: 'Creation of UR04CNSTN02',
        ar: 'إحداث UR04CNSTN02',
      },
      description: {
        fr: 'Unité de recherche Maîtrise et développement des techniques nucléaires pour la protection de l homme et de son environnement.',
        en: 'Research unit focused on nuclear techniques for protecting people and the environment.',
        ar: 'وحدة بحث متخصصة في تقنيات نووية لحماية الإنسان وبيئته.',
      },
    },
    {
      year: '2016',
      title: {
        fr: 'Création du LR16CNSTN02',
        en: 'Creation of LR16CNSTN02',
        ar: 'إحداث LR16CNSTN02',
      },
      description: {
        fr: 'Transformation en laboratoire de recherche avec renforcement des équipes et des moyens scientifiques.',
        en: 'Transformation into a research laboratory with strengthened teams and scientific resources.',
        ar: 'تحويله إلى مختبر بحث مع تعزيز الفرق والوسائل العلمية.',
      },
    },
    {
      year: 'Aujourd hui',
      title: {
        fr: 'Laboratoire moderne et innovant',
        en: 'Modern and innovative laboratory',
        ar: 'مختبر حديث ومبتكر',
      },
      description: {
        fr: '4 équipes actives, collaborations internationales, projets d envergure et formation de la nouvelle génération de chercheurs.',
        en: '4 active teams, international collaborations, major projects, and training of new researchers.',
        ar: '4 فرق نشطة، تعاون دولي، مشاريع كبرى، وتكوين الجيل الجديد من الباحثين.',
      },
    },
  ];

  readonly researchTeams = [
    {
      order: '01',
      shortTitle: {
        fr: 'Techniques radiochimiques',
        en: 'Radiochemical techniques',
        ar: 'التقنيات الكيميائية الإشعاعية',
      },
      title: {
        fr: '1ère équipe : Développements des techniques radiochimiques dans la sécurité alimentaire et environnementale',
        en: 'Team 1: Development of radiochemical techniques for food and environmental safety',
        ar: 'الفريق 1: تطوير التقنيات الكيميائية الإشعاعية في السلامة الغذائية والبيئية',
      },
      summary: {
        fr: 'Développement et application des techniques radiochimiques pour la sécurité alimentaire et la protection de l environnement.',
        en: 'Design of radiochemical protocols for contaminant control and monitoring of food and environmental matrices.',
        ar: 'تصميم بروتوكولات كيميائية إشعاعية لمراقبة الملوثات وتتبع العينات الغذائية والبيئية.',
      },
      expertises: [
        {
          fr: 'Analyse par activation neutronique',
          en: 'Neutron activation analysis',
          ar: 'التحليل بالتنشيط النيوتروني',
        },
        {
          fr: 'Spectrométrie gamma',
          en: 'Gamma spectrometry',
          ar: 'القياس الطيفي غاما',
        },
        {
          fr: 'Radioprotection',
          en: 'Radiation protection',
          ar: 'الحماية من الإشعاع',
        },
        {
          fr: 'Contrôle qualité alimentaire',
          en: 'Food quality control',
          ar: 'مراقبة جودة الأغذية',
        },
        {
          fr: 'Surveillance environnementale',
          en: 'Environmental monitoring',
          ar: 'المراقبة البيئية',
        },
      ],
      objectives: [
        {
          fr: 'Développer des méthodes d analyse radiochimique de haute précision.',
          en: 'Develop radio-analytical methods for contaminant detection in food, soils, and water.',
          ar: 'تطوير منهجيات تحليل إشعاعي للكشف عن الملوثات في الأغذية والتربة والمياه.',
        },
        {
          fr: 'Contribuer à la sécurité alimentaire par le contrôle des contaminants.',
          en: 'Strengthen radiological traceability in production chains and sensitive ecosystems.',
          ar: 'تعزيز التتبع الإشعاعي في سلاسل الإنتاج والأنظمة البيئية الحساسة.',
        },
        {
          fr: 'Surveiller la radioactivité environnementale et assurer la formation en radioprotection.',
          en: 'Produce technical references for control laboratories and health authorities.',
          ar: 'إعداد مراجع تقنية لفائدة مخابر المراقبة والجهات الصحية.',
        },
      ],
      icon: sharedIcons.Atom,
    },
    {
      order: '02',
      shortTitle: {
        fr: 'Matériaux irradiés',
        en: 'Irradiated materials',
        ar: 'المواد المُشعَّعة',
      },
      title: {
        fr: '2ème équipe : Matériaux irradiés pour la dosimétrie, la détection, l’environnement et l’énergie',
        en: 'Team 2: Irradiated materials for dosimetry, detection, environment, and energy',
        ar: 'الفريق 2: المواد المُشعَّعة للقياس الجرعي والكشف والبيئة والطاقة',
      },
      summary: {
        fr: 'Étude du comportement des matériaux sous irradiation avec des applications en dosimétrie et en production d énergie.',
        en: 'Development of functional materials for measurement, detection, and optimization of energy and environment-constrained systems.',
        ar: 'تطوير مواد وظيفية للقياس والكشف وتحسين الأنظمة ذات القيود الطاقية والبيئية.',
      },
      expertises: [
        {
          fr: 'Dosimétrie par thermoluminescence',
          en: 'Thermoluminescent dosimetry',
          ar: 'القياس الجرعي بالوميض الحراري',
        },
        {
          fr: 'Caractérisation de matériaux irradiés',
          en: 'Characterization of irradiated materials',
          ar: 'توصيف المواد المشععة',
        },
        {
          fr: 'Effets de l irradiation',
          en: 'Irradiation effects',
          ar: 'تأثيرات الإشعاع',
        },
        {
          fr: 'Développement de dosimètres',
          en: 'Dosimeter development',
          ar: 'تطوير مقاييس الجرعة',
        },
        {
          fr: 'Applications énergétiques',
          en: 'Energy applications',
          ar: 'تطبيقات طاقية',
        },
      ],
      objectives: [
        {
          fr: 'Caractériser les modifications induites par l irradiation dans les matériaux.',
          en: 'Design advanced materials for dosimetric sensors and radiation detectors.',
          ar: 'تصميم مواد متقدمة لحساسات القياس الجرعي وكواشف الإشعاع.',
        },
        {
          fr: 'Développer de nouveaux systèmes dosimétriques.',
          en: 'Assess material behavior under irradiation for durable use in nuclear environments.',
          ar: 'تقييم أداء المواد تحت الإشعاع من أجل استخدامات مستدامة في البيئات النووية.',
        },
        {
          fr: 'Étudier les applications énergétiques et contribuer à la radioprotection par la dosimétrie.',
          en: 'Transfer innovations toward high value-added energy-environment applications.',
          ar: 'نقل الابتكارات نحو تطبيقات طاقية وبيئية عالية القيمة.',
        },
      ],
      icon: sharedIcons.Microscope,
    },
    {
      order: '03',
      shortTitle: {
        fr: 'Modélisation physique',
        en: 'Physical modeling',
        ar: 'النمذجة الفيزيائية',
      },
      title: {
        fr: '3ème équipe : Modélisation physique, applications et développement expérimental, pour des systèmes nucléaires et grands instruments',
        en: 'Team 3: Physical modeling, applications, and experimental development for nuclear systems and large instruments',
        ar: 'الفريق 3: النمذجة الفيزيائية والتطبيقات والتطوير التجريبي للأنظمة النووية والمنظومات الكبرى',
      },
      summary: {
        fr: 'Développement de modèles théoriques et de simulations numériques pour la compréhension et l optimisation des systèmes nucléaires.',
        en: 'Multiphysics simulation, experimental testing, and analysis methods to improve reliability of nuclear systems and major scientific infrastructures.',
        ar: 'محاكاة متعددة الفيزياء وتجارب مخبرية ومنهجيات تحليل لتعزيز موثوقية الأنظمة النووية والبنى العلمية الكبرى.',
      },
      expertises: [
        {
          fr: 'Modélisation Monte Carlo',
          en: 'Monte Carlo modeling',
          ar: 'نمذجة مونت كارلو',
        },
        {
          fr: 'Calculs neutroniques',
          en: 'Neutronic calculations',
          ar: 'حسابات نيوترونية',
        },
        {
          fr: 'Simulation de réacteurs',
          en: 'Reactor simulation',
          ar: 'محاكاة المفاعلات',
        },
        {
          fr: 'Codes de calcul MCNP et GEANT4',
          en: 'MCNP and GEANT4 simulation codes',
          ar: 'برمجيات MCNP و GEANT4',
        },
        {
          fr: 'Physique des réacteurs',
          en: 'Reactor physics',
          ar: 'فيزياء المفاعلات',
        },
      ],
      objectives: [
        {
          fr: 'Développer des modèles de simulation précis pour les systèmes nucléaires.',
          en: 'Build robust numerical models to predict behavior of complex nuclear systems.',
          ar: 'إعداد نماذج عددية متينة للتنبؤ بسلوك الأنظمة النووية المعقدة.',
        },
        {
          fr: 'Optimiser les configurations de réacteurs de recherche et la neutronique.',
          en: 'Couple simulation and experimentation to qualify large-instrument performance.',
          ar: 'الربط بين المحاكاة والتجريب لتقييم أداء المنظومات الكبرى.',
        },
        {
          fr: 'Former aux techniques de modélisation et de protection radiologique.',
          en: 'Optimize safety, accuracy, and availability of research experimental platforms.',
          ar: 'تحسين السلامة والدقة وجاهزية منصات البحث التجريبية.',
        },
      ],
      icon: sharedIcons.TrendingUp,
    },
    {
      order: '04',
      shortTitle: {
        fr: 'Instrumentation nucléaire',
        en: 'Nuclear instrumentation',
        ar: 'الأجهزة النووية',
      },
      title: {
        fr: '4ème équipe : Instrumentation et modélisation nucléaire pour la dosimétrie, la métrologie, la spectrométrie et la spectroscopie de haute résolution',
        en: 'Team 4: Nuclear instrumentation and modeling for dosimetry, metrology, spectrometry, and high-resolution spectroscopy',
        ar: 'الفريق 4: الأجهزة والنمذجة النووية للقياس الجرعي والمعايرة والقياس الطيفي والتحليل الطيفي عالي الدقة',
      },
      summary: {
        fr: 'Conception et développement de systèmes de détection et de mesure nucléaire de haute précision.',
        en: 'High-precision instrument architecture for dosimetry, metrology, and high-resolution spectrometry.',
        ar: 'بناء أنظمة قياس عالية الدقة للقياس الجرعي والمعايرة والقياس الطيفي عالي الدقة.',
      },
      expertises: [
        {
          fr: 'Détecteurs à semi-conducteurs',
          en: 'Semiconductor detectors',
          ar: 'كواشف أشباه الموصلات',
        },
        {
          fr: 'Électronique nucléaire',
          en: 'Nuclear electronics',
          ar: 'الإلكترونيات النووية',
        },
        {
          fr: 'Systèmes d acquisition de données',
          en: 'Data acquisition systems',
          ar: 'أنظمة اقتناء البيانات',
        },
        {
          fr: 'Spectrométrie haute résolution',
          en: 'High-resolution spectrometry',
          ar: 'قياس طيفي عالي الدقة',
        },
        {
          fr: 'Développement instrumental',
          en: 'Instrumental development',
          ar: 'تطوير الأجهزة',
        },
      ],
      objectives: [
        {
          fr: 'Concevoir et réaliser des instruments de mesure nucléaire innovants.',
          en: 'Develop high-resolution nuclear measurement chains for spectrometry and spectroscopy.',
          ar: 'تطوير سلاسل قياس نووية عالية الدقة للقياس والتحليل الطيفي.',
        },
        {
          fr: 'Améliorer les performances des systèmes de détection et l électronique associée.',
          en: 'Improve radiation metrology to ensure reliable and reproducible measurements.',
          ar: 'تحسين معايرة الإشعاع لضمان قياسات موثوقة وقابلة لإعادة الإنتاج.',
        },
        {
          fr: 'Transférer les technologies développées vers les applications industrielles.',
          en: 'Integrate advanced instrumentation tools for decision support in research and operations.',
          ar: 'دمج أدوات أجهزة متقدمة لدعم اتخاذ القرار في البحث والتشغيل.',
        },
      ],
      icon: sharedIcons.Shield,
    },
  ];

  readonly localizedResearchTeams = computed(() =>
    this.researchTeams.map((team) => ({
      order: team.order,
      shortTitle: this.site.localize(team.shortTitle),
      title: this.site.localize(team.title),
      summary: this.site.localize(team.summary),
      expertises: team.expertises.map((expertise) =>
        this.site.localize(expertise),
      ),
      objectives: team.objectives.map((objective) =>
        this.site.localize(objective),
      ),
      icon: team.icon,
    })),
  );

  async ngOnInit() {
    try {
      this.about.set(await api.getAbout());
    } catch {
      this.about.set(null);
    }
  }
}
