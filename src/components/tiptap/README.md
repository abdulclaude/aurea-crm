# Variable Input Component

A Tiptap-based rich text input that allows users to insert context variables using @ or / triggers.

## Features

- **@ and / triggers**: Type `@` or `/` to open the variable dropdown
- **Drilldown navigation**: Navigate through nested objects and arrays
- **Visual chips**: Variables render as colored chips with delete buttons
- **Handlebars serialization**: Automatically converts to/from `{{path}}` syntax
- **Keyboard navigation**: Arrow keys, Enter, and Backspace for navigation

## Components

### VariableInput

The main input component that replaces standard text inputs.

```tsx
import { VariableInput } from "@/components/tiptap/variable-input";
import { buildVariableTree } from "@/components/tiptap/build-variable-tree";

const variables = buildVariableTree({
  googleForm: {
    formId: "example-id",
    responses: {
      Name: "John Doe",
      Email: "john@example.com",
    },
  },
});

<VariableInput
  value={field.value}
  onChange={field.onChange}
  placeholder="Type @ to insert variables"
  variables={variables}
/>
```

### Variable Extension

Custom Tiptap node that renders variable chips. Features:
- Inline, atomic node
- Non-editable content
- Delete button for removing variables
- Stores `path` and `label` attributes

### Variable Suggestion

Dropdown component with:
- **Breadcrumb navigation**: Shows current path when drilling down
- **Back button**: Return to parent level
- **Arrow key navigation**: Up/Down to select, Enter to confirm
- **Search filtering**: Filter variables by label

## Building Variable Trees

Use `buildVariableTree` to convert context objects into variable items:

```typescript
const variables = buildVariableTree({
  contact: {
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "123-456-7890",
  },
  calendar: {
    event: {
      attendees: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    },
  },
});
```

This creates a tree structure like:
```
contact
├─ name
├─ email
└─ phone
calendar
└─ event
   └─ attendees
      ├─ [0]
      │  └─ email
      └─ [1]
         └─ email
```

## Handlebars Conversion

The component automatically converts between editor content and Handlebars:

**Editor**: `Hello @Name, your email is @Email`

**Handlebars**: `Hello {{googleForm.responses.Name}}, your email is {{googleForm.responses.Email}}`

## Usage in Forms

Replace standard Input/Textarea components with VariableInput:

```tsx
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <VariableInput
          value={field.value}
          onChange={field.onChange}
          placeholder="Type @ to insert variables"
          variables={variables}
        />
      </FormControl>
      <FormDescription>
        Type @ or / to insert context variables
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Example Contexts

Pre-built example contexts are available in `build-variable-tree.ts`:

- `exampleContexts.googleForm`: Form submission data
- `exampleContexts.calendar`: Google Calendar event data
- `exampleContexts.contact`: CRM contact data
- `exampleContexts.deal`: CRM deal data

## Keyboard Shortcuts

- `@` or `/`: Open variable dropdown
- `Arrow Up/Down`: Navigate items
- `Enter`: Select item / drill into nested objects
- `Backspace`: Go back one level (when in nested view)
- `Escape`: Close dropdown

## Styling

The component uses Tailwind CSS with:
- Variable chips: `bg-primary/10 text-primary border-primary/20`
- Dropdown: `bg-popover text-popover-foreground`
- Hover states: `hover:bg-accent/50`

## Workflow Context Integration

The VariableInput component now integrates with the workflow system to show only variables from upstream nodes:

```typescript
import { buildNodeContext } from "@/features/workflows/lib/build-node-context";

// In your node component
const variables = useMemo(() => {
  const nodes = getNodes();
  const edges = getEdges();
  return buildNodeContext(props.id, nodes, edges);
}, [props.id, getNodes, getEdges]);

// Pass to dialog
<YourDialog variables={variables} />
```

The `buildNodeContext` function:
- Analyzes the workflow graph to find upstream nodes
- Extracts the `variableName` from each upstream node's data
- Builds a context object with the structure that each node type returns
- Converts the context to a navigable variable tree

## TODO

- [ ] Add variable preview/tooltip showing example values
- [ ] Add support for helper functions (e.g., `{{uppercase contact.name}}`)
- [ ] Add support for array iteration syntax (e.g., `{{#each items}}{{this.name}}{{/each}}`)
