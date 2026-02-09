import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pwa-install-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
  templateUrl: './pwa-install-dialog.component.html',
  styleUrl: './pwa-install-dialog.component.scss'
})
export class PwaInstallDialogComponent {}
