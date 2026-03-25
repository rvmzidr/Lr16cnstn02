import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">Projets de recherche</h2>
          <p class="app-page-description">Suivre et organiser les projets en cours.</p>
        </div>
        <button class="btn-primary" disabled>Nouveau projet</button>
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon [img]="icons.Search" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input class="input-shell pl-11" placeholder="Rechercher un projet par nom ou responsable..." disabled />
        </div>
      </div>

      <div class="empty-state">Cette fonctionnalite sera activee dans une evolution future de la plateforme.</div>
    </div>
  `
})
export class ProjectsPageComponent {
  readonly icons = sharedIcons;
}
