# Autocomplete

A searchable combobox: a button-styled trigger opens a portal dropdown that contains a search input and a filterable option list. Inspired by Material UI's Select / Autocomplete, and adapted from the original `Autocomplete2` component (with project-specific API/observer dependencies removed).

## Import

```tsx
import Autocomplete from "@/components/common/Autocomplete/Autocomplete";
```

## Basic Usage

```tsx
<Autocomplete
  label="Country"
  placeholder="Select a country"
  options={[
    { value: "us", label: "United States" },
    { value: "th", label: "Thailand" },
    { value: "jp", label: "Japan" },
  ]}
/>
```

## Variants

### Outlined (default)

```tsx
<Autocomplete variant="outlined" label="Outlined" options={options} />
```

### Filled

```tsx
<Autocomplete variant="filled" label="Filled" options={options} />
```

### Standard

```tsx
<Autocomplete variant="standard" label="Standard" options={options} />
```

## Sizes

```tsx
<Autocomplete label="Medium (default)" size="medium" options={options} />
<Autocomplete label="Small" size="small" options={options} />
```

## Helper Text & Error State

```tsx
<Autocomplete
  label="Role"
  helperText="Choose your primary role."
  options={options}
/>

<Autocomplete
  label="Role"
  error
  errorMessage="Please choose a role."
  options={options}
/>
```

## Required Field

```tsx
<Autocomplete label="Department" required options={options} />
```

## Disabled

```tsx
<Autocomplete
  label="Disabled"
  disabled
  defaultValue="us"
  options={options}
/>
```

## Full Width

```tsx
<Autocomplete label="Full width" fullWidth options={options} />
```

## Loading State

Useful while options are being fetched asynchronously.

```tsx
<Autocomplete label="Users" loading options={[]} />
```

## Controlled

```tsx
const [value, setValue] = useState<string | number | null>(null);

<Autocomplete
  label="Controlled"
  value={value}
  onChange={(next) => setValue(next)}
  options={options}
/>
```

## Async Search

Use `onSearchChange` to react to the user's query and update `options` from the outside (e.g. fetch from an API).

```tsx
const [query, setQuery] = useState("");
const [options, setOptions] = useState<AutocompleteOption[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!query) return;
  setLoading(true);
  fetchUsers(query)
    .then((res) => setOptions(res.map((u) => ({ value: u.id, label: u.name }))))
    .finally(() => setLoading(false));
}, [query]);

<Autocomplete
  label="Users"
  options={options}
  loading={loading}
  onSearchChange={setQuery}
/>
```

## Custom Search Text

When `label` is a `ReactNode` (not a plain string/number), provide `searchText` so the option remains searchable.

```tsx
<Autocomplete
  label="User"
  options={[
    {
      value: "1",
      label: <UserCard name="Alice" />,
      searchText: "Alice Anderson",
    },
  ]}
/>
```

## Disabled Options

```tsx
<Autocomplete
  label="Plan"
  options={[
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "enterprise", label: "Enterprise (contact sales)", disabled: true },
  ]}
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"outlined" \| "filled" \| "standard"` | `"outlined"` | Visual style of the trigger field |
| `size` | `"small" \| "medium"` | `"medium"` | Size of the trigger field |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Focus/active color |
| `label` | `ReactNode` | — | Label displayed above / inside the field |
| `helperText` | `ReactNode` | — | Helper text below the field |
| `errorMessage` | `ReactNode` | — | Replaces `helperText` when `error` is true |
| `error` | `boolean` | `false` | Applies error styling |
| `fullWidth` | `boolean` | `false` | Takes the full container width |
| `options` | `AutocompleteOption[]` | — | Options to render in the dropdown |
| `value` | `string \| number \| null` | — | Controlled selected value |
| `defaultValue` | `string \| number \| null` | — | Initial value when uncontrolled |
| `placeholder` | `string` | — | Text shown when no option is selected |
| `searchPlaceholder` | `string` | `"Type to search..."` | Placeholder for the dropdown search input |
| `noResultsText` | `ReactNode` | `"No results found"` | Empty-state node |
| `loadingText` | `ReactNode` | `"Loading..."` | Loading-state node |
| `loading` | `boolean` | `false` | Show loading indicator |
| `disabled` | `boolean` | `false` | Disables the trigger |
| `required` | `boolean` | `false` | Marks field as required |
| `usePortal` | `boolean` | `true` | Render dropdown into `document.body` |
| `maxDropdownHeight` | `number` | `280` | Maximum dropdown height in pixels |
| `onChange` | `(value: string \| number \| null) => void` | — | Fired when selection changes |
| `onSearchChange` | `(query: string) => void` | — | Fired when the search input changes |
| `onBlur` | `() => void` | — | Fired when the dropdown closes |

### `AutocompleteOption`

| Property | Type | Description |
| --- | --- | --- |
| `value` | `string \| number` | The option value |
| `label` | `ReactNode` | The display content |
| `searchText` | `string` | Optional plain string used for filtering when `label` isn't a string/number |
| `disabled` | `boolean` | If true, the option cannot be selected |

## Keyboard Support

| Key | Behavior |
| --- | --- |
| `Enter` / `Space` / `↓` (when closed) | Open the dropdown and focus the search input |
| `↓` / `↑` (when open) | Move active highlight through options |
| `Enter` (when open) | Select the active option |
| `Escape` | Close the dropdown and return focus to the trigger |
| `Tab` | Close the dropdown |

## Notes

- The dropdown is rendered into `document.body` via a portal by default, so it escapes clipping from `overflow:hidden` ancestors. Set `usePortal={false}` if you need it inline.
- The component repositions the dropdown on window resize and scroll while open.
- All standard MUI-style theming variables (`--mui-primary`, `--mui-secondary`, `--mui-error`, etc.) are inherited from the surrounding components, so the look stays consistent with `TextField` and `SelectField`.
