import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, disabled, min } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Source, SourceFormatType, SourceType, CardType, LanguageLevel } from '../../parser/types';
import { uploadDocument } from '../../utils/uploadDocument';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ENVIRONMENT_CONFIG } from '../../environment/environment.config';

@Component({
  selector: 'app-source-dialog',
  templateUrl: './source-dialog.component.html',
  styleUrl: './source-dialog.component.css',
  imports: [
    CommonModule,
    MatDialogModule,
    FormField,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatIcon,
    MatProgressBarModule,
  ],
})
export class SourceDialogComponent {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(ENVIRONMENT_CONFIG);
  data: { source?: Source; mode: 'create' | 'edit' } = inject(MAT_DIALOG_DATA);
  dialogRef: MatDialogRef<SourceDialogComponent> = inject(MatDialogRef);

  readonly languageLevels = this.environment.languageLevels;
  readonly formatTypes = this.environment.sourceFormatTypes;
  readonly sourceTypes = this.environment.sourceTypes;
  readonly cardTypes = [
    { code: 'vocabulary', displayName: 'Vocabulary' },
    { code: 'speech', displayName: 'Speech' },
    { code: 'grammar', displayName: 'Grammar' },
  ];

  readonly formModel = signal<{
    id: string;
    name: string;
    sourceType: SourceType | '';
    fileName: string;
    startPage: number;
    languageLevel: LanguageLevel | '';
    cardType: CardType | '';
    formatType: SourceFormatType | '';
  }>({
    id: this.data.source?.id || '',
    name: this.data.source?.name || '',
    sourceType: this.data.source?.sourceType ?? '',
    fileName: '',
    startPage: this.data.source?.startPage || 1,
    languageLevel: this.data.source?.languageLevel ?? '',
    cardType: this.data.source?.cardType ?? '',
    formatType: this.data.source?.formatType ?? '',
  });
  readonly sourceForm = form(this.formModel, (path) => {
    required(path.id);
    required(path.name);
    required(path.cardType);
    required(path.languageLevel);
    required(path.sourceType);
    disabled(path.id, () => this.data.mode === 'edit');
    disabled(path.cardType, () => this.data.mode === 'edit');
    disabled(path.sourceType, () => this.data.mode === 'edit');
    min(path.startPage, 1);
  });

  uploadedFile = signal<File | null>(null);
  uploading = signal<boolean>(false);
  uploadError = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  readonly isValid = computed(() => {
    const data = this.formModel();
    const hasBaseFields = !!(
      data.id &&
      data.name &&
      data.cardType &&
      data.sourceType &&
      data.languageLevel
    );

    if (!hasBaseFields) {
      return false;
    }

    if (data.cardType !== 'speech' && data.cardType !== 'grammar' && !data.formatType) {
      return false;
    }

    if (data.sourceType === 'images') {
      return true;
    }

    if (!data.startPage || data.startPage <= 0) {
      return false;
    }

    if (this.data.mode === 'edit') {
      return true;
    }

    return this.hasFile();
  });

  onCancelClick(): void {
    this.dialogRef.close();
  }

  async onSaveClick(): Promise<void> {
    if (this.isValid()) {
      if (this.uploadedFile()) {
        await this.uploadFile();
        if (this.uploadError()) {
          return;
        }
      }
      const result = this.formModel();
      const formData: Partial<Source> & { fileName?: string } = {
        id: result.id,
        name: result.name,
        sourceType: result.sourceType || undefined,
        fileName: result.fileName,
        startPage: result.startPage,
        languageLevel: result.languageLevel || undefined,
        cardType: result.cardType || undefined,
        formatType: result.cardType === 'speech' || result.cardType === 'grammar'
          ? 'flowingText'
          : result.formatType || undefined,
      };
      this.dialogRef.close(formData);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.uploadError.set('Only PDF files are allowed');
      return;
    }

    this.uploadedFile.set(file);
    this.formModel.update((m) => ({ ...m, fileName: file.name }));
    this.uploadError.set(null);
  }

  removeFile(): void {
    this.uploadedFile.set(null);
    this.formModel.update((m) => ({ ...m, fileName: '' }));
    this.uploadError.set(null);
  }

  hasFile(): boolean {
    return !!this.uploadedFile() || !!this.formModel().fileName;
  }

  getFileName(): string {
    return this.uploadedFile()?.name || this.formModel().fileName || '';
  }

  async uploadFile(): Promise<void> {
    const file = this.uploadedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set(null);

    try {
      const result = await uploadDocument<{ fileName: string; detail: string }>(
        this.http,
        '/api/source/upload',
        file
      );

      this.formModel.update((m) => ({ ...m, fileName: result.fileName }));
    } catch (error) {
      this.uploadError.set(error instanceof Error ? error.message : 'Upload failed');
      throw error;
    } finally {
      this.uploading.set(false);
    }
  }

  getTitle(): string {
    return this.data.mode === 'create' ? 'Add New Source' : 'Edit Source';
  }

  getSaveButtonLabel(): string {
    return this.data.mode === 'create' ? 'Create' : 'Update';
  }
}
