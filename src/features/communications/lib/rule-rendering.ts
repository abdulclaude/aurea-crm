const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTemplate(
  template: string | null,
  variables: Readonly<Record<string, string>>,
  html: boolean,
): string | null {
  if (template === null) return null;
  return template.replace(VARIABLE_PATTERN, (token, key: string) => {
    const value = variables[key];
    if (value === undefined) return token;
    return html ? escapeHtml(value) : value;
  });
}

export type CommunicationRulePreview = {
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
};

export function renderCommunicationRuleContent(input: {
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  variables: Readonly<Record<string, string>>;
}): CommunicationRulePreview {
  return {
    subject: renderTemplate(input.subject, input.variables, false),
    textBody: renderTemplate(input.textBody, input.variables, false),
    htmlBody: renderTemplate(input.htmlBody, input.variables, true),
  };
}
