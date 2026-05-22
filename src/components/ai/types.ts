export interface EntityReference {
  type: "client" | "deal" | "pipeline" | "workflow";
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
  type:
    | "client"
    | "deal"
    | "pipeline"
    | "workflow"
    | "action"
    | "ai"
    | "query"
    | "member";
  description?: string;
  category?: string;
}
