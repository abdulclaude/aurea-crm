import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Button,
  Img,
  Link,
  Hr,
} from "@react-email/components";
import type {
  EmailContent,
  EmailSection,
  EmailDesign,
  CampaignVariables,
} from "@/features/campaigns/types";

interface BaseTemplateProps {
  content: EmailContent;
  design?: EmailDesign;
  variables: CampaignVariables;
}

// Replace template variables in text
function replaceVariables(text: string, variables: CampaignVariables): string {
  return text
    .replace(/\{\{client\.name\}\}/g, variables.name)
    .replace(/\{\{client\.firstName\}\}/g, variables.firstName)
    .replace(/\{\{client\.email\}\}/g, variables.email)
    .replace(/\{\{client\.companyName\}\}/g, variables.companyName || "")
    .replace(/\{\{unsubscribe_url\}\}/g, variables.unsubscribe_url)
    .replace(
      /\{\{view_in_browser_url\}\}/g,
      variables.view_in_browser_url || "#"
    );
}

// Simple markdown to HTML conversion for basic formatting
function parseMarkdown(text: string): string {
  return (
    text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/g, "<br/>")
  );
}

function RenderSection({
  section,
  design,
  variables,
}: {
  section: EmailSection;
  design?: EmailDesign;
  variables: CampaignVariables;
}) {
  switch (section.type) {
    case "header":
      return (
        <Section
          style={{
            backgroundColor: section.backgroundColor || design?.primaryColor || "#4F46E5",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          {(section.logoUrl || design?.logoUrl) && (
            <Img
              src={section.logoUrl || design?.logoUrl}
              alt="Logo"
              width={120}
              height={40}
              style={{ margin: "0 auto 16px" }}
            />
          )}
          {section.title && (
            <Heading
              style={{
                color: design?.headerTextColor || "#ffffff",
                fontFamily:
                  design?.headingFontFamily ||
                  design?.fontFamily ||
                  "Arial, sans-serif",
                fontSize: "28px",
                fontWeight: "bold",
                margin: "0 0 8px",
              }}
            >
              {replaceVariables(section.title, variables)}
            </Heading>
          )}
          {section.subtitle && (
            <Text
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "16px",
                margin: "0",
              }}
            >
              {replaceVariables(section.subtitle, variables)}
            </Text>
          )}
        </Section>
      );

    case "text":
      return (
        <Section style={{ padding: "24px" }}>
          <Text
            style={{
                color:
                  design?.bodyTextColor ||
                  design?.textColor ||
                  "#374151",
                fontFamily:
                  design?.bodyFontFamily ||
                  design?.fontFamily ||
                  "Arial, sans-serif",
              fontSize: "16px",
              lineHeight: "24px",
              textAlign: section.align || "left",
              margin: "0",
            }}
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(replaceVariables(section.content, variables)),
            }}
          />
        </Section>
      );

    case "image":
      const imageContent = (
        <Img
          src={section.src}
          alt={section.alt || ""}
          width={section.width || 600}
          style={{ maxWidth: "100%", height: "auto", display: "block" }}
        />
      );

      return (
        <Section style={{ padding: "16px 24px" }}>
          {section.link ? (
            <Link href={replaceVariables(section.link, variables)}>
              {imageContent}
            </Link>
          ) : (
            imageContent
          )}
        </Section>
      );

    case "button":
      const buttonStyles: Record<string, React.CSSProperties> = {
        primary: {
          backgroundColor:
            design?.buttonColor || design?.primaryColor || "#4F46E5",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "16px",
          display: "inline-block",
        },
        secondary: {
          backgroundColor: design?.secondaryColor || "#6B7280",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "16px",
          display: "inline-block",
        },
        outline: {
          backgroundColor: "transparent",
          color: design?.buttonColor || design?.primaryColor || "#4F46E5",
          padding: "10px 22px",
          borderRadius: "6px",
          border: `2px solid ${design?.buttonColor || design?.primaryColor || "#4F46E5"}`,
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "16px",
          display: "inline-block",
        },
      };

      return (
        <Section
          style={{
            padding: "16px 24px",
            textAlign: section.align || "center",
          }}
        >
          <Button
            href={replaceVariables(section.url, variables)}
            style={buttonStyles[section.variant || "primary"]}
          >
            {replaceVariables(section.text, variables)}
          </Button>
        </Section>
      );

    case "divider":
      return (
        <Section style={{ padding: "16px 24px" }}>
          <Hr
            style={{
              borderColor: "#E5E7EB",
              borderTopWidth: "1px",
            }}
          />
        </Section>
      );

    case "spacer":
      return (
        <Section style={{ height: section.height || 24 }}>
          <Text style={{ margin: 0 }}>&nbsp;</Text>
        </Section>
      );

    case "columns":
      return (
        <Section style={{ padding: "16px 24px" }}>
          <Row>
            {section.columns.map((column, colIndex) => (
              <Column
                key={colIndex}
                style={{
                  width: column.width ? `${column.width}%` : `${100 / section.columns.length}%`,
                  verticalAlign: "top",
                }}
              >
                {column.sections.map((nestedSection, nestedIndex) => (
                  <RenderSection
                    key={nestedIndex}
                    section={nestedSection}
                    design={design}
                    variables={variables}
                  />
                ))}
              </Column>
            ))}
          </Row>
        </Section>
      );

    default:
      return null;
  }
}

export function BaseTemplate({ content, design, variables }: BaseTemplateProps) {
  const hasHeader = content.sections.some((section) => section.type === "header");
  const hasSocialLinks = Boolean(
    design?.socialLinks && Object.values(design.socialLinks).some(Boolean),
  );

  return (
    <Html lang="en">
      <Head>
        <style>
          {`
            @media only screen and (max-width: 600px) {
              .container {
                width: 100% !important;
                padding: 0 16px !important;
              }
            }
          `}
        </style>
      </Head>
      {content.preheader && <Preview>{replaceVariables(content.preheader, variables)}</Preview>}
      <Body
        style={{
          backgroundColor: design?.backgroundColor || "#F9FAFB",
          fontFamily:
            design?.bodyFontFamily ||
            design?.fontFamily ||
            "Arial, sans-serif",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          className="container"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {design?.logoUrl && !hasHeader ? (
            <Section style={{ padding: "24px 24px 0", textAlign: "center" }}>
              <Img
                src={design.logoUrl}
                alt={design.companyName || "Company logo"}
                width={120}
                height={40}
                style={{ margin: "0 auto", objectFit: "contain" }}
              />
            </Section>
          ) : null}
          {content.sections.map((section, index) => (
            <RenderSection
              key={section.id || index}
              section={section}
              design={design}
              variables={variables}
            />
          ))}

          {/* Footer */}
          <Section
            style={{
              padding: "24px",
              backgroundColor: "#F9FAFB",
              borderTop: "1px solid #E5E7EB",
            }}
          >
            {hasSocialLinks && design?.socialLinks ? (
              <Row style={{ marginBottom: "16px" }}>
                <Column style={{ textAlign: "center" }}>
                  {design.socialLinks.facebook && (
                    <Link
                      href={design.socialLinks.facebook}
                      style={{ margin: "0 8px" }}
                    >
                      <Img
                        src="https://react.email/static/facebook-icon.png"
                        alt="Facebook"
                        width={24}
                        height={24}
                      />
                    </Link>
                  )}
                  {design.socialLinks.twitter && (
                    <Link
                      href={design.socialLinks.twitter}
                      style={{ margin: "0 8px" }}
                    >
                      <Img
                        src="https://react.email/static/twitter-icon.png"
                        alt="Twitter"
                        width={24}
                        height={24}
                      />
                    </Link>
                  )}
                  {design.socialLinks.instagram && (
                    <Link
                      href={design.socialLinks.instagram}
                      style={{ margin: "0 8px" }}
                    >
                      <Img
                        src="https://react.email/static/instagram-icon.png"
                        alt="Instagram"
                        width={24}
                        height={24}
                      />
                    </Link>
                  )}
                  {design.socialLinks.linkedin && (
                    <Link
                      href={design.socialLinks.linkedin}
                      style={{ margin: "0 8px" }}
                    >
                      <Img
                        src="https://react.email/static/linkedin-icon.png"
                        alt="LinkedIn"
                        width={24}
                        height={24}
                      />
                    </Link>
                  )}
                  {design.socialLinks.pinterest && (
                    <Link
                      href={design.socialLinks.pinterest}
                      style={{ margin: "0 8px" }}
                    >
                      Pinterest
                    </Link>
                  )}
                  {design.socialLinks.youtube && (
                    <Link
                      href={design.socialLinks.youtube}
                      style={{ margin: "0 8px" }}
                    >
                      YouTube
                    </Link>
                  )}
                </Column>
              </Row>
            ) : null}

            {design?.companyName && (
              <Text
                style={{
                  color: design.bodyTextColor || "#6B7280",
                  fontSize: "12px",
                  textAlign: "center",
                  margin: "0 0 4px",
                }}
              >
                {design.companyName}
                {design.companyAddress ? ` · ${design.companyAddress}` : ""}
              </Text>
            )}
            {design?.website && (
              <Text
                style={{
                  fontSize: "12px",
                  textAlign: "center",
                  margin: "0 0 8px",
                }}
              >
                <Link href={design.website}>{design.website}</Link>
              </Text>
            )}

            {design?.footerText && (
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: "12px",
                  textAlign: "center",
                  margin: "0 0 8px",
                }}
              >
                {replaceVariables(design.footerText, variables)}
              </Text>
            )}

            {variables.unsubscribe_url ? <Text
              style={{
                color: "#9CA3AF",
                fontSize: "12px",
                textAlign: "center",
                margin: "0",
              }}
            >
              You received this email because you subscribed to our mailing list.
              <br />
              <Link
                href={variables.unsubscribe_url}
                style={{ color: "#6B7280", textDecoration: "underline" }}
              >
                Unsubscribe
              </Link>
            </Text> : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BaseTemplate;
