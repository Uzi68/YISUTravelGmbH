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
