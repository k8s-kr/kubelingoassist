import * as vscode from 'vscode';

export interface AIConfig {
  provider: 'openai' | 'claude' | 'gemini';
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ConfigManager {
  private static readonly CONFIG_SECTION = 'kubelingoassist';
  private static readonly SECRET_KEYS = {
    OPENAI_API_KEY: 'openai.apiKey',
    CLAUDE_API_KEY: 'claude.apiKey', 
    GEMINI_API_KEY: 'gemini.apiKey'
  };

  constructor(private context: vscode.ExtensionContext) {}

  getAIConfig(): AIConfig {
    const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    
    return {
      provider: config.get<'openai' | 'claude' | 'gemini'>('ai.provider', 'openai'),
      model: config.get<string>('ai.model'),
      baseUrl: config.get<string>('ai.baseUrl'),
      maxTokens: config.get<number>('ai.maxTokens', 2000),
      temperature: config.get<number>('ai.temperature', 0.7)
    };
  }

  async getAPIKey(provider: string): Promise<string | undefined> {
    console.log(`ConfigManager.getAPIKey: Getting API key for provider: ${provider}`);

    const secretKey = this.getSecretKey(provider);
    if (!secretKey) {
      const error = `Unsupported AI provider: ${provider}`;
      console.error(`ConfigManager.getAPIKey: ${error}`);
      throw new Error(error);
    }

    console.log(`ConfigManager.getAPIKey: Using secret key: ${secretKey}`);

    try {
      const result = await this.context.secrets.get(secretKey);
      console.log(`ConfigManager.getAPIKey: Retrieved key for ${provider}: ${result ? 'found' : 'not found'}`);
      return result;
    } catch (error) {
      console.error(`ConfigManager.getAPIKey: Error retrieving key for ${provider}:`, error);
      throw error;
    }
  }

  async setAPIKey(provider: string, apiKey: string): Promise<void> {
    const secretKey = this.getSecretKey(provider);
    if (!secretKey) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    await this.context.secrets.store(secretKey, apiKey);
  }

  async deleteAPIKey(provider: string): Promise<void> {
    const secretKey = this.getSecretKey(provider);
    if (!secretKey) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    await this.context.secrets.delete(secretKey);
  }

  private getSecretKey(provider: string): string | undefined {
    switch (provider) {
      case 'openai':
        return ConfigManager.SECRET_KEYS.OPENAI_API_KEY;
      case 'claude':
        return ConfigManager.SECRET_KEYS.CLAUDE_API_KEY;
      case 'gemini':
        return ConfigManager.SECRET_KEYS.GEMINI_API_KEY;
      default:
        return undefined;
    }
  }

  async hasAPIKey(provider: string): Promise<boolean> {
    try {
      console.log(`ConfigManager.hasAPIKey: Checking API key for provider: ${provider}`);
      const apiKey = await this.getAPIKey(provider);
      const hasKey = !!apiKey;
      console.log(`ConfigManager.hasAPIKey: Provider ${provider} has key: ${hasKey}`);
      return hasKey;
    } catch (error) {
      console.error(`ConfigManager.hasAPIKey: Error checking API key for ${provider}:`, error);
      return false;
    }
  }
}