import { Component, HostListener, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-back-to-top',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (visible()) {
      <button type="button" class="back-to-top-button" (click)="scrollTop()">
        <lucide-icon
          [img]="icons.ChevronRight"
          class="h-5 w-5 -rotate-90"
        ></lucide-icon>
      </button>
    }
  `,
})
export class BackToTopComponent {
  readonly icons = sharedIcons;
  readonly visible = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.visible.set(window.scrollY > 520);
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
