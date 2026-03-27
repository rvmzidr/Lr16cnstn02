import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-animated-counter',
  standalone: true,
  imports: [],
  template: `{{ displayValue() }}`,
})
export class AnimatedCounterComponent implements OnChanges {
  @Input() value = 0;
  @Input() duration = 1100;
  readonly displayValue = signal('0');

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      this.animate();
    }
  }

  private animate() {
    const target = Number(this.value || 0);
    const start = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - start) / this.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(target * eased);
      this.displayValue.set(new Intl.NumberFormat('fr-FR').format(nextValue));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }
}
