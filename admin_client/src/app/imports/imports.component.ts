import { Component, Signal } from '@angular/core';
import { Import, ImportsService } from './imports.service';
import '@mucsi96/ui-elements';

@Component({
  selector: 'app-imports',
  standalone: true,
  imports: [],
  templateUrl: './imports.component.html',
  styleUrl: './imports.component.css',
})
export class ImportsComponent {
  imports: Signal<Import[] | undefined>;

  constructor(private readonly importService: ImportsService) {
    this.imports = this.importService.getImports();
  }
}
