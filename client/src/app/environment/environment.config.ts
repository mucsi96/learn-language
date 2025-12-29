import { InjectionToken } from '@angular/core';

export interface ChatModelInfo {
  modelName: string;
  primary: boolean;
}

export interface ImageModel {
  id: string;
  displayName: string;
}

export interface AudioModel {
  id: string;
  displayName: string;
  isDefault: boolean;
}

export interface Voice {
  id: string;
  displayName: string;
  languages: { name: string }[];
  category: 'premade' | 'cloned' | 'generated' | 'professional' | null;
}

export interface SupportedLanguage {
  code: string;
  displayName: string;
}

export interface EnvironmentConfig {
  tenantId: string;
  clientId: string;
  apiClientId: string;
  mockAuth: boolean;
  chatModels: ChatModelInfo[];
  imageModels: ImageModel[];
  audioModels: AudioModel[];
  voices: Voice[];
  supportedLanguages: SupportedLanguage[];
}

export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('ENVIRONMENT_CONFIG');
