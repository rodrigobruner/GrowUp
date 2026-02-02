import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DesignSystemComponent } from '../../components/design-system/design-system.component';

@Component({
  selector: 'app-devui-page',
  standalone: true,
  imports: [CommonModule, DesignSystemComponent],
  templateUrl: './devui-page.component.html',
  styleUrl: './devui-page.component.scss'
})
export class DevuiPageComponent {}
