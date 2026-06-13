# Loader

A circular loading indicator for inline or centered loading states.

## Import

```tsx
import Loader from "@/components/common/Loader/Loader";
```

## Basic Usage

```tsx
<Loader />
```

## With Label

```tsx
<Loader label="Loading documents…" />
```

## Centered in Container

```tsx
<div style={{ minHeight: 200 }}>
  <Loader centered label="Please wait" />
</div>
```

## Blur Backdrop

Cover a positioned parent with a blurred overlay. The parent must have `position: relative` (or similar).

```tsx
<div style={{ position: "relative", minHeight: 200 }}>
  <p>Content behind the loader</p>
  {isLoading && <Loader backdrop label="Loading…" />}
</div>
```

Full-viewport overlay:

```tsx
{isLoading && <Loader backdrop fixed label="Loading…" size="large" />}
```

## Size & Color

```tsx
<Loader size="small" />
<Loader size="large" color="secondary" />
<Loader color="error" label="Saving failed retry…" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Spinner dimensions |
| `color` | `"primary" \| "secondary" \| "error" \| "inherit"` | `"primary"` | Spinner color |
| `label` | `ReactNode` | — | Optional text below the spinner |
| `centered` | `boolean` | `false` | Center horizontally in the container |
| `backdrop` | `boolean` | `false` | Blurred overlay covering the parent |
| `fixed` | `boolean` | `false` | With `backdrop`, cover the viewport |
| `aria-label` | `string` | `"Loading"` or `label` when string | Accessible name |
