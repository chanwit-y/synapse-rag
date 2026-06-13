import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";

type FlexDirection = CSSProperties["flexDirection"];
type FlexWrap = CSSProperties["flexWrap"];
type JustifyContent = CSSProperties["justifyContent"];
type AlignItems = CSSProperties["alignItems"];
type AlignContent = CSSProperties["alignContent"];
type AlignSelf = CSSProperties["alignSelf"];

export type FlexProps = HTMLAttributes<HTMLDivElement> & {
  inline?: boolean;
  direction?: FlexDirection;
  wrap?: FlexWrap;
  justify?: JustifyContent;
  align?: AlignItems;
  alignContent?: AlignContent;
  alignSelf?: AlignSelf;
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  grow?: CSSProperties["flexGrow"];
  shrink?: CSSProperties["flexShrink"];
  basis?: CSSProperties["flexBasis"];
  flex?: CSSProperties["flex"];
  /** Shorthand: sets `flexDirection` to "column" */
  column?: boolean;
};

const Flex = forwardRef<HTMLDivElement, FlexProps>(function Flex(
  {
    inline,
    direction,
    wrap,
    justify,
    align,
    alignContent: alignContentProp,
    alignSelf: alignSelfProp,
    gap,
    rowGap,
    columnGap,
    grow,
    shrink,
    basis,
    flex: flexProp,
    column,
    style,
    children,
    ...rest
  },
  ref,
) {
  const flexStyle: CSSProperties = {
    display: inline ? "inline-flex" : "flex",
    flexDirection: column ? "column" : direction,
    flexWrap: wrap,
    justifyContent: justify,
    alignItems: align,
    alignContent: alignContentProp,
    alignSelf: alignSelfProp,
    gap,
    rowGap,
    columnGap,
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: basis,
    flex: flexProp,
    ...style,
  };

  return (
    <div ref={ref} style={flexStyle} {...rest}>
      {children}
    </div>
  );
});

export default Flex;
