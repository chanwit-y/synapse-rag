# Grid

A layout component that provides a declarative API for CSS Grid.

## Import

```tsx
import Grid from "@/components/common/Grid/Grid";
```

## Basic Usage

```tsx
<Grid columns="1fr 1fr 1fr" gap={16}>
  <div>Cell 1</div>
  <div>Cell 2</div>
  <div>Cell 3</div>
</Grid>
```

## Repeat Columns

```tsx
<Grid columns="repeat(4, 1fr)" gap={12}>
  {items.map((item) => (
    <div key={item.id}>{item.name}</div>
  ))}
</Grid>
```

## Responsive with Auto-fill

```tsx
<Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap={16}>
  {cards.map((card) => (
    <Card key={card.id} {...card} />
  ))}
</Grid>
```

## Explicit Rows

```tsx
<Grid columns="200px 1fr" rows="auto 1fr auto" gap={16} style={{ height: "100vh" }}>
  <header>Header</header>
  <nav>Sidebar</nav>
  <main>Content</main>
  <footer>Footer</footer>
</Grid>
```

## Named Areas

```tsx
<Grid
  columns="200px 1fr"
  rows="auto 1fr auto"
  areas={`
    "header header"
    "sidebar main"
    "footer footer"
  `}
  gap={16}
>
  <div style={{ gridArea: "header" }}>Header</div>
  <div style={{ gridArea: "sidebar" }}>Sidebar</div>
  <div style={{ gridArea: "main" }}>Main</div>
  <div style={{ gridArea: "footer" }}>Footer</div>
</Grid>
```

## Alignment

```tsx
<Grid columns="repeat(3, 1fr)" justify="center" align="center" gap={8}>
  <div>Centered cell</div>
  <div>Centered cell</div>
  <div>Centered cell</div>
</Grid>
```

## Inline Grid

```tsx
<p>
  Text with <Grid inline columns="auto auto" gap={4}>inline grid</Grid> inside.
</p>
```

## Custom Styles and HTML Attributes

Grid accepts all standard `div` attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding.

```tsx
<Grid
  columns="repeat(3, 1fr)"
  gap={16}
  className="my-grid"
  style={{ padding: 24 }}
  onClick={() => console.log("clicked")}
>
  <div>Cell</div>
</Grid>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inline` | `boolean` | `false` | Use `inline-grid` instead of `grid` |
| `columns` | `string` | — | Grid template columns |
| `rows` | `string` | — | Grid template rows |
| `areas` | `string` | — | Grid template areas |
| `autoColumns` | `string` | — | Grid auto columns |
| `autoRows` | `string` | — | Grid auto rows |
| `autoFlow` | `"row" \| "column" \| "dense" \| "row dense" \| "column dense"` | — | Grid auto flow |
| `gap` | `number \| string` | — | Gap between cells |
| `rowGap` | `number \| string` | — | Row gap |
| `columnGap` | `number \| string` | — | Column gap |
| `justify` | `"start" \| "center" \| "end" \| "stretch"` | — | Justify items |
| `align` | `"start" \| "center" \| "end" \| "stretch"` | — | Align items |
| `justifyContent` | `"start" \| "center" \| "end" \| "stretch" \| "space-between" \| "space-around" \| "space-evenly"` | — | Justify content (grid in container) |
| `alignContent` | `"start" \| "center" \| "end" \| "stretch" \| "space-between" \| "space-around" \| "space-evenly"` | — | Align content (grid in container) |
| `placeItems` | `string` | — | Shorthand for `justify` + `align` |
| `placeContent` | `string` | — | Shorthand for `justifyContent` + `alignContent` |
