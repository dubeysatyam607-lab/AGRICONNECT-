import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtINR, fmtNumber, shortDate } from '../../domain/adminStore';
import type { Product } from '../../domain/adminTypes';

const COLUMNS: DataColumn<Product>[] = [
  { key: 'name', header: 'Product', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.category} · {r.seller}</p>
      </div>
    ) },
  { key: 'price', header: 'Price', align: 'right', sortValue: (r) => r.price, render: (r) => <span className="font-medium">{fmtINR(r.price)}</span> },
  { key: 'stock', header: 'Stock', align: 'right', sortValue: (r) => r.stock, render: (r) => (
      <span className={r.stock === 0 ? 'font-medium text-red-600' : ''}>{fmtNumber(r.stock)} {r.unit}</span>
    ) },
  { key: 'rating', header: 'Rating', align: 'right', sortValue: (r) => r.rating, render: (r) => <span>{r.rating}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'added', header: 'Added', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.added)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Out of Stock', 'Draft', 'Hidden'].map((v) => ({ value: v, label: v })) },
  { key: 'category', label: 'Category', options: ['Fertilizer', 'Seed', 'Pesticide', 'Tool', 'Feed', 'Crop'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'name', label: 'Product Name', type: 'text', required: true, full: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Fertilizer', 'Seed', 'Pesticide', 'Tool', 'Feed', 'Crop'].map((v) => ({ value: v, label: v })) },
  { name: 'seller', label: 'Seller', type: 'text' },
  { name: 'price', label: 'Price (₹)', type: 'number' },
  { name: 'unit', label: 'Unit', type: 'text' },
  { name: 'stock', label: 'Stock', type: 'number' },
  { name: 'rating', label: 'Rating (0-5)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Out of Stock', 'Draft', 'Hidden'].map((v) => ({ value: v, label: v })) },
];

export function ProductsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'products', label: 'Product', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const bulkActions: BulkAction<Product>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Hide', variant: 'secondary', onClick: (items) => setStatus(items, 'Hidden') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected products?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketplace Products"
        subtitle={`${fmtNumber(rows.length)} products · ${fmtNumber(rows.filter((r) => r.stock === 0).length)} out of stock`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Product</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'seller', 'category']}
        searchPlaceholder="Search product or seller…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="marketplace-products"
        onExport={(c) => logAdminExport('Product', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Product' : 'Add Product'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Product'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
