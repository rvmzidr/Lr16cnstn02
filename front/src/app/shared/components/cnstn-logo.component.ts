import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cnstn-logo',
  standalone: true,
  template: `
    <img
      src="assets/cnstn-logo.svg"
      alt="Logo CNSTN"
      [style.width.px]="width"
      class="cnstn-logo-mark block h-auto object-contain"
    />
  `
})
export class CnstnLogoComponent {
  @Input() width = 108;
}
