import { render } from "@react-email/render";
import { BaseTemplate } from "@/features/email-templates/templates/base-template";
import type {
  EmailContent,
  EmailDesign,
  CampaignVariables,
} from "@/features/campaigns/types";

export async function renderCampaignEmail({
  content,
  design,
  variables,
}: {
  content: EmailContent;
  design?: EmailDesign;
  variables: CampaignVariables;
}): Promise<{ html: string; text: string }> {
  // Render to HTML
  const html = await render(
    BaseTemplate({ content, design, variables })
  );

  // Generate plain text version
  const text = generatePlainText(content, variables);

  return { html, text };
}

function replaceVariables(text: string, variables: CampaignVariables): string {
  return text
    .replace(/\{\{contact\.name\}\}/g, variables.name)
    .replace(/\{\{contact\.firstName\}\}/g, variables.firstName)
    .replace(/\{\{contact\.email\}\}/g, variables.email)
    .replace(/\{\{contact\.companyName\}\}/g, variables.companyName || "")
    .replace(/\{\{unsubscribe_url\}\}/g, variables.unsubscribe_url)
    .replace(
      /\{\{view_in_browser_url\}\}/g,
      variables.view_in_browser_url || ""
    );
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
    .replace(/\*(.*?)\*/g, "$1") // Italic
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)"); // Links
}

function generatePlainText(
  content: EmailContent,
  variables: CampaignVariables
): string {
  const lines: string[] = [];

  if (content.preheader) {
    lines.push(replaceVariables(content.preheader, variables));
    lines.push("");
  }

  for (const section of content.sections) {
    switch (section.type) {
      case "header":
        if (section.title) {
          lines.push(replaceVariables(section.title, variables).toUpperCase());
        }
        if (section.subtitle) {
          lines.push(replaceVariables(section.subtitle, variables));
        }
        lines.push("");
        break;

      case "text":
        lines.push(
          stripMarkdown(replaceVariables(section.content, variables))
        );
        lines.push("");
        break;

      case "button":
        lines.push(
          `${replaceVariables(section.text, variables)}: ${replaceVariables(section.url, variables)}`
        );
        lines.push("");
        break;

      case "divider":
        lines.push("---");
        lines.push("");
        break;

      case "image":
        if (section.alt) {
          lines.push(`[Image: ${section.alt}]`);
        }
        if (section.link) {
          lines.push(replaceVariables(section.link, variables));
        }
        lines.push("");
        break;

      case "columns":
        for (const column of section.columns) {
          for (const nestedSection of column.sections) {
            // Recursively handle nested sections (simplified)
            if (nestedSection.type === "text") {
              lines.push(
                stripMarkdown(replaceVariables(nestedSection.content, variables))
              );
            }
          }
        }
        lines.push("");
        break;
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`Unsubscribe: ${variables.unsubscribe_url}`);

  return lines.join("\n").trim();
}

// Helper to extract first name from full name
export function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

// Generate a default email content structure
export function createDefaultEmailContent(): EmailContent {
  return {
    subject: "Your Newsletter Subject",
    preheader: "Preview text that appears in the inbox",
    sections: [
      {
        type: "header",
        id: "header-1",
        title: "Welcome to our Newsletter",
        subtitle: "The latest updates just for you",
      },
      {
        type: "text",
        id: "text-1",
        content:
          "Hi {{contact.firstName}},\n\nWe're excited to share the latest updates with you. Here's what's new...",
      },
      {
        type: "button",
        id: "button-1",
        text: "Read More",
        url: "https://example.com",
        variant: "primary",
        align: "center",
      },
      {
        type: "divider",
        id: "divider-1",
      },
      {
        type: "text",
        id: "text-2",
        content:
          "Thank you for being part of our community!\n\nBest regards,\nThe Team",
        align: "center",
      },
    ],
  };
}
