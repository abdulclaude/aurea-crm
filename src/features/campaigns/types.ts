// Types for email campaign content structure

export interface EmailContent {
  subject: string;
  preheader?: string;
  sections: EmailSection[];
}

export type EmailSection =
  | HeaderSection
  | TextSection
  | ImageSection
  | ButtonSection
  | DividerSection
  | SpacerSection
  | ColumnsSection;

export interface HeaderSection {
  type: "header";
  id: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
}

export interface TextSection {
  type: "text";
  id: string;
  content: string; // Supports markdown
  align?: "left" | "center" | "right";
}

export interface ImageSection {
  type: "image";
  id: string;
  src: string;
  alt?: string;
  width?: number;
  link?: string;
}

export interface ButtonSection {
  type: "button";
  id: string;
  text: string;
  url: string;
  variant?: "primary" | "secondary" | "outline";
  align?: "left" | "center" | "right";
}

export interface DividerSection {
  type: "divider";
  id: string;
}

export interface SpacerSection {
  type: "spacer";
  id: string;
  height?: number;
}

export interface ColumnsSection {
  type: "columns";
  id: string;
  columns: Array<{
    width?: number; // Percentage
    sections: EmailSection[];
  }>;
}

// Design settings for email templates
export interface EmailDesign {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  linkColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  headerTextColor?: string;
  bodyTextColor?: string;
  buttonColor?: string;
  companyName?: string;
  companyAddress?: string;
  website?: string;
  footerText?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    pinterest?: string;
  };
}

// Variable placeholders that users can use in content:
// {{client.name}} - Full name
// {{client.firstName}} - First name (derived from name)
// {{client.email}} - Email address
// {{client.companyName}} - Company name
// {{unsubscribe_url}} - Unsubscribe link
// {{view_in_browser_url}} - View in browser link

export interface ClientVariables {
  name: string;
  firstName: string;
  email: string;
  companyName?: string;
}

export interface CampaignVariables extends ClientVariables {
  unsubscribe_url: string;
  view_in_browser_url?: string;
}
