# Typography

A polymorphic text component for applying consistent typographic styles across the app.

## Import

```tsx
import Typography from "@/components/common/Typography/Typography";
```

## Basic Usage

```tsx
<Typography variant="h1">Page Title</Typography>
<Typography variant="body1">Regular paragraph text.</Typography>
```

## Variants

Every variant maps to a sensible default HTML element.

```tsx
<Typography variant="h1">h1. Heading</Typography>
<Typography variant="h2">h2. Heading</Typography>
<Typography variant="h3">h3. Heading</Typography>
<Typography variant="h4">h4. Heading</Typography>
<Typography variant="h5">h5. Heading</Typography>
<Typography variant="h6">h6. Heading</Typography>

<Typography variant="subtitle1">Larger subtitle</Typography>
<Typography variant="subtitle2">Smaller subtitle</Typography>

<Typography variant="body1">Default body text</Typography>
<Typography variant="body2">Smaller body text</Typography>

<Typography variant="caption">Caption text</Typography>
<Typography variant="overline">Overline text</Typography>
```

| Variant | Default element | Size | Weight |
|---|---|---|---|
| `h1` | `<h1>` | 2.25rem | 700 |
| `h2` | `<h2>` | 1.875rem | 700 |
| `h3` | `<h3>` | 1.5rem | 600 |
| `h4` | `<h4>` | 1.25rem | 600 |
| `h5` | `<h5>` | 1.125rem | 600 |
| `h6` | `<h6>` | 1rem | 600 |
| `subtitle1` | `<h6>` | 1.125rem | 400 |
| `subtitle2` | `<h6>` | 0.875rem | 500 |
| `body1` | `<p>` | 1rem | 400 |
| `body2` | `<p>` | 0.875rem | 400 |
| `caption` | `<span>` | 0.75rem | 400 |
| `overline` | `<span>` | 0.75rem | 500 |

## Colors

```tsx
<Typography color="foreground">Primary text</Typography>
<Typography color="muted">Secondary text</Typography>
<Typography color="accent">Accent text</Typography>
<Typography color="error">Error message</Typography>
<Typography color="success">Success message</Typography>
<Typography color="inherit">Inherits parent color</Typography>
```

## Alignment

```tsx
<Typography align="left">Left aligned</Typography>
<Typography align="center">Center aligned</Typography>
<Typography align="right">Right aligned</Typography>
<Typography align="justify">Justified text</Typography>
```

## Gutter Bottom

Adds a bottom margin of `0.5em` to visually separate the element from the content below.

```tsx
<Typography variant="h3" gutterBottom>
  Section Title
</Typography>
<Typography>Content below the title.</Typography>
```

## No Wrap (Truncation)

Prevents text from wrapping and truncates with an ellipsis.

```tsx
<Typography noWrap style={{ maxWidth: 200 }}>
  This very long text will be truncated with an ellipsis.
</Typography>
```

## Custom Element

Override the rendered HTML element with the `component` prop.

```tsx
<Typography variant="h1" component="div">
  Styled like h1, rendered as a div
</Typography>

<Typography variant="body2" component="label">
  Styled like body2, rendered as a label
</Typography>
```

## Custom Styles and HTML Attributes

Typography accepts all standard HTML attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding.

```tsx
<Typography
  variant="h4"
  color="accent"
  className="my-heading"
  style={{ maxWidth: 600 }}
>
  Custom styled heading
</Typography>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "subtitle1" \| "subtitle2" \| "body1" \| "body2" \| "caption" \| "overline"` | `"body1"` | Typographic style to apply |
| `component` | `ElementType` | per variant | Override the rendered HTML element |
| `color` | `"foreground" \| "muted" \| "accent" \| "inherit" \| "error" \| "success"` | — | Text color |
| `align` | `"left" \| "center" \| "right" \| "justify"` | — | Text alignment |
| `gutterBottom` | `boolean` | `false` | Adds bottom margin (`0.5em`) |
| `noWrap` | `boolean` | `false` | Truncates overflowing text with an ellipsis |
