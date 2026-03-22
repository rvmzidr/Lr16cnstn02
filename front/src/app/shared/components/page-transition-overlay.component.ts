import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { sharedIcons } from '../lucide-icons';

@Component({
  selector: 'app-page-transition-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible()) {
      <div class="page-transition-overlay" aria-hidden="true">
        <div class="page-transition-overlay__symbol">
          <lucide-icon [img]="icons.Atom" class="h-16 w-16"></lucide-icon>
        </div>
        <div class="page-transition-overlay__label">LR16CNSTN02</div>
      </div>
    }
  `
})
export class PageTransitionOverlayComponent implements OnInit, OnDestroy {
  readonly icons = sharedIcons;
  readonly visible = signal(true);
  private readonly router = inject(Router);
  private subscription?: Subscription;
  private startTime = performance.now();
  private hideTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.startTime = performance.now();
    this.hideAfterMinimum();

    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.startTime = performance.now();
        this.visible.set(true);
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.hideAfterMinimum();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  private hideAfterMinimum() {
    const elapsed = performance.now() - this.startTime;
    const remaining = Math.max(0, 500 - elapsed);
    this.hideTimeout = setTimeout(() => this.visible.set(false), remaining);
  }
}
