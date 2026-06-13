# DateRangePicker

A dual-calendar date range picker with a presets sidebar, hover-based range preview, and responsive layout. Click to select a start date, then click again to select an end date. Includes built-in presets like "Last 7 days" and "This month".

## Import

```tsx
import DateRangePicker from "@/components/common/DateRangePicker/DateRangePicker";
import type { DateRange } from "@/components/common/DateRangePicker/DateRangePicker";
```

## Basic Usage

```tsx
<DateRangePicker label="Travel dates" />
```

## Sizes

```tsx
<DateRangePicker label="Medium (default)" size="medium" />
<DateRangePicker label="Small" size="small" />
```

## Helper Text

```tsx
<DateRangePicker label="Period" helperText="Select check-in and check-out dates" />
```

## Error State

```tsx
<DateRangePicker label="Period" error helperText="Select a valid range" />
```

## Required Field

```tsx
<DateRangePicker label="Report Period" required />
```

## Disabled

```tsx
<DateRangePicker label="Disabled" disabled />
```

## Min / Max Date

```tsx
<DateRangePicker
  label="This quarter"
  minDate={new Date(2025, 3, 1)}
  maxDate={new Date(2025, 5, 30)}
/>
```

## Full Width

```tsx
<DateRangePicker label="Full width" fullWidth />
```

## Display Formats

```tsx
<DateRangePicker label="ISO" displayFormat="yyyy-MM-dd" />
<DateRangePicker label="US" displayFormat="MM/dd/yyyy" />
<DateRangePicker label="EU" displayFormat="dd/MM/yyyy" />
```

## Controlled

```tsx
const [range, setRange] = useState<DateRange | null>(null);

<DateRangePicker
  label="Controlled"
  value={range}
  onChange={(next) => setRange(next)}
/>
```

## Color

```tsx
<DateRangePicker label="Primary" color="primary" />
<DateRangePicker label="Secondary" color="secondary" />
<DateRangePicker label="Error" color="error" />
```

## Form Submission

Pass `name` to render two hidden inputs (`name_start` and `name_end`) for form submissions.

```tsx
<DateRangePicker label="Period" name="booking" />
<!-- renders: <input name="booking_start" /> and <input name="booking_end" /> -->
```

## Built-in Presets

The dropdown includes a sidebar with quick-select presets:
- **Today** — single day
- **Last 7 days** — past week
- **Last 30 days** — past month
- **This month** — 1st of current month to today
- **Last month** — full previous month

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `ReactNode` | — | Label displayed above the field |
| `helperText` | `ReactNode` | — | Helper text below the field |
| `error` | `boolean` | `false` | Applies error styling |
| `fullWidth` | `boolean` | `false` | Takes the full container width |
| `size` | `"small" \| "medium"` | `"medium"` | Size of the field |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Focus/active color |
| `value` | `DateRange \| null` | — | Controlled value |
| `defaultValue` | `DateRange \| null` | — | Initial value when uncontrolled |
| `placeholder` | `string` | `"Select date range"` | Placeholder text |
| `disabled` | `boolean` | `false` | Disables the field |
| `required` | `boolean` | `false` | Marks the field as required |
| `name` | `string` | — | Hidden inputs name prefix for form submission |
| `minDate` | `Date` | — | Minimum selectable date |
| `maxDate` | `Date` | — | Maximum selectable date |
| `displayFormat` | `"yyyy-MM-dd" \| "MM/dd/yyyy" \| "dd/MM/yyyy"` | `"yyyy-MM-dd"` | Display format |
| `usePortal` | `boolean` | `true` | Render dropdown via portal |
| `clearable` | `boolean` | `true` | Show clear button |
| `onChange` | `(value: DateRange \| null) => void` | — | Called when the range changes |
| `onBlur` | `() => void` | — | Called after the dropdown is closed |

### DateRange

| Property | Type | Description |
|----------|------|-------------|
| `start` | `string \| null` | Start date as ISO string (yyyy-MM-dd) |
| `end` | `string \| null` | End date as ISO string (yyyy-MM-dd) |
