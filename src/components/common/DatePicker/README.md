# DatePicker

A calendar-based date selection component with an outlined field trigger and portal-based dropdown calendar. Supports min/max date constraints, clearable selection, multiple display formats, and dark mode.

## Import

```tsx
import DatePicker from "@/components/common/DatePicker/DatePicker";
```

## Basic Usage

```tsx
<DatePicker label="Birthday" placeholder="Pick a date" />
```

## Sizes

```tsx
<DatePicker label="Medium (default)" size="medium" />
<DatePicker label="Small" size="small" />
```

## Helper Text

```tsx
<DatePicker label="Date" helperText="Choose your preferred date" />
```

## Error State

```tsx
<DatePicker label="Date" error helperText="Date is required" />
```

## Required Field

```tsx
<DatePicker label="Start Date" required />
```

## Disabled

```tsx
<DatePicker label="Disabled" disabled defaultValue="2025-06-15" />
```

## Display Formats

```tsx
<DatePicker label="ISO" displayFormat="yyyy-MM-dd" />
<DatePicker label="US" displayFormat="MM/dd/yyyy" />
<DatePicker label="EU" displayFormat="dd/MM/yyyy" />
```

## Min / Max Date

```tsx
<DatePicker
  label="This month only"
  minDate={new Date(2025, 5, 1)}
  maxDate={new Date(2025, 5, 30)}
/>
```

## Full Width

```tsx
<DatePicker label="Full width" fullWidth />
```

## Clearable

The clear button is shown by default. Disable it with `clearable={false}`.

```tsx
<DatePicker label="Not clearable" clearable={false} />
```

## Controlled

```tsx
const [value, setValue] = useState<string | null>(null);

<DatePicker
  label="Controlled"
  value={value}
  onChange={(next) => setValue(next)}
/>
```

## Color

```tsx
<DatePicker label="Primary" color="primary" />
<DatePicker label="Secondary" color="secondary" />
<DatePicker label="Error" color="error" />
```

## Form Submission

Pass `name` to render a hidden `<input>` so the value is included in form submissions.

```tsx
<DatePicker label="Date" name="event_date" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `ReactNode` | — | Label displayed above the field |
| `helperText` | `ReactNode` | — | Helper text below the field |
| `error` | `boolean` | `false` | Applies error styling |
| `fullWidth` | `boolean` | `false` | Takes the full container width |
| `size` | `"small" \| "medium"` | `"medium"` | Size of the field |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Focus/active color |
| `value` | `string \| Date \| null` | — | Controlled selected date |
| `defaultValue` | `string \| Date \| null` | — | Initial value when uncontrolled |
| `placeholder` | `string` | `"Select date"` | Placeholder text |
| `disabled` | `boolean` | `false` | Disables the field |
| `required` | `boolean` | `false` | Marks the field as required |
| `name` | `string` | — | Hidden input name for form submission |
| `minDate` | `Date` | — | Minimum selectable date |
| `maxDate` | `Date` | — | Maximum selectable date |
| `displayFormat` | `"yyyy-MM-dd" \| "MM/dd/yyyy" \| "dd/MM/yyyy"` | `"yyyy-MM-dd"` | Display format |
| `usePortal` | `boolean` | `true` | Render dropdown via portal |
| `clearable` | `boolean` | `true` | Show clear button |
| `onChange` | `(value: string \| null) => void` | — | Called when the date changes |
| `onBlur` | `() => void` | — | Called after the dropdown is closed |
