# DataTable

A feature-rich, fully typed data table component built on top of [TanStack Table v8](https://tanstack.com/table/latest). Supports sorting, pagination, row selection, global filtering, density options, and striped/hoverable styling — all with zero extra dependencies beyond `@tanstack/react-table`.

## Quick Start

```tsx
import DataTable from "@/components/common/DataTable/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

type User = { id: number; name: string; email: string };

const columns: ColumnDef<User, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

const data: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

<DataTable columns={columns} data={data} />;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, unknown>[]` | **required** | TanStack Table column definitions |
| `data` | `TData[]` | **required** | Row data array |
| `striped` | `boolean` | `false` | Alternate row background colors |
| `hoverable` | `boolean` | `true` | Highlight rows on hover |
| `density` | `"compact" \| "standard" \| "comfortable"` | `"standard"` | Cell padding density |
| `sortable` | `boolean` | `true` | Enable client-side column sorting |
| `sorting` | `SortingState` | — | Controlled sorting state |
| `onSortingChange` | `OnChangeFn<SortingState>` | — | Sorting change callback |
| `pagination` | `boolean` | `false` | Enable client-side pagination |
| `defaultPageSize` | `number` | `10` | Initial rows per page |
| `pageSizeOptions` | `number[]` | `[5, 10, 25, 50]` | Page size dropdown options |
| `paginationState` | `PaginationState` | — | Controlled pagination state |
| `onPaginationChange` | `OnChangeFn<PaginationState>` | — | Pagination change callback |
| `selectable` | `boolean` | `false` | Show row selection checkboxes |
| `rowSelection` | `RowSelectionState` | — | Controlled selection state |
| `onRowSelectionChange` | `OnChangeFn<RowSelectionState>` | — | Selection change callback |
| `filterable` | `boolean` | `false` | Show a global search input |
| `globalFilter` | `string` | — | Controlled global filter value |
| `onGlobalFilterChange` | `OnChangeFn<string>` | — | Filter change callback |
| `editable` | `boolean` | `false` | Enable inline cell editing (requires `meta.editable` on columns) |
| `onCellEdit` | `(info: CellEditInfo<TData>) => void` | — | Called when a cell edit is confirmed |
| `emptyMessage` | `ReactNode` | `"No data available"` | Message when the table has no rows |
| `getRowId` | `(row: TData, index: number) => string` | — | Custom row ID accessor |
| `tableOptions` | `Partial<TableOptions<TData>>` | — | Pass-through for advanced TanStack Table options |

All standard `HTMLDivElement` attributes (e.g., `className`, `style`, `id`) are also forwarded to the root wrapper.

## Examples

### Striped with Sorting

```tsx
<DataTable columns={columns} data={data} striped />
```

Sorting is enabled by default — click any column header to toggle.

### Pagination

```tsx
<DataTable
  columns={columns}
  data={data}
  pagination
  defaultPageSize={5}
  pageSizeOptions={[5, 10, 25]}
/>
```

### Row Selection

```tsx
const [selected, setSelected] = useState<RowSelectionState>({});

<DataTable
  columns={columns}
  data={data}
  selectable
  rowSelection={selected}
  onRowSelectionChange={setSelected}
  getRowId={(row) => String(row.id)}
/>;
```

### Global Filter

```tsx
<DataTable columns={columns} data={data} filterable />
```

### Inline Editing

Mark columns as editable via `meta.editable` and handle changes with `onCellEdit`:

```tsx
const columns: ColumnDef<User, unknown>[] = [
  { accessorKey: "name", header: "Name", meta: { editable: true } },
  { accessorKey: "email", header: "Email", meta: { editable: true } },
];

const [data, setData] = useState(initialData);

const handleCellEdit = (info: CellEditInfo<User>) => {
  setData((prev) =>
    prev.map((row, i) =>
      i === info.rowIndex ? { ...row, [info.columnId]: info.value } : row,
    ),
  );
};

<DataTable
  columns={columns}
  data={data}
  editable
  onCellEdit={handleCellEdit}
  getRowId={(row) => String(row.id)}
/>;
```

Click any editable cell to switch to an inline input. Press **Enter** or click away to confirm; press **Escape** to cancel. Non-editable columns (those without `meta.editable`) remain read-only.

### Full Featured

```tsx
<DataTable
  columns={columns}
  data={data}
  pagination
  defaultPageSize={10}
  selectable
  filterable
  striped
  density="compact"
  getRowId={(row) => String(row.id)}
/>
```

### Custom Cell Rendering

Use TanStack Table's `cell` option in column definitions:

```tsx
const columns: ColumnDef<User, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      return (
        <span style={{ color: status === "Active" ? "green" : "red" }}>
          {status}
        </span>
      );
    },
  },
];
```

### Controlled State

Every feature supports both uncontrolled (internal state) and controlled modes. Pass a state value and its `onChange` callback to take full control:

```tsx
const [sorting, setSorting] = useState<SortingState>([]);
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: 10,
});

<DataTable
  columns={columns}
  data={data}
  sorting={sorting}
  onSortingChange={setSorting}
  paginationState={pagination}
  onPaginationChange={setPagination}
  pagination
/>;
```

## Styling

The component uses plain CSS with CSS custom properties that automatically adapt to the app's light/dark theme. All classes are prefixed with `mui-datatable-`.

To customize appearance, override the CSS variables on `.mui-datatable`:

```css
.mui-datatable {
  --dt-border: #e2e8f0;
  --dt-head-bg: #f8fafc;
  --dt-radius: 12px;
}
```

## Dependencies

- `@tanstack/react-table` ^8.x
