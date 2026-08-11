import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { timeAgo } from '../../domain/adminStore';
import type { AdminUser } from '../../domain/adminTypes';

const initials = (name: string): string =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const COLUMNS: DataColumn<AdminUser>[] = [
  { key: 'name', header: 'Admin', render: (r) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(r.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      </div>
    ) },
  { key: 'phone', header: 'Phone', className: 'hidden md:table-cell' },
  { key: 'roleId', header: 'Role', render: (r) => {
      const role = ROLE_LOOKUP[r.roleId];
      return <span>{role ?? r.roleId}</span>;
    } },
  { key: 'twoFactor', header: '2FA', render: (r) => <AdminStatusBadge status={r.twoFactor ? 'Verified' : 'Inactive'} /> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'lastLogin', header: 'Last Login', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{timeAgo(r.lastLogin)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Inactive'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', full: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'roleId', label: 'Role', type: 'select', options: Object.entries(ROLE_LOOKUP).map(([value, label]) => ({ value, label })) },
  { name: 'twoFactor', label: 'Enable 2FA', type: 'switch' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'].map((v) => ({ value: v, label: v })) },
];

const ROLE_LOOKUP: Record<string, string> = {
  'role-super': 'Super Admin',
  'role-ops': 'Operations Manager',
  'role-content': 'Content Editor',
  'role-finance': 'Finance Officer',
  'role-analyst': 'Analyst',
};

export function AdminUsersModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'adminUsers', label: 'Admin User', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const bulkActions: BulkAction<AdminUser>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Deactivate', variant: 'secondary', onClick: (items) => setStatus(items, 'Inactive') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected admin users?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Users"
        subtitle={`${rows.length} console members · ${rows.filter((r) => r.status === 'Active').length} active`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Invite Admin</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'email', 'phone']}
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="admin-users"
        onExport={(c) => logAdminExport('Admin User', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => {
          if (r.id !== 'admin-1') remove(r);
        }}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Admin User' : 'Invite Admin User'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Invite'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
