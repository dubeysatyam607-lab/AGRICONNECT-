import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface DataColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: 'left' | 'right' | 'center';
  exportValue?: (row: T) => string | number;
  sortable?: boolean;
}

export interface DataFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface BulkAction<T> {
  label: string;
  onClick: (rows: T[]) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  confirm?: string;
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: DataFilter[];
  bulkActions?: BulkAction<T>[];
  exportName?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  initialSortKey?: string;
  initialSortDir?: 'asc' | 'desc';
  onExport?: (count: number) => void;
}

const toCellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const csvEscape = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  filters = [],
  bulkActions = [],
  exportName,
  onEdit,
  onDelete,
  onView,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting the search or filters.',
  pageSizeOptions = [5, 10, 25, 50],
  defaultPageSize = 10,
  initialSortKey,
  initialSortDir = 'asc',
  onExport,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key?: string; dir: 'asc' | 'desc' }>({
    key: initialSortKey,
    dir: initialSortDir,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<{ action: BulkAction<T>; rows: T[] } | null>(null);

  const hasSelection = bulkActions.length > 0;

  /* ── Filtering ─────────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let rows = data;
    const query = search.trim().toLowerCase();
    if (query && searchKeys.length) {
      rows = rows.filter((row) =>
        searchKeys.some((key) => toCellText(row[key]).toLowerCase().includes(query)),
      );
    }
    for (const f of filters) {
      const value = filterValues[f.key];
      if (value && value !== 'all') {
        rows = rows.filter((row) => toCellText(row[f.key]) === value);
      }
    }
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      const sorter = col?.sortValue ?? ((r: T) => r[sort.key as string]);
      rows = [...rows].sort((a, b) => {
        const av = sorter(a);
        const bv = sorter(b);
        if (typeof av === 'number' && typeof bv === 'number') {
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [data, search, searchKeys, filters, filterValues, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetSelection = () => setSelection(new Set());

  const toggleSelect = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = paged.map(rowKey);
    const allSelected = pageIds.every((id) => selection.has(id));
    setSelection((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  const exportCsv = () => {
    const header = columns.map((c) => c.header).join(',');
    const lines = filtered.map((row) =>
      columns
        .map((col) => {
          const raw = col.exportValue ? col.exportValue(row) : row[col.key];
          return csvEscape(toCellText(raw));
        })
        .join(','),
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName ?? 'admin-export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExport?.(filtered.length);
  };

  const hasActiveFilter = search.trim() !== '' || Object.values(filterValues).some((v) => v && v !== 'all');

  const clearAll = () => {
    setSearch('');
    setFilterValues({});
    setPage(1);
  };

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {searchKeys.length > 0 && (
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-8"
              />
            </div>
          )}
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] ?? 'all'}
              onValueChange={(v) => {
                setFilterValues((prev) => ({ ...prev, [f.key]: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label}</SelectItem>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={clearAll}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {exportName && (
            <Button variant="outline" size="sm" className="h-9" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          <span className="hidden text-sm text-muted-foreground sm:block">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && selection.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selection.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? 'default'}
                onClick={() => {
                  const rows = filtered.filter((r) => selection.has(rowKey(r)));
                  if (action.confirm) {
                    setConfirmBulk({ action, rows });
                  } else {
                    action.onClick(rows);
                    resetSelection();
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={resetSelection}>
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {hasSelection && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={paged.length > 0 && paged.every((r) => selection.has(rowKey(r)))}
                    onCheckedChange={toggleSelectPage}
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const sortable = col.sortable !== false && (col.sortValue || col.key in (data[0] ?? {}));
                return (
                  <TableHead
                    key={col.key}
                    className={cn(col.className, col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 uppercase text-xs font-semibold hover:text-foreground"
                      >
                        {col.header}
                        {sort.key === col.key ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {(onEdit || onDelete || onView) && <TableHead className="w-20 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasSelection ? 1 : 0) + ((onEdit || onDelete || onView) ? 1 : 0)} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-40" />
                    <p className="font-medium text-foreground">{emptyTitle}</p>
                    <p className="text-sm">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => {
                const id = rowKey(row);
                const selected = selection.has(id);
                return (
                  <TableRow key={id} className={cn(selected && 'bg-muted/50')}>
                    {hasSelection && (
                      <TableCell>
                        <Checkbox checked={selected} onCheckedChange={() => toggleSelect(id)} />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(col.className, col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
                      >
                        {col.render ? col.render(row) : toCellText(row[col.key])}
                      </TableCell>
                    ))}
                    {(onEdit || onDelete || onView) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onView && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-600"
                              onClick={() => setConfirmDelete(row)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(safePage - 1) * pageSize + 1}</span>–
            <span className="font-medium text-foreground">{Math.min(safePage * pageSize, filtered.length)}</span> of{' '}
            <span className="font-medium text-foreground">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmDelete) onDelete?.(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirm */}
      <AlertDialog open={confirmBulk !== null} onOpenChange={(o) => !o && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmBulk?.action.label}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBulk?.action.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmBulk?.action.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : undefined}
              onClick={() => {
                if (confirmBulk) {
                  confirmBulk.action.onClick(confirmBulk.rows);
                  resetSelection();
                }
                setConfirmBulk(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
