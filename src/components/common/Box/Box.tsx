import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import "./Box.css";

export type BoxProps = HTMLAttributes<HTMLElement> & {
  /** The HTML element or component used for the root node. */
  component?: React.ElementType;

  /* ---- Spacing ---- */
  padding?: number | string;
  paddingX?: number | string;
  paddingY?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  marginX?: number | string;
  marginY?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;

  /* ---- Sizing ---- */
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;

  /* ---- Display & Position ---- */
  display?: CSSProperties["display"];
  overflow?: CSSProperties["overflow"];
  position?: CSSProperties["position"];
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  zIndex?: number;

  /* ---- Visual ---- */
  bgcolor?: string;
  color?: string;
  borderRadius?: number | string;
  border?: string;
  boxShadow?: string;
};

const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  {
    component: Component = "div",
    padding,
    paddingX,
    paddingY,
    paddingTop,
    paddingRight: paddingRightProp,
    paddingBottom,
    paddingLeft,
    margin,
    marginX,
    marginY,
    marginTop,
    marginRight: marginRightProp,
    marginBottom,
    marginLeft,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    display,
    overflow,
    position,
    top,
    right: rightProp,
    bottom,
    left: leftProp,
    zIndex,
    bgcolor,
    color,
    borderRadius,
    border,
    boxShadow,
    style,
    children,
    ...rest
  },
  ref,
) {
  const boxStyle: CSSProperties = {
    padding,
    paddingTop: paddingY ?? paddingTop,
    paddingRight: paddingX ?? paddingRightProp,
    paddingBottom: paddingY ?? paddingBottom,
    paddingLeft: paddingX ?? paddingLeft,
    margin,
    marginTop: marginY ?? marginTop,
    marginRight: marginX ?? marginRightProp,
    marginBottom: marginY ?? marginBottom,
    marginLeft: marginX ?? marginLeft,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    display,
    overflow,
    position,
    top,
    right: rightProp,
    bottom,
    left: leftProp,
    zIndex,
    backgroundColor: bgcolor,
    color,
    borderRadius,
    border,
    boxShadow,
    ...style,
  };

  const { className = "", ...htmlProps } = rest;

  return (
    <Component
      ref={ref}
      className={["mui-box", className].filter(Boolean).join(" ")}
      style={boxStyle}
      {...htmlProps}
    >
      {children}
    </Component>
  );
});

export default Box;
