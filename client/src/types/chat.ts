export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageMetadata {
  model?: string;
  routingReason?: string;
  latencyMs?: number;
  tools?: Array<{ toolName: string; args: any }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface UploadedDocNotice {
  filename: string;
  chunks: number;
  isError?: boolean;
}

// Dummy runtime export so Vite never encounters an empty module
export const CHAT_TYPES = true;