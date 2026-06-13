# Card

A surface component for grouping related content and actions, inspired by Material UI's Card.

## Import

```tsx
import Card, {
  CardHeader,
  CardContent,
  CardActions,
  CardMedia,
} from "@/components/common/Card/Card";
```

## Basic Usage

```tsx
<Card>
  <CardContent>
    <h2>Hello World</h2>
    <p>This is a simple card with some text content.</p>
  </CardContent>
</Card>
```

## Outlined Variant

```tsx
<Card variant="outlined">
  <CardContent>
    <p>A flat card without a shadow.</p>
  </CardContent>
</Card>
```

## Full Card

Combine sub-components to build a rich card layout.

```tsx
<Card>
  <CardMedia component="img" image="/photo.jpg" alt="Scenic view" height={200} />
  <CardHeader
    title="Card Title"
    subheader="September 14, 2025"
  />
  <CardContent>
    <p>
      This impressive paella is a perfect party dish and a fun meal to cook
      together with your guests.
    </p>
  </CardContent>
  <CardActions>
    <Button variant="text" size="small">Share</Button>
    <Button variant="text" size="small">Learn More</Button>
  </CardActions>
</Card>
```

## Card Header with Avatar and Action

```tsx
<Card>
  <CardHeader
    avatar={<img src="/avatar.jpg" alt="User" width={40} height={40} style={{ borderRadius: "50%" }} />}
    title="John Doe"
    subheader="Software Engineer"
    action={<Button variant="text" size="small">Follow</Button>}
  />
  <CardContent>
    <p>Building things for the web.</p>
  </CardContent>
</Card>
```

## Media as Background

Use `component="div"` to render the image as a background instead of an `<img>` tag.

```tsx
<Card>
  <CardMedia component="div" image="/banner.jpg" alt="Banner" height={140} />
  <CardContent>
    <h3>Background media</h3>
    <p>The image is rendered as a CSS background.</p>
  </CardContent>
</Card>
```

## Clickable Card

Add the `clickable` prop to make the entire card interactive.

```tsx
<Card clickable onClick={() => console.log("clicked")}>
  <CardContent>
    <h3>Interactive card</h3>
    <p>Hover to see the elevated shadow. Click or press Enter to trigger the action.</p>
  </CardContent>
</Card>
```

## Actions Aligned Right

```tsx
<Card>
  <CardContent>
    <p>Are you sure you want to delete this item?</p>
  </CardContent>
  <CardActions alignRight>
    <Button variant="text" size="small">Cancel</Button>
    <Button variant="contained" size="small" color="error">Delete</Button>
  </CardActions>
</Card>
```

## Custom Styles and HTML Attributes

Card accepts all standard `div` attributes (`className`, `style`, `onClick`, etc.) and supports `ref` forwarding.

```tsx
<Card
  variant="outlined"
  className="my-card"
  style={{ maxWidth: 400 }}
>
  <CardContent>
    <p>Styled card</p>
  </CardContent>
</Card>
```

## Props

### Card

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"elevation" \| "outlined"` | `"elevation"` | Visual style of the card |
| `clickable` | `boolean` | `false` | Makes the card focusable and shows hover elevation |

### CardHeader

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `avatar` | `ReactNode` | — | Element displayed before the title |
| `title` | `ReactNode` | — | Primary text |
| `subheader` | `ReactNode` | — | Secondary text below the title |
| `action` | `ReactNode` | — | Element displayed at the top-right corner |

### CardContent

No additional props beyond standard `div` attributes.

### CardActions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `alignRight` | `boolean` | `false` | Aligns actions to the right |

### CardMedia

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `component` | `"img" \| "div"` | `"div"` | Render as `<img>` or a background `<div>` |
| `image` | `string` | — | Image URL |
| `alt` | `string` | — | Accessible alt text |
| `height` | `number \| string` | — | Height of the media area |
