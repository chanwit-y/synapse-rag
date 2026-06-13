# TextField

A form input component for text entry, inspired by Material UI's TextField.

## Import

```tsx
import TextField from "@/components/common/TextField/TextField";
```

## Basic Usage

```tsx
<TextField label="Name" />
```

## Variants

### Outlined (default)

```tsx
<TextField variant="outlined" label="Outlined" />
```

### Filled

```tsx
<TextField variant="filled" label="Filled" />
```

### Standard

```tsx
<TextField variant="standard" label="Standard" />
```

## Sizes

```tsx
<TextField label="Medium (default)" size="medium" />
<TextField label="Small" size="small" />
```

## Helper Text

```tsx
<TextField label="Email" helperText="We'll never share your email." />
```

## Error State

```tsx
<TextField label="Email" error helperText="Invalid email address." />
```

## Required Field

```tsx
<TextField label="Username" required />
```

## Disabled

```tsx
<TextField label="Disabled" disabled defaultValue="Can't edit" />
```

## Full Width

```tsx
<TextField label="Full width" fullWidth />
```

## Adornments

Add icons or text at the start or end of the input.

```tsx
<TextField
  label="Amount"
  startAdornment={<span>$</span>}
/>

<TextField
  label="Weight"
  endAdornment={<span>kg</span>}
/>

<TextField
  label="Search"
  startAdornment={<SearchIcon />}
  endAdornment={<ClearIcon />}
/>
```

## Multiline

Render a `<textarea>` instead of an `<input>`.

```tsx
<TextField label="Bio" multiline rows={4} />
```

## Color

Change the focus/active color.

```tsx
<TextField label="Primary" color="primary" />
<TextField label="Secondary" color="secondary" />
<TextField label="Error" color="error" />
```

## Controlled

```tsx
const [value, setValue] = useState("");

<TextField
  label="Controlled"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

## Combining Variants, Sizes, and Adornments

```tsx
<TextField
  variant="filled"
  size="small"
  label="Price"
  startAdornment={<span>$</span>}
  endAdornment={<span>.00</span>}
/>

<TextField
  variant="standard"
  label="Password"
  type="password"
  endAdornment={<VisibilityIcon />}
/>
```

## Custom Styles and HTML Attributes

TextField accepts all standard `input` and `textarea` attributes (`className`, `style`, `type`, `name`, `autoComplete`, etc.) and supports `ref` forwarding.

```tsx
<TextField
  label="Custom"
  className="my-field"
  style={{ maxWidth: 300 }}
  name="custom"
  autoComplete="off"
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
| `startAdornment` | `ReactNode` | — | Element at the start of the input |
| `endAdornment` | `ReactNode` | — | Element at the end of the input |
| `multiline` | `boolean` | `false` | Renders a `<textarea>` |
| `rows` | `number` | — | Number of textarea rows |
| `minRows` | `number` | — | Minimum rows (auto-grow) |
| `maxRows` | `number` | — | Maximum rows (auto-grow) |
| `disabled` | `boolean` | `false` | Disables the field |
| `required` | `boolean` | `false` | Marks the field as required |
| `placeholder` | `string` | — | Placeholder text |
