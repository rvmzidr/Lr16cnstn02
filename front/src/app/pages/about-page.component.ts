
import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { AboutData } from '../core/models/models';
import { api } from '../core/services/api';
import { CnstnLogoComponent } from '../shared/components/cnstn-logo.component';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [LucideAngularModule, CnstnLogoComponent],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card about-hero-shell px-8 py-10 lg:px-12 lg:py-14">
        <div class="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
          <div class="about-logo-shell">
            <app-cnstn-logo [width]="172"></app-cnstn-logo>
          </div>
          <div class="space-y-5">
            <div class="tag-chip">A propos</div>
            <h1 class="text-5xl font-bold text-foreground lg:text-7xl">A propos de LR16CNSTN02</h1>
            <p class="max-w-5xl text-lg leading-9 text-muted-foreground">
              {{ introductionText }}
            </p>
            <p class="max-w-4xl text-base leading-8 text-muted-foreground">
              {{ about()?.presentation || 'Le laboratoire renforce sa plateforme scientifique autour de la publication, de la gouvernance et de la valorisation des travaux de recherche.' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="surface-card p-8 lg:p-10">
        <div class="app-page-header">
          <div>
            <div class="tag-chip">Equipes de recherche</div>
            <h2 class="app-page-title mt-4">4 equipes structurantes du laboratoire</h2>
            <p class="app-page-description mt-3">
              Chaque equipe couvre un axe scientifique cle, avec une orientation appliquee vers les usages pacifiques du nucleaire.
            </p>
          </div>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div class="surface-muted p-6">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vision de programme</div>
            <h3 class="mt-3 text-3xl font-semibold text-foreground">Cycle de recherche LR16CNSTN02</h3>
            <p class="mt-4 text-base leading-8 text-muted-foreground">
              Le laboratoire consolide l'heritage de l'UR04CNSTN02 avec une trajectoire orientee applications, instrumentation et modelisation pour les grands instruments et les enjeux environnementaux.
            </p>

            <div class="mt-6 space-y-3">
              @for (team of researchTeams; track team.order) {
                <div class="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-xs font-semibold text-primary">{{ team.order }}</span>
                  <div class="text-sm font-medium text-foreground">{{ team.shortTitle }}</div>
                </div>
              }
            </div>
          </div>

          <div class="grid gap-4">
          @for (team of researchTeams; track team.order) {
            <article class="about-team-card">
              <div class="flex items-start justify-between gap-4">
                <div class="about-team-card__index">{{ team.order }}</div>
                <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
                  <lucide-icon [img]="team.icon" class="h-5 w-5"></lucide-icon>
                </div>
              </div>
              <h3 class="about-team-card__title">{{ team.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-muted-foreground">{{ team.summary }}</p>
            </article>
          }
          </div>
        </div>
      </div>
    </section>

    <section class="page-shell py-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="surface-card surface-card--interactive p-8">
          <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
            <lucide-icon [img]="icons.Atom" class="h-7 w-7 text-primary"></lucide-icon>
          </div>
          <h2 class="text-4xl font-bold text-foreground">Notre mission</h2>
          <p class="mt-4 text-lg leading-8 text-muted-foreground">
            {{ about()?.missions?.[0] || 'Structurer les activites scientifiques du laboratoire.' }}
          </p>
        </div>
        <div class="surface-card surface-card--interactive p-8">
          <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
            <lucide-icon [img]="icons.TrendingUp" class="h-7 w-7 text-primary"></lucide-icon>
          </div>
          <h2 class="text-4xl font-bold text-foreground">Notre vision</h2>
          <p class="mt-4 text-lg leading-8 text-muted-foreground">
            {{ about()?.missions?.[1] || 'Fluidifier les interactions entre membres et responsables.' }}
          </p>
        </div>
      </div>
    </section>

    <section class="page-shell py-8">
      <div class="surface-card p-8 lg:p-10">
        <div class="mb-8">
          <div class="tag-chip">Excellence scientifique</div>
          <h2 class="mt-4 text-5xl font-bold text-foreground">Structure et expertise</h2>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
            Le laboratoire couvre plusieurs domaines strategiques de la science nucleaire et de ses applications.
          </p>
        </div>

        <div class="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div class="surface-muted p-6">
            <div class="mb-5 text-2xl font-semibold text-foreground">Repartition des equipes</div>
            <div class="space-y-4">
              @for (team of about()?.equipesRecherche || []; track team.id) {
                <div>
                  <div class="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span class="font-semibold text-foreground">{{ team.code }}</span>
                    <span class="text-muted-foreground">{{ team.nom }}</span>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="20 + (($index + 1) * 12)"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="surface-muted p-6">
            <div class="mb-5 text-2xl font-semibold text-foreground">Chiffres cles</div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">Institutions</div>
                <div class="mt-2 text-4xl font-bold">{{ about()?.institutions?.length || 0 }}</div>
              </div>
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">Equipes</div>
                <div class="mt-2 text-4xl font-bold">{{ about()?.equipesRecherche?.length || 0 }}</div>
              </div>
              <div class="surface-panel p-5">
                <div class="text-sm text-muted-foreground">Categories</div>
                <div class="mt-2 text-4xl font-bold">{{ about()?.categoriesArticle?.length || 0 }}</div>
              </div>
            </div>
            <div class="mt-6 rounded-3xl border border-border/60 bg-card p-6">
              <div class="text-2xl font-semibold text-foreground">Domaines couverts</div>
              <div class="mt-4 flex flex-wrap gap-3">
                @for (category of about()?.categoriesArticle || []; track category.id) {
                  <span class="badge-soft">{{ category.libelle }}</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class AboutPageComponent implements OnInit {
  readonly icons = sharedIcons;
  readonly about = signal<AboutData | null>(null);
  readonly introductionText =
    'Le LR16CNSTN02 est un jeune laboratoire qui a été créé initialement en 2016. Plusieurs de ses membres étaient affectés avant 2016 à une unité de recherche au CNSTN. Le présent cycle correspond ainsi au premier cycle du laboratoire de recherche. Nous disposons d’ores et déjà d’un savoir-faire acquis dans les applications pacifiques du nucléaire grâce aux travaux réalisés dans le cadre de la précédente UR (UR04CNSTN02). Nous avons mis en œuvre cette expertise en se concentrant sur l’intégration des technologies nucléaires apparentées dans le cadre de recherches sur les grands instruments, l’énergie, les matériaux, l’environnement, la dosimétrie, la bio-dosimétrie, la radio analyse, la radiochimie, la physique atomique, la métrologie et l’instrumentation. Un nouveau directeur pour le laboratoire a été désigné en septembre 2018.';

  readonly researchTeams = [
    {
      order: '01',
      shortTitle: 'Techniques radiochimiques',
      title: '1ère équipe : Développements des techniques radiochimiques dans la sécurité alimentaire et environnementale',
      summary: 'Conception de protocoles radiochimiques pour le controle des contaminants et le suivi des matrices alimentaires et environnementales.',
      icon: sharedIcons.Atom
    },
    {
      order: '02',
      shortTitle: 'Materiaux irradies',
      title: '2ème équipe : Matériaux irradiés pour la dosimétrie, la détection, l’environnement et l’énergie',
      summary: 'Developpement de materiaux fonctionnels pour la mesure, la detection et l optimisation de systemes a contraintes energetiques et environnementales.',
      icon: sharedIcons.Microscope
    },
    {
      order: '03',
      shortTitle: 'Modelisation physique',
      title:
        '3ème équipe : Modélisation physique, applications et développement expérimental, pour des systèmes nucléaires et grands instruments',
      summary: 'Simulation multi-physique, essais experimentaux et methodes d analyse pour fiabiliser les systemes nucleaires et les infrastructures scientifiques majeures.',
      icon: sharedIcons.TrendingUp
    },
    {
      order: '04',
      shortTitle: 'Instrumentation nucleaire',
      title:
        '4ème équipe : Instrumentation et modélisation nucléaire pour la dosimétrie, la métrologie, la spectrométrie et la spectroscopie de haute résolution',
      summary: 'Architecture d instruments de haute precision pour la dosimetrie, la metrologie et la spectrometrie a haute resolution.',
      icon: sharedIcons.Shield
    }
  ];

  async ngOnInit() {
    try {
      this.about.set(await api.getAbout());
    } catch {
      this.about.set(null);
    }
  }
}
