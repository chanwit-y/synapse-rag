# Paper

A container component for displaying content on an elevated surface, inspired by Material UI's Paper.

## Import

```tsx
import Paper from "@/components/common/Paper/Paper";
```

## Basic Usage

```tsx
<Paper>
  <p>Default paper with elevation 1.</p>
</Paper>
```

## Elevation

Use the `elevation` prop to control shadow depth. Higher values move the surface further from the background.

```tsx
<Paper elevation={0}>Flat — no shadow</Paper>
<Paper elevation={1}>Elevation 1 (default)</Paper>
<Paper elevation={3}>Elevation 3</Paper>
<Paper elevation={8}>Elevation 8</Paper>
<Paper elevation={16}>Elevation 16</Paper>
<Paper elevation={24}>Elevation 24</Paper>
```

In dark mode, higher elevations also lighten the surface with a semi-transparent white overlay.

## Outlined Variant

Use `variant="outlined"` for a flat surface with a border and no shadow.

```tsx
<Paper variant="outlined">
  <p>Outlined paper — no shadow, just a border.</p>
</Paper>
```

## Square Corners

By default, Paper has rounded corners (4px border-radius). Set `square` to remove them.

```tsx
<Paper square>
  <p>Square corners</p>
</Paper>

<Paper>
  <p>Rounded corners (default)</p>
</Paper>
```

## Custom Root Element

Use the `component` prop to render a different HTML element.

```tsx
<Paper component="section" elevation={2}>
  <h2>Section title</h2>
  <p>This Paper renders as a &lt;section&gt; element.</p>
</Paper>

<Paper component="aside" variant="outlined">
  <p>Sidebar content rendered as an &lt;aside&gt;.</p>
</Paper>
```

## Combining with Other Components

Paper works well as a container for other components.

```tsx
<Paper elevation={3} style={{ padding: 24 }}>
  <h3>Sign In</h3>
  <input type="email" placeholder="Email" />
  <input type="password" placeholder="Password" />
  <Button variant="contained">Log in</Button>
</Paper>
```

## Custom Styles and HTML Attributes

Paper accepts all standard `div` attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding.

```tsx
<Paper
  elevation={4}
  className="my-panel"
  style={{ padding: 16, maxWidth: 480 }}
  onClick={() => console.log("clicked")}
>
  <p>Custom styled paper</p>
</Paper>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevation` | `number` (0–24) | `1` | Shadow depth. Only applies when `variant` is `"elevation"` |
| `square` | `boolean` | `false` | If `true`, rounded corners are disabled |
| `variant` | `"elevation" \| "outlined"` | `"elevation"` | Visual style — elevated with shadow or flat with border |
| `component` | `React.ElementType` | `"div"` | The root element to render |
