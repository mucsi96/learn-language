import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { Source } from '../../parser/types';
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
    FormsModule,
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
  ];

  formData: Partial<Source> & { fileName?: string } = {
    id: this.data.source?.id || '',
    name: this.data.source?.name || '',
    sourceType: this.data.source?.sourceType,
    fileName: '',
    startPage: this.data.source?.startPage || 1,
    languageLevel: this.data.source?.languageLevel,
    cardType: this.data.source?.cardType,
    formatType: this.data.source?.formatType,
  };

  uploadedFile = signal<File | null>(null);
  uploading = signal<boolean>(false);
  uploadError = signal<string | null>(null);
  isDragging = signal<boolean>(false);

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
      if (this.formData.cardType === 'speech') {
        this.formData.formatType = 'flowingText';
      }
      this.dialogRef.close(this.formData);
    }
  }

  isValid(): boolean {
    const hasBaseFields = !!(
      this.formData.id &&
      this.formData.name &&
      this.formData.cardType &&
      this.formData.sourceType &&
      this.formData.startPage &&
      this.formData.startPage > 0 &&
      this.formData.languageLevel
    );

    if (!hasBaseFields) {
      return false;
    }

    if (this.formData.cardType !== 'speech' && !this.formData.formatType) {
      return false;
    }

    if (this.formData.sourceType === 'images') {
      return true;
    }

    if (this.data.mode === 'edit') {
      return true;
    }

    return this.hasFile();
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
    this.formData.fileName = file.name;
    this.uploadError.set(null);
  }

  removeFile(): void {
    this.uploadedFile.set(null);
    this.formData.fileName = '';
    this.uploadError.set(null);
  }

  hasFile(): boolean {
    return !!this.uploadedFile() || !!this.formData.fileName;
  }

  getFileName(): string {
    return this.uploadedFile()?.name || this.formData.fileName || '';
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

      this.formData.fileName = result.fileName;
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
