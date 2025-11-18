import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { loadAppConfig } from './app/app-config.service';

loadAppConfig()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));
