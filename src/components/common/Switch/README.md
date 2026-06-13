# Switch

An iOS-style toggle control for binary on/off states. Supports colors, sizes, labels, and full keyboard/screen-reader accessibility.

## Import

```tsx
import Switch from "@/components/common/Switch/Switch";
```

## Props

| Prop | Type | Default | Description |
| --------------- | ----------------------------------------- | ------------ | ----------------------------------------------- |
| `label` | `ReactNode` | — | Optional label rendered beside the toggle. |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Theme color applied to the track and thumb. |
| `size` | `"small" \| "medium"` | `"medium"` | Controls the dimensions of the toggle. |
| `disabled` | `boolean` | `false` | Disables the input and dims the visual. |
| `defaultChecked`| `boolean` | `false` | Uncontrolled initial checked state. |
| `checked` | `boolean` | — | Controlled checked state. |
| `onChange` | `ChangeEventHandler<HTMLInputElement>` | — | Fires when the toggle value changes. |
| `className` | `string` | `""` | Additional CSS class names on the root `<label>`. |
| `id` | `string` | auto | Explicit `id` for the hidden `<input>`. |

All other `InputHTMLAttributes<HTMLInputElement>` props (except `type` and `size`) are forwarded to the underlying `<input>`.

## Usage

### Basic

```tsx
<Switch label="Notifications" defaultChecked />
<Switch label="Airplane mode" />
```

### Controlled

```tsx
const [enabled, setEnabled] = useState(false);

<Switch
  label="Dark mode"
  checked={enabled}
  onChange={(e) => setEnabled(e.target.checked)}
/>
```

### Colors

```tsx
<Switch color="primary" defaultChecked label="Primary" />
<Switch color="secondary" defaultChecked label="Secondary" />
<Switch color="error" defaultChecked label="Error" />
```

### Sizes

```tsx
<Switch size="small" defaultChecked label="Small" />
<Switch size="medium" defaultChecked label="Medium" />
```

### Disabled

```tsx
<Switch disabled label="Disabled off" />
<Switch disabled defaultChecked label="Disabled on" />
```

## Accessibility

- Renders a native `<input type="checkbox" role="switch">` so screen readers announce it as a switch.
- The visible label is associated via the wrapping `<label>` element.
- Full keyboard navigation: `Tab` to focus, `Space` to toggle.
- Focus-visible outline follows the active color.

## File Structure

```
src/components/common/Switch/
├── Switch.tsx    # Component implementation
├── Switch.css    # iOS-style toggle styles (track, thumb, sizes)
└── README.md     # This file
```
