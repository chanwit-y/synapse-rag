"use client";

import {
  forwardRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
  type OnChangeFn,
  type TableOptions,
} from "@tanstack/react-table";
import "./DataTable.css";

/* ── Types ───────────────────────────────────────────── */

type Density = "compact" | "standard" | "comfortable";

export type CellEditInfo<TData> = {
  /** The row ID */
  rowId: string;
  /** Row index in the data array */
  rowIndex: number;
  /** Column accessor key */
  columnId: string;
  /** The new string value entered by the user */
  value: string;
  /** The full row data object */
  row: TData;
};

export type DataTableProps<TData> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  /** Column definitions – passed directly to TanStack Table */
  columns: ColumnDef<TData, unknown>[];
  /** Row data array */
  data: TData[];

  /** Show striped rows */
  striped?: boolean;
  /** Highlight rows on hover */
  hoverable?: boolean;
  /** Row density */
  density?: Density;

  /** Enable client-side sorting (default true) */
  sortable?: boolean;
  /** Controlled sorting state */
  sorting?: SortingState;
  /** Callback when sorting changes */
  onSortingChange?: OnChangeFn<SortingState>;

  /** Enable client-side pagination (default false) */
  pagination?: boolean;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Controlled pagination state */
  paginationState?: PaginationState;
  /** Callback when pagination changes */
  onPaginationChange?: OnChangeFn<PaginationState>;

  /** Enable row selection checkboxes */
  selectable?: boolean;
  /** Controlled selection state */
  rowSelection?: RowSelectionState;
  /** Callback when selection changes */
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  /** Enable global text filter */
  filterable?: boolean;
  /** Controlled global filter value */
  globalFilter?: string;
  /** Callback when global filter changes */
  onGlobalFilterChange?: OnChangeFn<string>;

  /** Enable inline cell editing (requires meta.editable on columns) */
  editable?: boolean;
  /** Called when a cell edit is confirmed */
  onCellEdit?: (info: CellEditInfo<TData>) => void;

  /** Message displayed when data is empty */
  emptyMessage?: ReactNode;

  /** Extra TanStack Table options for advanced use cases */
  tableOptions?: Partial<TableOptions<TData>>;

  /** Unique row id accessor (defaults to row index) */
  getRowId?: (row: TData, index: number) => string;
};

/* ── Helpers ─────────────────────────────────────────── */

const DENSITY_CLASS: Record<Density, string> = {
  compact: "mui-datatable-dense",
  standard: "",
  comfortable: "mui-datatable-comfortable",
};

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  if (!direction) return <span className="mui-datatable-sort-icon">↕</span>;
  return (
    <span className="mui-datatable-sort-icon">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

/* ── Editable cell ───────────────────────────────────── */

function EditableCell({
  initialValue,
  onConfirm,
  onCancel,
}: {
  initialValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = useCallback(() => {
    onConfirm(draft);
  }, [draft, onConfirm]);

  const cancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <input
      ref={inputRef}
      className="mui-datatable-edit-input"
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirm();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={confirm}
    />
  );
}

/* ── Component ───────────────────────────────────────── */

function DataTableInner<TData>(
  {
    columns: columnsProp,
    data,
    striped = false,
    hoverable = true,
    density = "standard",
    sortable = true,
    sorting: sortingProp,
    onSortingChange: onSortingChangeProp,
    pagination = false,
    pageSizeOptions = [5, 10, 25, 50],
    defaultPageSize = 10,
    paginationState: paginationProp,
    onPaginationChange: onPaginationChangeProp,
    selectable = false,
    rowSelection: rowSelectionProp,
    onRowSelectionChange: onRowSelectionChangeProp,
    filterable = false,
    globalFilter: globalFilterProp,
    onGlobalFilterChange: onGlobalFilterChangeProp,
    editable = false,
    onCellEdit,
    emptyMessage = "No data available",
    tableOptions,
    getRowId,
    className = "",
    ...rest
  }: DataTableProps<TData>,
  ref: React.Ref<HTMLDivElement>,
) {
  /* Internal state for uncontrolled usage */
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    { pageIndex: 0, pageSize: defaultPageSize },
  );
  const [internalSelection, setInternalSelection] =
    useState<RowSelectionState>({});
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");

  const sorting = sortingProp ?? internalSorting;
  const onSortingChange = onSortingChangeProp ?? setInternalSorting;
  const paginationState = paginationProp ?? internalPagination;
  const onPaginationChange = onPaginationChangeProp ?? setInternalPagination;
  const rowSelection = rowSelectionProp ?? internalSelection;
  const onRowSelectionChange =
    onRowSelectionChangeProp ?? setInternalSelection;
  const globalFilter = globalFilterProp ?? internalGlobalFilter;
  const onGlobalFilterChange =
    onGlobalFilterChangeProp ?? setInternalGlobalFilter;

  /* Editing cell state: { rowId, columnId } or null */
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  /* Prepend selection column */
  const columns = useMemo(() => {
    if (!selectable) return columnsProp;
    const selectCol: ColumnDef<TData, unknown> = {
      id: "__select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      meta: { selectColumn: true },
    };
    return [selectCol, ...columnsProp];
  }, [selectable, columnsProp]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(pagination ? { pagination: paginationState } : {}),
      rowSelection,
      globalFilter,
    },
    onSortingChange,
    onPaginationChange,
    onRowSelectionChange,
    onGlobalFilterChange,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    ...(sortable ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(pagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    ...(filterable ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    enableRowSelection: selectable,
    ...tableOptions,
  });

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      table.setPageSize(Number(e.target.value));
    },
    [table],
  );

  const rootCls = [
    "mui-datatable",
    DENSITY_CLASS[density],
    striped ? "mui-datatable-striped" : "",
    hoverable ? "mui-datatable-hoverable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={rootCls} {...rest}>
      {/* Global filter */}
      {filterable && (
        <div style={{ padding: "8px var(--dt-density-x, 16px)" }}>
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            placeholder="Search…"
            className="mui-datatable-page-btn"
            style={{ width: "100%", textAlign: "left", maxWidth: 320 }}
          />
        </div>
      )}

      <div className="mui-datatable-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const isSelectCol =
                    (header.column.columnDef.meta as { selectColumn?: boolean })
                      ?.selectColumn === true;
                  const canSort =
                    sortable && header.column.getCanSort() && !isSelectCol;

                  return (
                    <th
                      key={header.id}
                      className={[
                        canSort ? "mui-datatable-sortable" : "",
                        header.column.getIsSorted()
                          ? "mui-datatable-sort-active"
                          : "",
                        isSelectCol ? "mui-datatable-select-col" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      style={{
                        width: isSelectCol ? 48 : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {canSort && (
                        <SortIndicator
                          direction={header.column.getIsSorted()}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="mui-datatable-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as {
                      selectColumn?: boolean;
                      editable?: boolean;
                    } | undefined;
                    const isSelectCol = meta?.selectColumn === true;
                    const isCellEditable =
                      editable && meta?.editable === true;
                    const isEditing =
                      isCellEditable &&
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === cell.column.id;

                    return (
                      <td
                        key={cell.id}
                        className={[
                          isSelectCol ? "mui-datatable-select-col" : "",
                          isCellEditable ? "mui-datatable-cell-editable" : "",
                          isEditing ? "mui-datatable-cell-editing" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined}
                        onClick={
                          isCellEditable && !isEditing
                            ? () =>
                                setEditingCell({
                                  rowId: row.id,
                                  columnId: cell.column.id,
                                })
                            : undefined
                        }
                      >
                        {isEditing ? (
                          <EditableCell
                            initialValue={String(
                              cell.getValue() ?? "",
                            )}
                            onConfirm={(value) => {
                              setEditingCell(null);
                              onCellEdit?.({
                                rowId: row.id,
                                rowIndex: row.index,
                                columnId: cell.column.id,
                                value,
                                row: row.original,
                              });
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                            {isCellEditable && (
                              <svg
                                className="mui-datatable-edit-icon"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {pagination && (
        <div className="mui-datatable-footer">
          <div className="mui-datatable-footer-info">
            <div className="mui-datatable-page-size">
              <span>Rows per page:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={handlePageSizeChange}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <span>
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              –
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of {table.getFilteredRowModel().rows.length}
            </span>
          </div>

          <div className="mui-datatable-footer-nav">
            <button
              type="button"
              className="mui-datatable-page-btn"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              «
            </button>
            <button
              type="button"
              className="mui-datatable-page-btn"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </button>
            {Array.from({ length: table.getPageCount() }, (_, i) => i)
              .filter((i) => {
                const current = table.getState().pagination.pageIndex;
                return Math.abs(i - current) <= 2;
              })
              .map((i) => (
                <button
                  key={i}
                  type="button"
                  className={[
                    "mui-datatable-page-btn",
                    i === table.getState().pagination.pageIndex
                      ? "mui-datatable-page-btn-active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => table.setPageIndex(i)}
                >
                  {i + 1}
                </button>
              ))}
            <button
              type="button"
              className="mui-datatable-page-btn"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ›
            </button>
            <button
              type="button"
              className="mui-datatable-page-btn"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DataTable = forwardRef(DataTableInner) as <TData>(
  props: DataTableProps<TData> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;

export default DataTable;
