import type { VariableItem } from "./variable-suggestion";

/**
 * Builds a variable tree from a context object
 * Handles nested objects and arrays
 */
export function buildVariableTree(
  obj: Record<string, any>,
  parentPath = "",
  parentLabel = ""
): VariableItem[] {
  const items: VariableItem[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const label = key;

    if (value === null || value === undefined) {
      // Primitive (null/undefined)
      items.push({
        path,
        label,
        type: "primitive",
      });
    } else if (Array.isArray(value)) {
      // Array - show indices as children
      const children: VariableItem[] = [];

      // Show first few items as examples
      const maxItems = Math.min(value.length, 5);
      for (let i = 0; i < maxItems; i++) {
        const item = value[i];
        if (typeof item === "object" && item !== null) {
          // Object in array - drill into it
          children.push({
            path: `${path}.${i}`,
            label: `[${i}]`,
            type: "object",
            children: buildVariableTree(item, `${path}.${i}`, `[${i}]`),
          });
        } else {
          // Primitive in array
          children.push({
            path: `${path}.${i}`,
            label: `[${i}]`,
            type: "primitive",
          });
        }
      }

      items.push({
        path,
        label,
        type: "array",
        children: children.length > 0 ? children : undefined,
      });
    } else if (typeof value === "object") {
      // Nested object
      const children = buildVariableTree(value, path, label);
      items.push({
        path,
        label,
        type: "object",
        children: children.length > 0 ? children : undefined,
      });
    } else {
      // Primitive (string, number, boolean)
      items.push({
        path,
        label,
        type: "primitive",
      });
    }
  }

  return items;
}

/**
 * Example context structures for common triggers
 */
export const exampleContexts = {
  googleForm: {
    googleForm: {
      formId: "example-id",
      formTitle: "Contact Form",
      respondentEmail: "respondent@example.com",
      responses: {},
      timestamp: "2025-01-01T00:00:00.000Z",
    },
  },
  calendar: {
    calendar: {
      calendarId: "example@gmail.com",
      calendarName: "My Calendar",
      event: {
        summary: "Meeting Title",
        description: "Meeting description",
        attendees: [
          {
            email: "attendee1@example.com",
            responseStatus: "accepted",
          },
          {
            email: "attendee2@example.com",
            responseStatus: "needsAction",
          },
        ],
        start: {
          dateTime: "2025-01-01T10:00:00Z",
        },
        end: {
          dateTime: "2025-01-01T11:00:00Z",
        },
      },
    },
    googleCalendar: {
      calendarId: "example@gmail.com",
      calendarName: "My Calendar",
      event: {
        summary: "Meeting Title",
        description: "Meeting description",
        attendees: [
          {
            email: "attendee1@example.com",
            responseStatus: "accepted",
          },
          {
            email: "attendee2@example.com",
            responseStatus: "needsAction",
          },
        ],
        start: {
          dateTime: "2025-01-01T10:00:00Z",
        },
        end: {
          dateTime: "2025-01-01T11:00:00Z",
        },
      },
    },
  },
  contact: {
    contact: {
      id: "contact-id",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "9876543210",
      companyName: "Example Corp",
      position: "Manager",
      type: "LEAD",
      lifecycleStage: "LEAD",
      source: "Google Form",
      country: "United States",
      city: "New York",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  },
  deal: {
    deal: {
      id: "deal-id",
      name: "Deal Name",
      value: "10000",
      currency: "USD",
      deadline: "2025-01-31T00:00:00.000Z",
      source: "Inbound Lead",
      pipelineId: "pipeline-id",
      pipelineStageId: "stage-id",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  },
};
