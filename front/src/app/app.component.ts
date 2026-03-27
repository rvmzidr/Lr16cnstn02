import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackToTopComponent } from './shared/components/back-to-top.component';
import { ToolbarControlsComponent } from './shared/components/toolbar-controls.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BackToTopComponent, ToolbarControlsComponent],
  template: `
    <div class="min-h-screen">
      <router-outlet />
      <div class="fixed right-4 top-20 z-[95]">
        <app-toolbar-controls
          [compact]="false"
          [showThemeToggle]="false"
        ></app-toolbar-controls>
      </div>
      <app-back-to-top />
    </div>
  `,
})
export class AppComponent {}
