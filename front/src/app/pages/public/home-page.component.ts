import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HomeData, NewsStatus } from '../../core/models/models';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { formatDate } from '../../core/utils/format';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section
      id="accueil"
      class="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
    >
      <img
        src="assets/back.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover animate-scale-in"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/95"></div>

      <div class="relative z-10 page-shell max-w-4xl px-4 text-center">
        <p class="mb-4 text-sm uppercase tracking-[0.3em] text-secondary font-bold animate-fade-in-up">
          {{ site.localize(cnstnLabel) }}
        </p>
        <h1
          class="mb-6 text-5xl font-extrabold leading-tight text-primary-foreground sm:text-6xl lg:text-7xl animate-fade-in-up delay-100 font-serif"
          style="font-family: 'Playfair Display', serif;"
        >
          {{ site.localize(heroHeadingPrefix) }}<br class="hidden sm:block"/>
          <span class="text-gradient-gold drop-shadow-2xl">LR16CNSTN02</span>
        </h1>
        <p
          class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl animate-fade-in-up delay-200 font-light"
        >
          {{ homeData()?.hero?.accroche || site.localize(heroSubtitle) }}
        </p>
        <div
          class="flex flex-col items-center justify-center gap-6 sm:flex-row animate-fade-in-up delay-300"
        >
          <a
            routerLink="/articles"
            class="rounded-full bg-secondary px-10 py-4 text-sm font-bold tracking-widest text-secondary-foreground shadow-[0_0_20px_rgba(var(--secondary),0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(var(--secondary),0.5)] active:scale-95"
          >
            {{ site.localize(discoverLabel) }}
          </a>
          <a
            routerLink="/contact"
            class="rounded-full border-2 border-primary-foreground/40 bg-white/5 backdrop-blur-sm px-10 py-4 text-sm font-bold tracking-widest text-primary-foreground transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-primary-foreground active:scale-95"
          >
            {{ site.localize(contactLabel) }}
          </a>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" class="w-full">
          <path
            d="M0 40C360 80 720 0 1080 40C1260 60 1380 50 1440 40V80H0V40Z"
            fill="hsl(220 20% 97%)"
          />
        </svg>
      </div>
    </section>

    <section id="apropos" class="bg-background py-24">
      <div class="page-shell">
        <div class="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p
              class="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary"
            >
              {{ site.localize(aboutTag) }}
            </p>
            <h2
              class="mb-6 text-3xl font-bold leading-snug text-foreground sm:text-4xl"
            >
              {{ site.localize(aboutTitle) }}
            </h2>

            @for (paragraph of labHistory; track paragraph.fr) {
              <p class="mb-4 leading-relaxed text-muted-foreground">
                {{ site.localize(paragraph) }}
              </p>
            }
          </div>

          <div class="flex justify-center">
            <div class="relative h-72 w-72 sm:h-80 sm:w-80">
              <div
                class="absolute inset-0 rounded-full border-2 border-secondary/20 bg-primary/5"
              ></div>
              <div
                class="absolute inset-4 flex items-center justify-center rounded-full bg-card shadow-[var(--shadow-elevated)]"
              >
                <img
                  src="assets/logo-lr02.jpg"
                  alt="Logo LR16CNSTN02"
                  class="h-40 w-40 rounded-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-muted/40 py-20">
      <div class="page-shell">
        <div class="mb-10 text-center">
          <p
            class="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary"
          >
            {{ site.localize(teamsTag) }}
          </p>
          <h2 class="text-3xl font-bold text-foreground sm:text-4xl">
            {{ site.localize(teamsTitle) }}
          </h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          @for (team of researchTeams; track team.order) {
            <article
              class="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div
                class="mb-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-secondary/18 px-3 text-sm font-semibold text-secondary-foreground"
              >
                {{ team.order }}
              </div>
              <h3 class="text-xl font-semibold leading-8 text-foreground">
                {{ site.localize(team.title) }}
              </h3>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="bg-background py-20">
      <div class="page-shell">
        <div
          class="grid items-start gap-8 rounded-3xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] lg:grid-cols-[0.35fr_0.65fr] lg:p-8"
        >
          <div class="mx-auto w-full max-w-[260px]">
            <img
              src="assets/Haikel JELASSI.jpg"
              alt="Haikel JELASSI"
              class="h-auto w-full rounded-2xl border border-border object-cover"
              loading="lazy"
              (error)="onDirectorImageError($event)"
            />
          </div>

          <div>
            <p
              class="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary"
            >
              {{ site.localize(directorTag) }}
            </p>
            <h2 class="text-3xl font-bold text-foreground sm:text-4xl">
              {{ site.localize(directorTitle) }}
            </h2>
            <p class="mt-2 text-lg font-semibold text-primary">
              Haikel JELASSI
            </p>

            <div class="mt-5 space-y-3 text-muted-foreground">
              @for (line of directorInfo; track line.fr) {
                <p>{{ site.localize(line) }}</p>
              }
            </div>

            <div class="mt-6">
              <a
                href="https://www.researchgate.net/profile/Haikel-Jelassi"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {{ site.localize(viewProfileLabel) }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="relative py-20 overflow-hidden group">
      <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] group-hover:scale-110"
           style="background-image: url('assets/nucl.jpg'); background-attachment: fixed;">
      </div>
      <div class="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-primary/80"></div>

      <div class="page-shell relative z-10">
        <div class="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          @for (s of stats(); track s.label.fr) {
            <div class="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:shadow-secondary/20">
              <p class="text-4xl font-extrabold text-secondary sm:text-5xl font-serif" style="font-family: 'Playfair Display', serif;">
                {{ s.value }}
              </p>
              <p class="mt-3 text-sm tracking-wider uppercase font-medium text-white/90">
                {{ site.localize(s.label) }}
              </p>
            </div>
          }
        </div>
      </div>
    </section>

    <section id="recherche" class="bg-background py-24">
      <div class="page-shell">
        <div
          class="mb-14 flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left"
        >
          <div>
            <p
              class="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary"
            >
              {{ site.localize(researchTag) }}
            </p>
            <h2 class="text-3xl font-bold text-foreground sm:text-4xl">
              {{ site.localize(researchTitle) }}
            </h2>
          </div>
          <a routerLink="/articles" class="btn-outline h-11 rounded-lg px-5">
            {{ site.localize(viewAllArticlesLabel) }}
          </a>
        </div>

        <div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          @for (a of recentArticles(); track a.id) {
            <a
              [routerLink]="['/articles', a.id]"
              class="group cursor-pointer rounded-2xl glass-card transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-full bg-white border border-gray-100 hover:border-blue-100"
            >
              <div class="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-125"></div>
              <div class="flex h-full flex-col p-8 z-10">
                <span
                  class="w-fit rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-primary mb-5"
                  >{{ a.categorie?.libelle || 'AUTRE' }}</span
                >
                <h3
                  class="text-xl font-bold leading-snug text-foreground group-hover:text-primary transition-colors mb-4 line-clamp-3"
                  style="font-family: 'Playfair Display', serif;"
                >
                  {{ a.titre }}
                </h3>
                <p class="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  {{ a.resume }}
                </p>
                <div
                  class="mt-6 flex items-center justify-between border-t border-border/40 pt-5"
                >
                  <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {{ formatDate(a.publieLe || a.creeLe) }}
                  </span>
                  <div class="text-sm font-bold text-primary flex items-center gap-1 group-hover:text-secondary transition-colors">
                    {{ site.localize(readArticleLabel) }}
                    <span class="transform transition-transform group-hover:translate-x-1">&rarr;</span>
                  </div>
                </div>
              </div>
            </a>
          }
        </div>
      </div>
    </section>

    <section id="actualites" class="bg-muted/40 py-24">
      <div class="page-shell">
        <div class="mb-14 text-center">
          <p
            class="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary"
          >
            {{ site.localize(newsTag) }}
          </p>
          <h2 class="text-3xl font-bold text-foreground sm:text-4xl">
            {{ site.localize(newsTitle) }}
          </h2>
        </div>

        <div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          @for (n of recentNews(); track n.id) {
            <a
              [routerLink]="['/news', n.id]"
              class="group cursor-pointer rounded-2xl glass-card transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-full bg-white border border-gray-100 hover:border-secondary/30"
            >
              <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-150 group-hover:bg-primary/10"></div>
              <div class="flex h-full flex-col p-8 z-10">
                <span
                  class="w-fit rounded-full px-3 py-1.5 text-xs font-bold tracking-wider uppercase mb-5 shadow-sm"
                  [class]="tagColor(n.statut)"
                >
                  <span class="inline-block w-2 h-2 rounded-full mr-1" [class.bg-secondary]="n.statut === 'PUBLIEE'" [class.bg-primary]="n.statut !== 'PUBLIEE'"></span>
                  {{ n.statut === 'PUBLIEE' ? 'Évènement' : 'Actualité' }}
                </span>
                <h3
                  class="text-xl font-bold leading-snug text-foreground group-hover:text-secondary transition-colors mb-4 line-clamp-3"
                  style="font-family: 'Playfair Display', serif;"
                >
                  {{ n.titre }}
                </h3>
                <p class="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  {{ n.resume || n.contenu }}
                </p>
                <div
                  class="mt-6 border-t border-border/40 pt-5 text-xs font-medium text-slate-400 flex items-center justify-between"
                >
                  <span class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {{ formatDate(n.publieeLe || n.creeLe) }}
                  </span>
                  <span class="text-secondary font-bold group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomePageComponent implements OnInit {
  readonly site = inject(SitePreferencesService);
  readonly homeData = signal<HomeData | null>(null);
  readonly formatDate = formatDate;

  readonly cnstnLabel = {
    fr: 'Centre National des Sciences et Technologies Nucleaires',
    en: 'National Center for Nuclear Sciences and Technologies',
    ar: 'المركز الوطني للعلوم والتكنولوجيا النووية',
  };
  readonly heroHeadingPrefix = {
    fr: 'Laboratoire de Recherche ',
    en: 'Research Laboratory ',
    ar: 'مختبر البحث ',
  };
  readonly heroSubtitle = {
    fr: 'Contribuer a l avancement des sciences nucleaires et des technologies associees a travers la recherche fondamentale et appliquee.',
    en: 'Advancing nuclear sciences and related technologies through fundamental and applied research.',
    ar: 'المساهمة في تطوير العلوم النووية والتقنيات المرتبطة بها عبر البحث الأساسي والتطبيقي.',
  };
  readonly discoverLabel = {
    fr: 'Decouvrir nos travaux',
    en: 'Discover our work',
    ar: 'اكتشف أعمالنا',
  };
  readonly contactLabel = {
    fr: 'Nous contacter',
    en: 'Contact us',
    ar: 'اتصل بنا',
  };
  readonly aboutTag = { fr: 'A propos', en: 'About', ar: 'حول' };
  readonly aboutTitle = {
    fr: 'Un laboratoire au service de la science et de la societe',
    en: 'A laboratory serving science and society',
    ar: 'مختبر في خدمة العلم والمجتمع',
  };
  readonly labHistory = [
    {
      fr: 'Le LR16CNSTN02 est un jeune laboratoire créé initialement en 2016. Plusieurs de ses membres étaient affectés avant 2016 à une unité de recherche au CNSTN. Le présent cycle correspond ainsi au premier cycle du laboratoire de recherche.',
      en: 'LR16CNSTN02 is a young laboratory established in 2016. Several members were previously assigned to a CNSTN research unit before 2016, making the current period the first full cycle of the laboratory.',
      ar: 'مختبر LR16CNSTN02 مختبر حديث أُنشئ سنة 2016. وكان عدد من أعضائه منتمين سابقا إلى وحدة بحث داخل CNSTN، ما يجعل هذه الفترة أول دورة كاملة للمختبر.',
    },
    {
      fr: "Nous disposons d'ores et déjà d'un savoir-faire acquis dans les applications pacifiques du nucléaire grâce aux travaux réalisés dans le cadre de l'UR04CNSTN02.",
      en: 'The laboratory already benefits from established know-how in peaceful nuclear applications, built through work completed within UR04CNSTN02.',
      ar: 'يمتلك المختبر خبرة متراكمة في التطبيقات السلمية للتقنيات النووية بفضل الأعمال المنجزة ضمن UR04CNSTN02.',
    },
    {
      fr: "Cette expertise est mise en œuvre autour des grands instruments, de l'énergie, des matériaux, de l'environnement, de la dosimétrie, de la bio-dosimétrie, de la radio-analyse, de la radiochimie, de la physique atomique, de la métrologie et de l'instrumentation.",
      en: 'This expertise is deployed across large instruments, energy, materials, environment, dosimetry, biodosimetry, radio-analysis, radiochemistry, atomic physics, metrology, and instrumentation.',
      ar: 'تُفعّل هذه الخبرة في مجالات الأجهزة الكبرى والطاقة والمواد والبيئة والقياس الجرعي والقياس الجرعي الحيوي والتحليل الإشعاعي والكيمياء الإشعاعية والفيزياء الذرية والمعايرة والأجهزة العلمية.',
    },
    {
      fr: 'Un nouveau directeur du laboratoire a été désigné en septembre 2018, suite au détachement du premier directeur.',
      en: 'A new laboratory director was appointed in September 2018, following the reassignment of the first director.',
      ar: 'تم تعيين مدير جديد للمختبر في سبتمبر 2018 بعد انتقال المدير الأول.',
    },
  ];

  readonly teamsTag = {
    fr: 'Equipes de recherche',
    en: 'Research teams',
    ar: 'فرق البحث',
  };
  readonly teamsTitle = {
    fr: 'Axes structurants du laboratoire',
    en: 'Structuring laboratory teams',
    ar: 'المحاور الهيكلية للمختبر',
  };

  readonly researchTeams = [
    {
      order: '1',
      title: {
        fr: 'Développements des techniques radiochimiques dans la sécurité alimentaire et environnementale',
        en: 'Development of radiochemical techniques for food and environmental safety',
        ar: 'تطوير التقنيات الكيميائية الإشعاعية في السلامة الغذائية والبيئية',
      },
    },
    {
      order: '2',
      title: {
        fr: 'Matériaux irradiés pour la dosimétrie, la détection, l’environnement et l’énergie',
        en: 'Irradiated materials for dosimetry, detection, environment, and energy',
        ar: 'المواد المشععة للقياس الجرعي والكشف والبيئة والطاقة',
      },
    },
    {
      order: '3',
      title: {
        fr: 'Modélisation physique, applications et développement expérimental pour des systèmes nucléaires et grands instruments',
        en: 'Physical modeling, applications, and experimental development for nuclear systems and large instruments',
        ar: 'النمذجة الفيزيائية والتطبيقات والتطوير التجريبي للأنظمة النووية والأجهزة الكبرى',
      },
    },
    {
      order: '4',
      title: {
        fr: 'Instrumentation et modélisation nucléaire pour la dosimétrie, la métrologie, la spectrométrie et la spectroscopie de haute résolution',
        en: 'Nuclear instrumentation and modeling for dosimetry, metrology, spectrometry, and high-resolution spectroscopy',
        ar: 'الأجهزة والنمذجة النووية للقياس الجرعي والمعايرة والقياس الطيفي والتحليل الطيفي عالي الدقة',
      },
    },
  ];

  readonly directorTag = { fr: 'Direction', en: 'Leadership', ar: 'الإدارة' };
  readonly directorTitle = {
    fr: 'Chef du laboratoire',
    en: 'Laboratory head',
    ar: 'رئيس المختبر',
  };
  readonly directorInfo = [
    {
      fr: 'Laboratoire en Énergie et Matière pour le Développement des Sciences Nucléaires (Code : LR16CNSTN02)',
      en: 'Laboratory in Energy and Matter for the Development of Nuclear Sciences (Code: LR16CNSTN02)',
      ar: 'مختبر الطاقة والمادة لتطوير العلوم النووية (LR16CNSTN02)',
    },
    {
      fr: 'Centre National des Sciences et Technologies Nucléaires',
      en: 'National Center for Nuclear Sciences and Technologies',
      ar: 'المركز الوطني للعلوم والتكنولوجيا النووية',
    },
    {
      fr: 'CNSTN, Pôle Technologique, 2020 Sidi Thabet',
      en: 'CNSTN, Technological Pole, 2020 Sidi Thabet',
      ar: 'CNSTN، القطب التكنولوجي، 2020 سيدي ثابت',
    },
  ];
  readonly viewProfileLabel = {
    fr: 'Voir le profil ResearchGate',
    en: 'View ResearchGate profile',
    ar: 'عرض ملف ResearchGate',
  };
  readonly researchTag = { fr: 'Articles', en: 'Articles', ar: 'المقالات' };
  readonly researchTitle = {
    fr: 'Articles scientifiques recents',
    en: 'Recent scientific articles',
    ar: 'مقالات علمية حديثة',
  };
  readonly viewAllArticlesLabel = {
    fr: 'Voir tous les articles',
    en: 'View all articles',
    ar: 'عرض جميع المقالات',
  };
  readonly readArticleLabel = {
    fr: 'Lire l article ->',
    en: 'Read article ->',
    ar: 'قراءة المقال ->',
  };
  readonly newsTag = { fr: 'Actualites', en: 'News', ar: 'الاخبار' };
  readonly newsTitle = {
    fr: 'Dernieres nouvelles du laboratoire',
    en: 'Latest laboratory news',
    ar: 'آخر أخبار المختبر',
  };

  readonly stats = computed(() => {
    const chiffres = this.homeData()?.chiffres || [];
    const chercheurs =
      chiffres.find((c) => c.libelle.toLowerCase().includes('cherche'))
        ?.valeur ?? 25;
    const articles =
      chiffres.find((c) => c.libelle.toLowerCase().includes('article'))
        ?.valeur ?? 120;
    const theses =
      chiffres.find((c) => c.libelle.toLowerCase().includes('these'))?.valeur ??
      15;
    const projets =
      chiffres.find((c) => c.libelle.toLowerCase().includes('projet'))
        ?.valeur ?? 8;

    return [
      {
        value: `${chercheurs}+`,
        label: { fr: 'Chercheurs', en: 'Researchers', ar: 'باحثون' },
      },
      {
        value: `${articles}+`,
        label: { fr: 'Publications', en: 'Publications', ar: 'منشورات' },
      },
      {
        value: `${theses}`,
        label: { fr: 'Theses soutenues', en: 'Defended theses', ar: 'أطروحات' },
      },
      {
        value: `${projets}`,
        label: {
          fr: 'Projets en cours',
          en: 'Active projects',
          ar: 'مشاريع جارية',
        },
      },
    ];
  });

  readonly recentArticles = computed(() =>
    (this.homeData()?.articlesRecents || []).slice(0, 3),
  );
  readonly recentNews = computed(() =>
    (this.homeData()?.actualitesRecentes || []).slice(0, 3),
  );

  tagColor(statut: NewsStatus) {
    return statut === 'PUBLIEE'
      ? 'bg-secondary/15 text-secondary'
      : 'bg-primary/10 text-primary';
  }

  onDirectorImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }

    if (!img.src.includes('logo-lr02.jpg')) {
      img.src = 'assets/logo-lr02.jpg';
    }
  }

  async ngOnInit() {
    try {
      this.homeData.set(await api.getHome());
    } catch {
      this.homeData.set(null);
    }
  }
}
