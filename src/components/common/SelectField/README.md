# SelectField

A form select component for choosing from a list of options, inspired by Material UI's Select. It uses a custom button + portal-based dropdown panel (the same look-and-feel as `Autocomplete`) so the option list can be styled consistently across the app.

## Import

```tsx
import SelectField from "@/components/common/SelectField/SelectField";
```

## Basic Usage

```tsx
<SelectField
  label="Age"
  options={[
    { value: 10, label: "Ten" },
    { value: 20, label: "Twenty" },
    { value: 30, label: "Thirty" },
  ]}
/>
```

## Variants

### Outlined (default)

```tsx
<SelectField variant="outlined" label="Outlined" options={options} />
```

### Filled

```tsx
<SelectField variant="filled" label="Filled" options={options} />
```

### Standard

```tsx
<SelectField variant="standard" label="Standard" options={options} />
```

## Sizes

```tsx
<SelectField label="Medium (default)" size="medium" options={options} />
<SelectField label="Small" size="small" options={options} />
```

## Placeholder

```tsx
<SelectField label="Country" placeholder="Select a country" options={options} />
```

## Helper Text

```tsx
<SelectField label="Role" helperText="Choose your primary role." options={options} />
```

## Error State

```tsx
<SelectField label="Role" error helperText="Please select a role." options={options} />
```

## Required Field

```tsx
<SelectField label="Department" required options={options} />
```

## Disabled

```tsx
<SelectField label="Disabled" disabled defaultValue={10} options={options} />
```

## Full Width

```tsx
<SelectField label="Full width" fullWidth options={options} />
```

## Adornment

Add an icon or text at the start of the select.

```tsx
<SelectField
  label="Currency"
  startAdornment={<span>$</span>}
  options={currencies}
/>
```

## Color

Change the focus/active color.

```tsx
<SelectField label="Primary" color="primary" options={options} />
<SelectField label="Secondary" color="secondary" options={options} />
<SelectField label="Error" color="error" options={options} />
```

## Controlled

The `onChange` callback receives the selected `value` directly (or `null` when cleared), matching the `Autocomplete` API.

```tsx
const [value, setValue] = useState<string | number | null>(null);

<SelectField
  label="Controlled"
  value={value}
  onChange={(next) => setValue(next)}
  options={options}
/>
```

## Combining Variants, Sizes, and Adornments

```tsx
<SelectField
  variant="filled"
  size="small"
  label="Category"
  startAdornment={<TagIcon />}
  options={categories}
/>

<SelectField
  variant="standard"
  label="Priority"
  options={priorities}
/>
```

## Custom Styles and Form Submission

`SelectField` forwards `ref` to the underlying trigger button. Pass `name` to render a hidden input so the value is included in form submissions.

```tsx
<SelectField
  label="Custom"
  className="my-select"
  name="role"
  options={options}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"outlined" \| "filled" \| "standard"` | `"outlined"` | Visual style of the field |
| `size` | `"small" \| "medium"` | `"medium"` | Size of the field |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Focus/active color |
| `label` | `ReactNode` | — | Label displayed above / inside the field |
| `helperText` | `ReactNode` | — | Helper text below the field |
| `error` | `boolean` | `false` | Applies error styling |
| `fullWidth` | `boolean` | `false` | Takes the full container width |
| `startAdornment` | `ReactNode` | — | Element at the start of the select |
| `options` | `SelectOption[]` | `[]` | Options to render in the dropdown |
| `value` | `string \| number \| null` | — | Controlled selected value |
| `defaultValue` | `string \| number \| null` | — | Initial value when uncontrolled |
| `placeholder` | `string` | — | Placeholder shown when no option is selected |
| `disabled` | `boolean` | `false` | Disables the field |
| `required` | `boolean` | `false` | Marks the field as required |
| `name` | `string` | — | If provided, a hidden input is rendered for form submission |
| `usePortal` | `boolean` | `true` | Render the dropdown into `document.body` via a portal |
| `maxDropdownHeight` | `number` | `280` | Maximum dropdown height in pixels |
| `onChange` | `(value: string \| number \| null) => void` | — | Called when the selection changes |
| `onBlur` | `() => void` | — | Called after the dropdown is closed |

### SelectOption

| Property | Type | Description |
|----------|------|-------------|
| `value` | `string \| number` | The option value |
| `label` | `ReactNode` | The display text |
| `disabled` | `boolean` | If true, the option is disabled |
