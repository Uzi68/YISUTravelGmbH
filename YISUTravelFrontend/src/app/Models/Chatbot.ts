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
