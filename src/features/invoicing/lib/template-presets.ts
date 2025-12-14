/**
 * Preset Invoice Templates
 * These are the default templates available to all users
 */

export interface InvoiceTemplatePreset {
  name: string;
  description: string;
  layout: TemplateLayout;
  styles: TemplateStyles;
}

export interface TemplateLayout {
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  type: 'header' | 'client-info' | 'line-items' | 'totals' | 'notes' | 'footer';
  config: Record<string, unknown>;
}

export interface TemplateStyles {
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontSize: {
    base: string;
    heading: string;
    large: string;
    small: string;
  };
  spacing: {
    section: string;
    content: string;
  };
  borders: {
    width: string;
    color: string;
    radius: string;
  };
}

/**
 * Minimal Template - Clean, modern, minimal design
 */
export const MINIMAL_TEMPLATE: InvoiceTemplatePreset = {
  name: 'Minimal',
  description: 'Clean and modern design with minimal styling',
  layout: {
    sections: [
      {
        id: 'header',
        type: 'header',
        config: {
          showLogo: true,
          logoPosition: 'left',
          showInvoiceNumber: true,
          showDate: true,
          layout: 'horizontal',
        },
      },
      {
        id: 'client-info',
        type: 'client-info',
        config: {
          showBillTo: true,
          showEmail: true,
          showAddress: false,
          layout: 'side-by-side',
        },
      },
      {
        id: 'line-items',
        type: 'line-items',
        config: {
          columns: ['description', 'quantity', 'rate', 'amount'],
          showBorders: false,
          alternateRows: true,
        },
      },
      {
        id: 'totals',
        type: 'totals',
        config: {
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
          position: 'right',
          width: '350px',
        },
      },
      {
        id: 'notes',
        type: 'notes',
        config: {
          showNotes: true,
          showTerms: true,
        },
      },
      {
        id: 'footer',
        type: 'footer',
        config: {
          showPaymentInfo: true,
          showThankYou: true,
          textAlign: 'center',
        },
      },
    ],
  },
  styles: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    primaryColor: '#1f2937',
    secondaryColor: '#6b7280',
    accentColor: '#3b82f6',
    fontSize: {
      base: '14px',
      heading: '24px',
      large: '16px',
      small: '12px',
    },
    spacing: {
      section: '32px',
      content: '16px',
    },
    borders: {
      width: '1px',
      color: '#e5e7eb',
      radius: '8px',
    },
  },
};

/**
 * Corporate Template - Professional, formal layout
 */
export const CORPORATE_TEMPLATE: InvoiceTemplatePreset = {
  name: 'Corporate',
  description: 'Professional design with formal structure',
  layout: {
    sections: [
      {
        id: 'header',
        type: 'header',
        config: {
          showLogo: true,
          logoPosition: 'left',
          showInvoiceNumber: true,
          showDate: true,
          layout: 'horizontal',
          background: true,
        },
      },
      {
        id: 'client-info',
        type: 'client-info',
        config: {
          showBillTo: true,
          showEmail: true,
          showAddress: true,
          layout: 'side-by-side',
        },
      },
      {
        id: 'line-items',
        type: 'line-items',
        config: {
          columns: ['description', 'quantity', 'rate', 'amount'],
          showBorders: true,
          alternateRows: false,
          headerBackground: true,
        },
      },
      {
        id: 'totals',
        type: 'totals',
        config: {
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
          position: 'right',
          width: '400px',
          border: true,
        },
      },
      {
        id: 'notes',
        type: 'notes',
        config: {
          showNotes: true,
          showTerms: true,
          border: true,
        },
      },
      {
        id: 'footer',
        type: 'footer',
        config: {
          showPaymentInfo: true,
          showThankYou: true,
          textAlign: 'center',
          border: true,
        },
      },
    ],
  },
  styles: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    primaryColor: '#0f172a',
    secondaryColor: '#475569',
    accentColor: '#0284c7',
    fontSize: {
      base: '14px',
      heading: '28px',
      large: '16px',
      small: '12px',
    },
    spacing: {
      section: '40px',
      content: '20px',
    },
    borders: {
      width: '2px',
      color: '#cbd5e1',
      radius: '4px',
    },
  },
};

/**
 * All preset templates
 */
export const PRESET_TEMPLATES = {
  minimal: MINIMAL_TEMPLATE,
  corporate: CORPORATE_TEMPLATE,
} as const;

export type PresetTemplateKey = keyof typeof PRESET_TEMPLATES;
