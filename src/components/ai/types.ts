export interface EntityReference {
  type: "contact" | "deal" | "pipeline" | "workflow";
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  entities?: EntityReference[];
  createdAt: Date;
}

export interface SuggestionItem {
  id: string;
  name: string;
  type: "contact" | "deal" | "pipeline" | "workflow" | "action" | "ai" | "query";
  description?: string;
  category?: string;
}
