import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import "./Typography.css";

type Variant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption"
  | "overline";

type Color = "foreground" | "muted" | "accent" | "inherit" | "error" | "success";

type Align = "left" | "center" | "right" | "justify";

export type TypographyProps = HTMLAttributes<HTMLElement> & {
  variant?: Variant;
  component?: ElementType;
  color?: Color;
  align?: Align;
  gutterBottom?: boolean;
  noWrap?: boolean;
};

const VARIANT_CLASS: Record<Variant, string> = {
  h1: "mui-typography-h1",
  h2: "mui-typography-h2",
  h3: "mui-typography-h3",
  h4: "mui-typography-h4",
  h5: "mui-typography-h5",
  h6: "mui-typography-h6",
  subtitle1: "mui-typography-subtitle1",
  subtitle2: "mui-typography-subtitle2",
  body1: "mui-typography-body1",
  body2: "mui-typography-body2",
  caption: "mui-typography-caption",
  overline: "mui-typography-overline",
};

const DEFAULT_ELEMENT: Record<Variant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "h6",
  subtitle2: "h6",
  body1: "p",
  body2: "p",
  caption: "span",
  overline: "span",
};

const Typography = forwardRef<HTMLElement, TypographyProps>(function Typography(
  {
    variant = "body1",
    component,
    color,
    align,
    gutterBottom = false,
    noWrap = false,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const Tag = component ?? DEFAULT_ELEMENT[variant];

  return (
    <Tag
      ref={ref}
      className={[
        "mui-typography",
        VARIANT_CLASS[variant],
        color ? `mui-typography-color-${color}` : "",
        align ? `mui-typography-align-${align}` : "",
        gutterBottom ? "mui-typography-gutter-bottom" : "",
        noWrap ? "mui-typography-no-wrap" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Typography;
