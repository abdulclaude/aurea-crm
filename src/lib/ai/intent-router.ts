import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Use a flexible type that accepts any entity type string
interface EntityReference {
  type: string;
  id: string;
  name: string;
}

// Intent definitions with pre-computed embeddings (cached on first use)
export interface IntentDefinition {
  name: string;
  command: string;
  description: string;
  examples: string[];
  handler: string;
  embedding?: number[];
}

// All available intents
const intentDefinitions: IntentDefinition[] = [
  // CRM Actions
  {
    name: "create-contact",
    command: "/create-contact",
    description: "Create a new contact in the CRM",
    examples: [
      "create a contact",
      "add new contact",
      "new customer",
      "add person",
      "create lead",
    ],
    handler: "createContact",
  },
  {
    name: "create-deal",
    command: "/create-deal",
    description: "Create a new deal or opportunity",
    examples: [
      "create deal",
      "new deal",
      "add opportunity",
      "create sale",
      "new opportunity",
    ],
    handler: "createDeal",
  },
  {
    name: "create-pipeline",
    command: "/create-pipeline",
    description: "Create a new sales pipeline",
    examples: [
      "create pipeline",
      "new pipeline",
      "add sales pipeline",
      "create funnel",
    ],
    handler: "createPipeline",
  },
  {
    name: "create-task",
    command: "/create-task",
    description: "Create a new task or reminder",
    examples: [
      "create task",
      "add task",
      "new reminder",
      "add todo",
      "schedule task",
    ],
    handler: "createTask",
  },
  {
    name: "log-note",
    command: "/log-note",
    description: "Log a note or comment",
    examples: [
      "log note",
      "add note",
      "add comment",
      "write note",
      "record note",
    ],
    handler: "logNote",
  },
  {
    name: "send-email",
    command: "/send-email",
    description: "Send an email to a contact",
    examples: [
      "send email",
      "email contact",
      "send message",
      "compose email",
      "write email",
    ],
    handler: "sendEmail",
  },
  {
    name: "schedule-meeting",
    command: "/schedule-meeting",
    description: "Schedule a meeting or appointment",
    examples: [
      "schedule meeting",
      "book meeting",
      "set up call",
      "arrange meeting",
      "calendar invite",
    ],
    handler: "scheduleMeeting",
  },
  // Workflow Actions
  {
    name: "run-workflow",
    command: "/run-workflow",
    description: "Execute a workflow automation",
    examples: [
      "run workflow",
      "execute workflow",
      "start automation",
      "trigger workflow",
    ],
    handler: "runWorkflow",
  },
  {
    name: "list-workflows",
    command: "/list-workflows",
    description: "List all available workflows",
    examples: [
      "list workflows",
      "show workflows",
      "all automations",
      "my workflows",
    ],
    handler: "listWorkflows",
  },
  {
    name: "generate-workflow",
    command: "/generate-workflow",
    description: "Generate a workflow using AI",
    examples: [
      "generate workflow",
      "create automation",
      "build workflow",
      "ai workflow",
    ],
    handler: "generateWorkflow",
  },
  {
    name: "generate-bundle",
    command: "/generate-bundle",
    description: "Generate a reusable bundle workflow using AI",
    examples: [
      "generate bundle",
      "create bundle",
      "build bundle",
      "ai bundle",
      "reusable workflow",
    ],
    handler: "generateBundle",
  },
  // AI Actions
  {
    name: "summarise",
    command: "/summarise",
    description: "Summarise content or data",
    examples: ["summarise", "summary", "tldr", "brief", "summarize"],
    handler: "summarise",
  },
  {
    name: "explain",
    command: "/explain",
    description: "Explain something in detail",
    examples: ["explain", "what is", "describe", "tell me about", "clarify"],
    handler: "explain",
  },
  {
    name: "draft-email",
    command: "/draft-email",
    description: "Draft an email using AI",
    examples: [
      "draft email",
      "write email for me",
      "compose message",
      "help write email",
    ],
    handler: "draftEmail",
  },
  {
    name: "analyze",
    command: "/analyze",
    description: "Analyze data or metrics",
    examples: ["analyze", "analysis", "insights", "evaluate", "assess"],
    handler: "analyze",
  },
  {
    name: "research",
    command: "/research",
    description: "Research a topic",
    examples: ["research", "find information", "look up", "investigate"],
    handler: "research",
  },
  // Query Actions
  {
    name: "show-contacts",
    command: "/show-contacts",
    description: "Show all contacts",
    examples: [
      "show contacts",
      "list contacts",
      "all contacts",
      "my contacts",
      "view contacts",
    ],
    handler: "showContacts",
  },
  {
    name: "show-deals",
    command: "/show-deals",
    description: "Show all deals",
    examples: [
      "show deals",
      "list deals",
      "all deals",
      "my deals",
      "view opportunities",
    ],
    handler: "showDeals",
  },
  {
    name: "show-pipelines",
    command: "/show-pipelines",
    description: "Show all pipelines",
    examples: [
      "show pipelines",
      "list pipelines",
      "all pipelines",
      "view funnels",
    ],
    handler: "showPipelines",
  },
  {
    name: "show-workflows",
    command: "/show-workflows",
    description: "Show all workflows",
    examples: [
      "show workflows",
      "list automations",
      "all workflows",
      "my automations",
    ],
    handler: "showWorkflows",
  },
  {
    name: "search",
    command: "/search",
    description: "Search CRM data",
    examples: ["search", "find", "look for", "search for", "locate"],
    handler: "search",
  },
  // Natural Language Query Actions
  {
    name: "query-contacts",
    command: "/query-contacts",
    description: "Query contacts with filters like date, company, or other criteria",
    examples: [
      "show me contacts from",
      "find contacts created on",
      "contacts from company",
      "show all contacts from",
      "list contacts where",
      "contacts created this week",
      "contacts from last month",
    ],
    handler: "queryContacts",
  },
  {
    name: "query-deals",
    command: "/query-deals",
    description: "Query deals with filters like value, pipeline, stage, or date",
    examples: [
      "show me deals above",
      "deals over",
      "deals from pipeline",
      "find deals worth more than",
      "deals in stage",
      "deals created this month",
      "show all deals below",
    ],
    handler: "queryDeals",
  },
];

export interface RouteResult {
  intent: IntentDefinition;
  confidence: number;
  extractedParams: Record<string, any>;
}

export async function routeIntent(
  message: string,
  entities: EntityReference[]
): Promise<RouteResult | null> {
  // Check for explicit slash command
  const slashMatch = message.match(/^\/(\S+)/);
  if (slashMatch) {
    const command = slashMatch[1].toLowerCase();
    const intent = intentDefinitions.find(
      (i) => i.name === command || i.command === `/${command}`
    );
    if (intent) {
      return {
        intent,
        confidence: 1.0,
        extractedParams: extractParams(message, entities),
      };
    }
  }

  // Use AI to classify intent
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const intentList = intentDefinitions.map(i => `- ${i.name}: ${i.description}`).join("\n");

  const prompt = `Classify the user's intent from this message. Choose the most appropriate intent from the list below, or respond with "none" if no intent matches.

Available intents:
${intentList}

User message: "${message}"

Respond with ONLY a JSON object in this exact format:
{"intent": "intent-name", "confidence": 0.9}

The confidence should be between 0 and 1, where 1 means very confident.
If creating something (contact, deal, pipeline), the intent should be create-X.
If showing/listing something, the intent should be show-X.

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const intentName = parsed.intent;
      const confidence = parsed.confidence || 0.8;

      if (intentName === "none" || !intentName) {
        return null;
      }

      const intent = intentDefinitions.find(i => i.name === intentName);
      if (intent && confidence > 0.5) {
        return {
          intent,
          confidence,
          extractedParams: extractParams(message, entities),
        };
      }
    }
  } catch (error) {
    console.error("Failed to classify intent:", error);
  }

  return null;
}

function extractParams(
  message: string,
  entities: EntityReference[]
): Record<string, any> {
  const params: Record<string, any> = {};

  // Group entities by type
  const contacts = entities.filter((e) => e.type === "contact");
  const deals = entities.filter((e) => e.type === "deal");
  const pipelines = entities.filter((e) => e.type === "pipeline");
  const workflows = entities.filter((e) => e.type === "workflow");

  if (contacts.length > 0) {
    params.contactIds = contacts.map((c) => c.id);
    params.contactNames = contacts.map((c) => c.name);
  }

  if (deals.length > 0) {
    params.dealIds = deals.map((d) => d.id);
    params.dealNames = deals.map((d) => d.name);
  }

  if (pipelines.length > 0) {
    params.pipelineIds = pipelines.map((p) => p.id);
    params.pipelineNames = pipelines.map((p) => p.name);
  }

  if (workflows.length > 0) {
    params.workflowIds = workflows.map((w) => w.id);
    params.workflowNames = workflows.map((w) => w.name);
  }

  // Extract text content without entities
  params.rawMessage = message;

  return params;
}

export function getAvailableIntents(): IntentDefinition[] {
  return intentDefinitions;
}

export function getIntentByName(name: string): IntentDefinition | undefined {
  return intentDefinitions.find((i) => i.name === name);
}
