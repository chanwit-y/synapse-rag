# DateTimePicker

A combined date and time picker with a calendar dropdown and time selectors. Supports 12/24-hour format, configurable minute steps, min/max constraints, and dark mode.

## Import

```tsx
import DateTimePicker from "@/components/common/DateTimePicker/DateTimePicker";
```

## Basic Usage

```tsx
<DateTimePicker label="Appointment" />
```

## 12-Hour Format

```tsx
<DateTimePicker label="Meeting" use24Hour={false} />
```

## Minute Steps

```tsx
<DateTimePicker label="Schedule" minuteStep={15} />
```

## Sizes

```tsx
<DateTimePicker label="Medium (default)" size="medium" />
<DateTimePicker label="Small" size="small" />
```

## Helper Text

```tsx
<DateTimePicker label="When" helperText="Select a date and time" />
```

## Error State

```tsx
<DateTimePicker label="When" error helperText="Invalid date/time" />
```

## Required Field

```tsx
<DateTimePicker label="Start" required />
```

## Disabled

```tsx
<DateTimePicker label="Disabled" disabled />
```

## Min / Max Date

```tsx
<DateTimePicker
  label="This week"
  minDate={new Date(2025, 5, 1)}
  maxDate={new Date(2025, 5, 7)}
/>
```

## Full Width

```tsx
<DateTimePicker label="Full width" fullWidth />
```

## Controlled

```tsx
const [value, setValue] = useState<string | null>(null);

<DateTimePicker
  label="Controlled"
  value={value}
  onChange={(next) => setValue(next)}
/>
```

## Color

```tsx
<DateTimePicker label="Primary" color="primary" />
<DateTimePicker label="Secondary" color="secondary" />
<DateTimePicker label="Error" color="error" />
```

## Form Submission

```tsx
<DateTimePicker label="Event" name="event_datetime" />
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
| `value` | `string \| Date \| null` | — | Controlled value (ISO string or Date) |
| `defaultValue` | `string \| Date \| null` | — | Initial value when uncontrolled |
| `placeholder` | `string` | `"Select date & time"` | Placeholder text |
| `disabled` | `boolean` | `false` | Disables the field |
| `required` | `boolean` | `false` | Marks the field as required |
| `name` | `string` | — | Hidden input name for form submission |
| `minDate` | `Date` | — | Minimum selectable date |
| `maxDate` | `Date` | — | Maximum selectable date |
| `use24Hour` | `boolean` | `true` | Use 24-hour format |
| `minuteStep` | `number` | `1` | Minute step interval |
| `usePortal` | `boolean` | `true` | Render dropdown via portal |
| `clearable` | `boolean` | `true` | Show clear button |
| `onChange` | `(value: string \| null) => void` | — | Called when the datetime changes |
| `onBlur` | `() => void` | — | Called after the dropdown is closed |
