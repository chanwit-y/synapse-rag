# Editable

Click-to-edit inline text component. Displays a read-only value that becomes an input on click, with keyboard support for confirming (Enter) or cancelling (Escape).

## Import

```tsx
import Editable from "@/components/common/Editable/Editable";
```

## Props

| Prop | Type | Default | Description |
| -------------- | ---------------------------------------- | -------------- | --------------------------------------------------------- |
| `value` | `string` | — | Controlled text value. |
| `defaultValue` | `string` | `""` | Initial text value (uncontrolled). |
| `placeholder` | `string` | `"Click to edit"` | Placeholder shown when the value is empty. |
| `variant` | `"inline" \| "outlined" \| "filled"` | `"inline"` | Visual style of the display and input. |
| `size` | `"small" \| "medium"` | `"medium"` | Controls font size and height. |
| `disabled` | `boolean` | `false` | Disables editing and dims the component. |
| `readOnly` | `boolean` | `false` | Displays the value without edit capability. |
| `startEditOn` | `"click" \| "doubleClick"` | `"click"` | Interaction that enters edit mode. |
| `onConfirm` | `(value: string) => void` | — | Called when the user presses Enter or blurs the input. |
| `onCancel` | `() => void` | — | Called when the user presses Escape. |
| `onChange` | `(value: string) => void` | — | Called on every keystroke while editing. |
| `label` | `ReactNode` | — | Label rendered above the editable text. |
| `className` | `string` | `""` | Additional CSS class names on the root element. |
| `maxLength` | `number` | — | Maximum character length for the input. |
| `fullWidth` | `boolean` | `false` | Stretches the component to fill its container. |

## Ref API

Access imperative methods via `ref`:

| Method | Description |
| ---------------- | ------------------------------------------- |
| `startEditing()` | Programmatically enter edit mode. |
| `confirm()` | Confirm the current draft and exit editing. |
| `cancel()` | Cancel editing and revert to the last value. |
| `inputElement` | The underlying `<input>` DOM element. |

## Usage

### Basic (uncontrolled)

```tsx
<Editable defaultValue="Project Alpha" onConfirm={(v) => console.log(v)} />
```

### Controlled

```tsx
const [name, setName] = useState("Jane Doe");

<Editable value={name} onConfirm={setName} />
```

### Variants

```tsx
<Editable variant="inline" defaultValue="Inline" />
<Editable variant="outlined" defaultValue="Outlined" />
<Editable variant="filled" defaultValue="Filled" />
```

### Sizes

```tsx
<Editable size="small" defaultValue="Small text" />
<Editable size="medium" defaultValue="Medium text" />
```

### With label

```tsx
<Editable label="Project name" defaultValue="Synapse" />
```

### Double-click to edit

```tsx
<Editable startEditOn="doubleClick" defaultValue="Double-click me" />
```

### Disabled & read-only

```tsx
<Editable disabled defaultValue="Cannot edit" />
<Editable readOnly defaultValue="Read only" />
```

### Full width

```tsx
<Editable fullWidth defaultValue="Takes the full width" />
```

## Keyboard

| Key | Action |
| -------- | -------------------------------------- |
| `Enter` | Confirm the new value and exit editing |
| `Escape` | Cancel editing and revert |
| `Tab` | Focus the display text |
| `Space` | Enter edit mode (when display focused) |

## Accessibility

- The display text has `role="button"` and is focusable via `tabIndex={0}`.
- Pressing `Enter` or `Space` on the display text enters edit mode.
- The input receives focus and selects all text automatically on edit.
- `aria-label` is set on the input when a string label is provided.

## File Structure

```
src/components/common/Editable/
├── Editable.tsx    # Component implementation
├── Editable.css    # Display/input styles, variants, sizes
└── README.md       # This file
```
