export interface ChatbotResponse {
  id: number;
  input: string;
  response: string;
  keywords: string[];
}

export interface ChatbotResponseCreate {
  input: string;
  response: string;
  keywords: string[];
}

export interface ChatbotInstruction {
  id: number;
  topic: string;
  instruction: string;
}

export interface ChatbotInstructionCreate {
  topic: string;
  instruction: string;
}

// Training Chat
export interface TrainingMessage {
  role: 'user' | 'assistant';
  content: string;
  savedItems?: TrainingSavedItem[];
  timestamp?: Date;
}

export interface TrainingSavedItem {
  type: 'knowledge' | 'instruction';
  id: number;
  summary: string;
  action?: 'created' | 'updated';
}

export interface TrainingConversation {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}

export interface TrainingChatResponse {
  success: boolean;
  reply: string;
  saved_items: TrainingSavedItem[];
  conversation_id: number;
}
