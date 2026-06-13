# Drawer

A sliding panel that appears from the edge of the screen with a backdrop overlay. Supports all four directions (left, right, top, bottom), multiple sizes, header/footer sections, keyboard dismissal, and smooth slide animations.

## Import

```tsx
import Drawer from "@/components/common/Drawer/Drawer";
```

## Basic Usage

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Open Drawer</Button>

<Drawer open={open} onClose={() => setOpen(false)} title="My Drawer">
  <p>Drawer content goes here.</p>
</Drawer>
```

## Anchor (Direction)

Control which edge the drawer slides in from.

```tsx
<Drawer open={open} onClose={onClose} anchor="left" title="Left">
  ...
</Drawer>

<Drawer open={open} onClose={onClose} anchor="right" title="Right">
  ...
</Drawer>

<Drawer open={open} onClose={onClose} anchor="top" title="Top">
  ...
</Drawer>

<Drawer open={open} onClose={onClose} anchor="bottom" title="Bottom">
  ...
</Drawer>
```

## Sizes

For left/right anchors, `size` controls the width. For top/bottom, it controls the height.

```tsx
<Drawer open={open} onClose={onClose} size="sm" title="Small">...</Drawer>
<Drawer open={open} onClose={onClose} size="md" title="Medium">...</Drawer>
<Drawer open={open} onClose={onClose} size="lg" title="Large">...</Drawer>
<Drawer open={open} onClose={onClose} size="xl" title="Extra Large">...</Drawer>
<Drawer open={open} onClose={onClose} size="full" title="Full">...</Drawer>
```

## With Footer

```tsx
<Drawer
  open={open}
  onClose={onClose}
  title="Edit Profile"
  footer={
    <Flex gap={8}>
      <Button variant="text" onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={handleSave}>Save</Button>
    </Flex>
  }
>
  <TextField label="Name" />
  <TextField label="Email" />
</Drawer>
```

## Hide Close Button

```tsx
<Drawer open={open} onClose={onClose} title="No X button" hideCloseButton>
  <p>Close with backdrop click or Escape key.</p>
</Drawer>
```

## Disable Backdrop Click

```tsx
<Drawer open={open} onClose={onClose} closeOnBackdropClick={false} title="Persistent">
  <p>You must use the close button or Escape to dismiss.</p>
</Drawer>
```

## Disable Escape Key

```tsx
<Drawer open={open} onClose={onClose} closeOnEscape={false} title="No Escape">
  <p>Pressing Escape will not close this drawer.</p>
</Drawer>
```

## Exit Callback

```tsx
<Drawer open={open} onClose={onClose} onExited={() => console.log("Animation done")}>
  ...
</Drawer>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Whether the drawer is visible |
| `onClose` | `() => void` | — | Called when the drawer requests to close |
| `onExited` | `() => void` | — | Called after the close animation completes |
| `anchor` | `"left" \| "right" \| "top" \| "bottom"` | `"right"` | Edge the drawer slides in from |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"md"` | Width (left/right) or height (top/bottom) |
| `title` | `ReactNode` | — | Title displayed in the header |
| `hideCloseButton` | `boolean` | `false` | Hide the X close button in the header |
| `closeOnBackdropClick` | `boolean` | `true` | Close when clicking the backdrop |
| `closeOnEscape` | `boolean` | `true` | Close when pressing Escape |
| `footer` | `ReactNode` | — | Content rendered in a sticky footer area |
| `children` | `ReactNode` | — | Main body content (scrollable) |
