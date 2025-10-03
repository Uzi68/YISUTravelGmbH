export interface Agent {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  current_chats: number;
  last_activity?: string;
  workload_status: string;
}
