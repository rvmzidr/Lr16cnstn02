import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BackToTopComponent } from './shared/components/back-to-top.component';
import { ToolbarControlsComponent } from './shared/components/toolbar-controls.component';
import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BackToTopComponent, ToolbarControlsComponent, AiChatWidgetComponent],
  template: `
    <div class="min-h-screen">
      <router-outlet />
      @if (!isDashboardRoute()) {
        <div class="fixed right-4 top-20 z-[95]">
          <app-toolbar-controls
            [compact]="false"
            [showThemeToggle]="false"
          ></app-toolbar-controls>
        </div>
      }
      <app-back-to-top />
      <app-ai-chat-widget />
    </div>
  `,
})
export class AppComponent {
  readonly router = inject(Router);

  isDashboardRoute() {
    return this.router.url.startsWith('/dashboard');
  }
}
