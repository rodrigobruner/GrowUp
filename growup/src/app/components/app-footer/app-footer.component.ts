import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  @Input() currentYear = new Date().getFullYear();
  @Input() buildTime = '';
  @Input() showBuildTime = false;
  @Input() variant: 'default' | 'landing' = 'default';

  @HostBinding('class') get hostClass(): string {
    return `app-footer app-footer--${this.variant}`;
  }
}
