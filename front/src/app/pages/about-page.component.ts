
import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { AboutData } from '../core/models/models';
import { api } from '../core/services/api';
import { sharedIcons } from '../shared/lucide-icons';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <section class="page-shell py-8">
      <div class="hero-banner--light surface-card px-8 py-12 lg:px-12 lg:py-16">
        <div class="max-w-5xl space-y-6">
          <div class="tag-chip">A propos</div>
          <h1 class="text-5xl font-bold text-foreground lg:text-7xl">A propos de LR16CNSTN02</h1>
          <p class="max-w-4xl text-xl leading-9 text-muted-foreground">
            {{ about()?.presentation || 'Plateforme concentree sur les besoins essentiels de publication, de validation et de gouvernance du laboratoire.' }}
          </p>
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

  async ngOnInit() {
    try {
      this.about.set(await api.getAbout());
    } catch {
      this.about.set(null);
    }
  }
}
