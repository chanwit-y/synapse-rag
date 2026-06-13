# Box

A general-purpose layout primitive that maps CSS properties to React props, inspired by Material UI's Box.

## Import

```tsx
import Box from "@/components/common/Box/Box";
```

## Basic Usage

```tsx
<Box padding={16}>
  <p>Content with 16px padding.</p>
</Box>
```

## Spacing

Use shorthand `paddingX` / `paddingY` and `marginX` / `marginY` for horizontal and vertical spacing, or set each side individually.

```tsx
<Box padding={24} marginBottom={16}>
  <p>24px padding all around, 16px bottom margin.</p>
</Box>

<Box paddingX={32} paddingY={12}>
  <p>Horizontal 32px, vertical 12px.</p>
</Box>

<Box paddingTop={8} paddingLeft={16}>
  <p>Fine-grained spacing.</p>
</Box>
```

## Sizing

```tsx
<Box width="100%" maxWidth={600} height={200}>
  <p>Responsive container</p>
</Box>

<Box width={300} minHeight={100}>
  <p>Fixed width, minimum height</p>
</Box>
```

## Display & Position

```tsx
<Box display="flex" position="relative">
  <Box position="absolute" top={0} right={0}>
    Badge
  </Box>
  <p>Content</p>
</Box>
```

## Background & Color

```tsx
<Box bgcolor="#f5f5f5" color="#333" padding={16} borderRadius={8}>
  <p>Styled surface</p>
</Box>
```

## Borders & Shadows

```tsx
<Box border="1px solid #e0e0e0" borderRadius={4} padding={16}>
  <p>Bordered box</p>
</Box>

<Box
  boxShadow="0 2px 8px rgba(0,0,0,0.1)"
  borderRadius={12}
  padding={24}
>
  <p>Elevated box</p>
</Box>
```

## Custom Root Element

Use the `component` prop to render a different HTML element.

```tsx
<Box component="section" padding={24}>
  <h2>Section title</h2>
  <p>This Box renders as a &lt;section&gt; element.</p>
</Box>

<Box component="nav" display="flex" gap={16}>
  <a href="/home">Home</a>
  <a href="/about">About</a>
</Box>
```

## Combining with Other Components

Box works well as a wrapper to add spacing or layout around other components.

```tsx
<Box marginBottom={24}>
  <Card>
    <CardContent>Wrapped in a Box for bottom margin.</CardContent>
  </Card>
</Box>

<Box display="flex" gap={16} padding={16} bgcolor="#fafafa" borderRadius={8}>
  <Paper elevation={2} style={{ padding: 16 }}>Left</Paper>
  <Paper elevation={2} style={{ padding: 16 }}>Right</Paper>
</Box>
```

## Overflow

```tsx
<Box height={200} overflow="auto" border="1px solid #ccc" padding={16}>
  <p>Scrollable content when it exceeds 200px height...</p>
</Box>
```

## Custom Styles and HTML Attributes

Box accepts all standard HTML attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding. Inline `style` is merged with the prop-driven styles, with `style` taking precedence.

```tsx
<Box
  padding={16}
  bgcolor="#e3f2fd"
  className="my-box"
  style={{ fontWeight: "bold" }}
  onClick={() => console.log("clicked")}
>
  <p>Custom styled box</p>
</Box>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `component` | `React.ElementType` | `"div"` | The root element to render |
| `padding` | `number \| string` | — | Padding on all sides |
| `paddingX` | `number \| string` | — | Horizontal padding (left + right) |
| `paddingY` | `number \| string` | — | Vertical padding (top + bottom) |
| `paddingTop` | `number \| string` | — | Top padding |
| `paddingRight` | `number \| string` | — | Right padding |
| `paddingBottom` | `number \| string` | — | Bottom padding |
| `paddingLeft` | `number \| string` | — | Left padding |
| `margin` | `number \| string` | — | Margin on all sides |
| `marginX` | `number \| string` | — | Horizontal margin (left + right) |
| `marginY` | `number \| string` | — | Vertical margin (top + bottom) |
| `marginTop` | `number \| string` | — | Top margin |
| `marginRight` | `number \| string` | — | Right margin |
| `marginBottom` | `number \| string` | — | Bottom margin |
| `marginLeft` | `number \| string` | — | Left margin |
| `width` | `number \| string` | — | Width |
| `minWidth` | `number \| string` | — | Minimum width |
| `maxWidth` | `number \| string` | — | Maximum width |
| `height` | `number \| string` | — | Height |
| `minHeight` | `number \| string` | — | Minimum height |
| `maxHeight` | `number \| string` | — | Maximum height |
| `display` | `string` | — | CSS display value |
| `overflow` | `string` | — | CSS overflow value |
| `position` | `string` | — | CSS position value |
| `top` | `number \| string` | — | Top offset |
| `right` | `number \| string` | — | Right offset |
| `bottom` | `number \| string` | — | Bottom offset |
| `left` | `number \| string` | — | Left offset |
| `zIndex` | `number` | — | Z-index |
| `bgcolor` | `string` | — | Background color |
| `color` | `string` | — | Text color |
| `borderRadius` | `number \| string` | — | Border radius |
| `border` | `string` | — | Border shorthand |
| `boxShadow` | `string` | — | Box shadow |
