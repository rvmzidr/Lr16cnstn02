import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="app-page-header">
        <div>
          <h2 class="app-page-title">{{ site.localize(projectsTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(projectsDescription) }}
          </p>
        </div>
        <button class="btn-primary" disabled>
          {{ site.localize(newProjectLabel) }}
        </button>
      </div>

      <div class="surface-card p-6">
        <div class="relative">
          <lucide-icon
            [img]="icons.Search"
            class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          ></lucide-icon>
          <input
            class="input-shell pl-11"
            [placeholder]="site.localize(searchPlaceholder)"
            disabled
          />
        </div>
      </div>

      <div class="empty-state">{{ site.localize(emptyLabel) }}</div>
    </div>
  `,
})
export class ProjectsPageComponent {
  readonly site = inject(SitePreferencesService);
  readonly icons = sharedIcons;
  readonly projectsTitle = {
    fr: 'Projets de recherche',
    en: 'Research projects',
    ar: 'مشاريع البحث',
  };
  readonly projectsDescription = {
    fr: 'Suivre et organiser les projets en cours.',
    en: 'Track and organize ongoing projects.',
    ar: 'متابعة وتنظيم المشاريع الجارية.',
  };
  readonly newProjectLabel = {
    fr: 'Nouveau projet',
    en: 'New project',
    ar: 'مشروع جديد',
  };
  readonly searchPlaceholder = {
    fr: 'Rechercher un projet par nom ou responsable...',
    en: 'Search a project by name or owner...',
    ar: 'ابحث عن مشروع بالاسم أو المسؤول...',
  };
  readonly emptyLabel = {
    fr: 'Cette fonctionnalité sera activée dans une évolution future de la plateforme.',
    en: 'This feature will be enabled in a future platform release.',
    ar: 'سيتم تفعيل هذه الميزة في إصدار مستقبلي للمنصة.',
  };
}
