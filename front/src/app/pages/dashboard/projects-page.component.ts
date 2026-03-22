import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-4xl font-bold text-foreground">Projets de recherche</h2>
          <p class="text-lg text-muted-foreground">Suivre et organiser les projets en cours</p>
        </div>
        <button class="btn-primary" disabled>Nouveau projet</button>
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input class="input-shell pl-11" placeholder="Rechercher un projet par nom ou responsable..." disabled />
        </div>
      </div>

      <div class="surface-card p-8">
        <h3 class="text-2xl font-semibold text-foreground">Fonctionnalite non active</h3>
        <p class="mt-3 text-muted-foreground">
          Cette fonctionnalite sera activee dans une evolution future de la plateforme.
        </p>
      </div>
    </div>
  `
})
export class ProjectsPageComponent {
  readonly icons = sharedIcons;
}
