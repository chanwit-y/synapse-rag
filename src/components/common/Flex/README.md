# Flex

A layout component that provides a declarative API for CSS Flexbox.

## Import

```tsx
import Flex from "@/components/common/Flex/Flex";
```

## Basic Usage

```tsx
<Flex gap={8}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Flex>
```

## Column Layout

Use the `column` shorthand to stack children vertically.

```tsx
<Flex column gap={16}>
  <div>Top</div>
  <div>Middle</div>
  <div>Bottom</div>
</Flex>
```

## Alignment

```tsx
// Center both axes
<Flex justify="center" align="center" style={{ height: 200 }}>
  <div>Centered</div>
</Flex>

// Space between with vertical centering
<Flex justify="space-between" align="center">
  <span>Left</span>
  <span>Right</span>
</Flex>

// Align to end
<Flex justify="flex-end" gap={8}>
  <button>Cancel</button>
  <button>Save</button>
</Flex>
```

## Wrapping

```tsx
<Flex wrap="wrap" gap={12}>
  {tags.map((tag) => (
    <span key={tag}>{tag}</span>
  ))}
</Flex>
```

## Inline Flex

```tsx
<p>
  Text with <Flex inline align="center" gap={4}><Icon /> inline content</Flex> inside.
</p>
```

## Flex Sizing

Control how the Flex container itself behaves inside a parent flex container.

```tsx
<Flex gap={16}>
  <Flex grow={1} shrink={0} basis="200px">Sidebar</Flex>
  <Flex grow={1}>Main content</Flex>
</Flex>
```

Or use the shorthand `flex` prop:

```tsx
<Flex gap={16}>
  <Flex flex="0 0 240px">Fixed sidebar</Flex>
  <Flex flex={1}>Flexible content</Flex>
</Flex>
```

## Separate Row and Column Gaps

```tsx
<Flex wrap="wrap" rowGap={16} columnGap={8}>
  <div>A</div>
  <div>B</div>
  <div>C</div>
</Flex>
```

## Custom Styles and HTML Attributes

Flex accepts all standard `div` attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding.

```tsx
<Flex
  align="center"
  gap={8}
  className="my-toolbar"
  style={{ padding: 16, background: "#f5f5f5" }}
  onClick={() => console.log("clicked")}
>
  <span>Toolbar content</span>
</Flex>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inline` | `boolean` | `false` | Use `inline-flex` instead of `flex` |
| `column` | `boolean` | `false` | Shorthand for `direction="column"` |
| `direction` | `"row" \| "column" \| "row-reverse" \| "column-reverse"` | — | Flex direction |
| `wrap` | `"nowrap" \| "wrap" \| "wrap-reverse"` | — | Flex wrap |
| `justify` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | — | Justify content |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | — | Align items |
| `alignContent` | `string` | — | Align content (multi-line) |
| `alignSelf` | `string` | — | Align self override |
| `gap` | `number \| string` | — | Gap between children |
| `rowGap` | `number \| string` | — | Row gap |
| `columnGap` | `number \| string` | — | Column gap |
| `grow` | `number` | — | Flex grow |
| `shrink` | `number` | — | Flex shrink |
| `basis` | `number \| string` | — | Flex basis |
| `flex` | `number \| string` | — | Flex shorthand |
