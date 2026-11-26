export type AIProviderType = 'gemini' | 'openai-compatible';

export interface UserAIConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  rememberInSession?: boolean;
}

export interface AIProfile extends UserAIConfig {
  id: string;
  name: string;
}

export interface AIProfiles {
  profiles: AIProfile[];
  activeId: string | null;
}
