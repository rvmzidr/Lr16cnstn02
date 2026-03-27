import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cnstn-logo',
  standalone: true,
  template: `
    <img
      [src]="
        variant === 'legacy' ? 'assets/cnstn-logo.svg' : 'assets/logo-lr02.jpg'
      "
      alt="Logo LR16CNSTN02"
      [style.--logo-target-width.px]="width"
      [class]="
        variant === 'legacy'
          ? 'cnstn-logo-mark cnstn-logo-mark--legacy block'
          : 'cnstn-logo-mark cnstn-logo-mark--modern block'
      "
    />
  `,
  styles: [
    `
      .cnstn-logo-mark {
        width: min(100%, var(--logo-target-width, 108px));
        max-width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        border-radius: 9999px;
        padding: 0.25rem;
      }

      .cnstn-logo-mark--modern {
        filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.12));
      }

      .cnstn-logo-mark--legacy {
        filter: none;
      }

      @media (max-width: 640px) {
        .cnstn-logo-mark--modern {
          filter: drop-shadow(0 1px 6px rgba(0, 0, 0, 0.12));
        }
      }
    `,
  ],
})
export class CnstnLogoComponent {
  @Input() width = 108;
  @Input() variant: 'legacy' | 'modern' = 'modern';
}
