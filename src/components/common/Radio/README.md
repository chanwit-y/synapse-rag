# Radio

A radio button component for single-option selection within a group, inspired by Material UI's Radio.

## Import

```tsx
import Radio from "@/components/common/Radio/Radio";
```

## Basic Usage

```tsx
<Radio name="option" value="a" label="Option A" />
<Radio name="option" value="b" label="Option B" />
```

## Colors

```tsx
<Radio name="color" value="primary" label="Primary" color="primary" defaultChecked />
<Radio name="color" value="secondary" label="Secondary" color="secondary" />
<Radio name="color" value="error" label="Error" color="error" />
```

## Disabled

```tsx
<Radio name="disabled" label="Disabled" disabled />
<Radio name="disabled" label="Disabled checked" disabled defaultChecked />
```

## Without Label

```tsx
<Radio name="no-label" value="a" />
<Radio name="no-label" value="b" />
```

## Disable Ripple

```tsx
<Radio name="ripple" value="a" label="No ripple" disableRipple />
```

## Controlled

```tsx
const [value, setValue] = useState("a");

<Radio
  name="controlled"
  value="a"
  label="Option A"
  checked={value === "a"}
  onChange={() => setValue("a")}
/>
<Radio
  name="controlled"
  value="b"
  label="Option B"
  checked={value === "b"}
  onChange={() => setValue("b")}
/>
```

## Radio Group Pattern

Use a shared `name` attribute to group radio buttons. Only one radio in a group can be selected at a time.

```tsx
<Flex gap={2}>
  <Radio name="size" value="small" label="Small" />
  <Radio name="size" value="medium" label="Medium" defaultChecked />
  <Radio name="size" value="large" label="Large" />
</Flex>
```

## Custom Styles and HTML Attributes

Radio accepts all standard `input` attributes (`className`, `style`, `name`, `value`, etc.) and supports `ref` forwarding.

```tsx
<Radio
  name="custom"
  value="x"
  label="Custom"
  className="my-radio"
  style={{ marginTop: 8 }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `ReactNode` | — | Label text displayed next to the radio |
| `color` | `"primary" \| "secondary" \| "error"` | `"primary"` | Theme color for the radio |
| `disableRipple` | `boolean` | `false` | Disables the ripple effect on click |
| `disabled` | `boolean` | `false` | Disables the radio |
| `name` | `string` | — | Groups radios so only one can be selected |
| `value` | `string` | — | The value of the radio input |
| `checked` | `boolean` | — | Controlled checked state |
| `defaultChecked` | `boolean` | — | Initial checked state (uncontrolled) |
| `onChange` | `ChangeEventHandler` | — | Callback when the radio selection changes |
| `className` | `string` | `""` | Additional CSS class names |
| `id` | `string` | auto | HTML id (auto-generated if omitted) |
