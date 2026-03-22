import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NuclearBackgroundComponent } from './shared/components/nuclear-background.component';
import { BackToTopComponent } from './shared/components/back-to-top.component';
import { PageTransitionOverlayComponent } from './shared/components/page-transition-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NuclearBackgroundComponent, BackToTopComponent, PageTransitionOverlayComponent],
  template: `
    <div class="relative isolate min-h-screen">
      <app-nuclear-background />
      <div class="relative z-10 min-h-screen">
        <router-outlet />
      </div>
      <app-back-to-top />
      <app-page-transition-overlay />
    </div>
  `
})
export class AppComponent {
}
