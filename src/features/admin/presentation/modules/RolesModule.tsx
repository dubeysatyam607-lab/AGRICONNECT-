import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn } from '../components/DataTable';
import { useAdminCrud } from '../hooks/useAdminCrud';
import { fmtNumber } from '../../domain/adminStore';
import type { AdminRole } from '../../domain/adminTypes';

const PERMISSION_GROUPS: { group: string; perms: { key: string; label: string }[] }[] = [
  { group: 'Users', perms: [{ key: 'farmers.read', label: 'View farmers' }, { key: 'farmers.write', label: 'Manage farmers' }, { key: 'verification.read', label: 'View verification' }, { key: 'verification.write', label: 'Approve/reject verification' }] },
  { group: 'Commerce', perms: [{ key: 'orders.read', label: 'View orders' }, { key: 'orders.write', label: 'Manage orders' }, { key: 'rentals.read', label: 'View rentals' }, { key: 'rentals.write', label: 'Manage rentals' }] },
  { group: 'Content', perms: [{ key: 'news.read', label: 'View news' }, { key: 'news.write', label: 'Edit news' }, { key: 'knowledge.read', label: 'View knowledge' }, { key: 'knowledge.write', label: 'Edit knowledge' }, { key: 'faq.read', label: 'View FAQs' }, { key: 'faq.write', label: 'Edit FAQs' }, { key: 'schemes.read', label: 'View schemes' }, { key: 'schemes.write', label: 'Edit schemes' }] },
  { group: 'Push', perms: [{ key: 'push.read', label: 'View campaigns' }, { key: 'push.write', label: 'Send campaigns' }] },
  { group: 'Finance', perms: [{ key: 'payments.read', label: 'View payments' }, { key: 'payments.write', label: 'Manage payments' }, { key: 'subscriptions.read', label: 'View subscriptions' }, { key: 'subscriptions.write', label: 'Manage subscriptions' }, { key: 'ads.read', label: 'View ads' }, { key: 'ads.write', label: 'Manage ads' }] },
  { group: 'Support', perms: [{ key: 'support.read', label: 'View tickets' }, { key: 'support.write', label: 'Manage tickets' }, { key: 'reports.read', label: 'View reports' }] },
  { group: 'Platform', perms: [{ key: 'analytics.read', label: 'View analytics' }, { key: 'crash.read', label: 'View crashes' }, { key: 'weather.read', label: 'View weather' }, { key: 'mandi.read', label: 'View mandi' }, { key: 'audit.read', label: 'View audit logs' }] },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

const COLUMNS: DataColumn<AdminRole>[] = [
  { key: 'name', header: 'Role', render: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{r.name}</span>
        {r.protected && <Badge variant="secondary" className="text-[10px]">{t('adm27')}</Badge>}
      </div>
    ) },
  { key: 'description', header: 'Description', className: 'hidden lg:table-cell' },
  { key: 'permissions', header: 'Permissions', render: (r) => (
      <div className="flex max-w-sm flex-wrap gap-1">
        {r.permissions.includes('*')
          ? <Badge variant="secondary" className="text-[10px]">{t('adm28')}</Badge>
          : r.permissions.slice(0, 3).map((p) => <Badge key={p} variant="outline" className="text-[10px] font-mono">{p}</Badge>)
        }
        {r.permissions.length > 3 && !r.permissions.includes('*') && <Badge variant="outline" className="text-[10px]">+{r.permissions.length - 3}</Badge>}
      </div>
    ) },
  { key: 'memberCount', header: 'Members', align: 'right', sortValue: (r) => r.memberCount, render: (r) => <span>{fmtNumber(r.memberCount)}</span> },
];

export function RolesModule() {
  const { t } = useLanguage();
  const { rows, create, update, remove } = useAdminCrud({ key: 'adminRoles', label: 'Admin Role', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [form, setForm] = useState({ name: '', description: '', memberCount: 0, permissions: [] as string[] });

  const openDialog = (role: AdminRole | null) => {
    setEditing(role);
    setForm(role
      ? { name: role.name, description: role.description, memberCount: role.memberCount, permissions: [...role.permissions] }
      : { name: '', description: '', memberCount: 0, permissions: [] });
    setOpen(true);
  };

  const togglePerm = (key: string) => {
    setForm((f) => {
      const has = f.permissions.includes(key);
      return { ...f, permissions: has ? f.permissions.filter((p) => p !== key) : [...f.permissions, key] };
    });
  };

  const save = () => {
    const payload = { ...form, permissions: form.permissions.includes('*') ? ['*'] : form.permissions };
    if (editing) {
      if (editing.protected) return;
      update(editing, payload);
    } else {
      create(payload);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permissions (RBAC)"
        subtitle={`${rows.length} roles · ${rows.reduce((s, r) => s + r.memberCount, 0)} admin members`}
        actions={<Button onClick={() => openDialog(null)}><Plus className="h-4 w-4" /> New Role</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'description']}
        exportName="admin-roles"
        onEdit={(r) => openDialog(r)}
        onDelete={(r) => {
          if (!r.protected) remove(r);
        }}
      />

      {/* Custom role dialog with permission matrix */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">{editing ? `Edit Role — ${editing.name}` : 'New Role'}</h3>
            {editing?.protected && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                <ShieldAlert className="h-3.5 w-3.5" /> Protected role — name cannot be changed.
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">{t('adm29')}</Label>
                <Input className="mt-1.5" value={form.name} disabled={editing?.protected} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">{t('adm30')}</Label>
                <Input className="mt-1.5" type="number" value={form.memberCount} onChange={(e) => setForm((f) => ({ ...f, memberCount: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">{t('adm31')}</Label>
                <Input className="mt-1.5" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.group}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {group.perms.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs cursor-pointer hover:bg-muted/50">
                        <Checkbox checked={form.permissions.includes(perm.key) || form.permissions.includes('*')} onCheckedChange={() => togglePerm(perm.key)} />
                        <span className="text-foreground">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {form.permissions.includes('*') && (
                <p className="text-xs text-muted-foreground">{t('adm32')}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {ALL_PERMS.map((p) => (
                  <Badge key={p} variant={form.permissions.includes(p) ? 'default' : 'outline'} className="cursor-pointer text-[10px] font-mono" onClick={() => togglePerm(p)}>
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('adm33')}</Button>
              <Button onClick={save} disabled={form.name.trim() === ''}>
                {editing ? 'Save Changes' : 'Create Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
