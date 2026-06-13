import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";

export type GridProps = HTMLAttributes<HTMLDivElement> & {
  inline?: boolean;
  columns?: CSSProperties["gridTemplateColumns"];
  rows?: CSSProperties["gridTemplateRows"];
  areas?: CSSProperties["gridTemplateAreas"];
  autoColumns?: CSSProperties["gridAutoColumns"];
  autoRows?: CSSProperties["gridAutoRows"];
  autoFlow?: CSSProperties["gridAutoFlow"];
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  justify?: CSSProperties["justifyItems"];
  align?: CSSProperties["alignItems"];
  justifyContent?: CSSProperties["justifyContent"];
  alignContent?: CSSProperties["alignContent"];
  placeItems?: CSSProperties["placeItems"];
  placeContent?: CSSProperties["placeContent"];
};

const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  {
    inline,
    columns,
    rows,
    areas,
    autoColumns,
    autoRows,
    autoFlow,
    gap,
    rowGap,
    columnGap,
    justify,
    align,
    justifyContent: justifyContentProp,
    alignContent: alignContentProp,
    placeItems: placeItemsProp,
    placeContent: placeContentProp,
    style,
    children,
    ...rest
  },
  ref,
) {
  const gridStyle: CSSProperties = {
    display: inline ? "inline-grid" : "grid",
    gridTemplateColumns: columns,
    gridTemplateRows: rows,
    gridTemplateAreas: areas,
    gridAutoColumns: autoColumns,
    gridAutoRows: autoRows,
    gridAutoFlow: autoFlow,
    gap,
    rowGap,
    columnGap,
    justifyItems: justify,
    alignItems: align,
    justifyContent: justifyContentProp,
    alignContent: alignContentProp,
    placeItems: placeItemsProp,
    placeContent: placeContentProp,
    ...style,
  };

  return (
    <div ref={ref} style={gridStyle} {...rest}>
      {children}
    </div>
  );
});

export default Grid;
