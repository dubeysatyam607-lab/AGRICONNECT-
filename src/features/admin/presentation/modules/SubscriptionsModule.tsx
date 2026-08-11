import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtINR, fmtNumber, shortDate } from '../../domain/adminStore';
import type { SubscriptionPlan, UserSubscription } from '../../domain/adminTypes';

const PLAN_COLUMNS: DataColumn<SubscriptionPlan>[] = [
  { key: 'name', header: 'Plan', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.period}</p>
      </div>
    ) },
  { key: 'price', header: 'Price', align: 'right', sortValue: (r) => r.price, render: (r) => <span className="font-medium">{r.price === 0 ? 'Free' : fmtINR(r.price)}</span> },
  { key: 'subscribers', header: 'Subscribers', align: 'right', sortValue: (r) => r.subscribers, render: (r) => <span>{fmtNumber(r.subscribers)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const SUB_COLUMNS: DataColumn<UserSubscription>[] = [
  { key: 'user', header: 'User', render: (r) => <span className="font-medium text-foreground">{r.user}</span> },
  { key: 'plan', header: 'Plan' },
  { key: 'start', header: 'Start', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.start)}</span> },
  { key: 'renew', header: 'Renews', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.renew)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const PLAN_FIELDS: FormField[] = [
  { name: 'name', label: 'Plan Name', type: 'text', required: true },
  { name: 'price', label: 'Price (₹/month)', type: 'number' },
  { name: 'period', label: 'Period', type: 'select', options: ['Monthly', 'Yearly', 'Forever'].map((v) => ({ value: v, label: v })) },
  { name: 'subscribers', label: 'Subscribers', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Archived', 'Draft'].map((v) => ({ value: v, label: v })) },
  { name: 'features', label: 'Features', type: 'textarea', full: true },
];

const SUB_FIELDS: FormField[] = [
  { name: 'user', label: 'User', type: 'text', required: true },
  { name: 'plan', label: 'Plan', type: 'text' },
  { name: 'start', label: 'Start Date', type: 'date' },
  { name: 'renew', label: 'Renew Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Cancelled', 'Trial'].map((v) => ({ value: v, label: v })) },
];

export function SubscriptionsModule() {
  const plans = useAdminCrud({ key: 'subscriptionPlans', label: 'Subscription Plan', idKey: 'id' });
  const subs = useAdminCrud({ key: 'userSubscriptions', label: 'Subscription', idKey: 'id' });
  const [tab, setTab] = useState('plans');
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingSub, setEditingSub] = useState<UserSubscription | null>(null);

  const planBulk: BulkAction<SubscriptionPlan>[] = [
    { label: 'Activate', onClick: (items) => plans.setStatus(items, 'Active') },
    { label: 'Archive', variant: 'secondary', onClick: (items) => plans.setStatus(items, 'Archived') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected plans?', onClick: plans.removeMany },
  ];

  const subBulk: BulkAction<UserSubscription>[] = [
    { label: 'Activate', onClick: (items) => subs.setStatus(items, 'Active') },
    { label: 'Cancel', variant: 'secondary', onClick: (items) => subs.setStatus(items, 'Cancelled') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected subscriptions?', onClick: subs.removeMany },
  ];

  const activeSubs = subs.rows.filter((r) => r.status === 'Active').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscription Plans"
        subtitle={`${plans.rows.filter((r) => r.status === 'Active').length} active plans · ${fmtNumber(activeSubs)} active subscribers`}
        actions={
          <Button
            onClick={() => {
              setEditingPlan(null);
              setEditingSub(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add {tab === 'plans' ? 'Plan' : 'Subscription'}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <DataTable
            data={plans.rows}
            columns={PLAN_COLUMNS}
            rowKey={(r) => r.id}
            searchKeys={['name', 'features', 'period']}
            filters={[{ key: 'status', label: 'Status', options: ['Active', 'Archived', 'Draft'].map((v) => ({ value: v, label: v })) }] as DataFilter[]}
            bulkActions={planBulk}
            exportName="subscription-plans"
            onExport={(c) => logAdminExport('Subscription Plan', c)}
            onEdit={(r) => { setEditingPlan(r); setOpen(true); }}
            onDelete={plans.remove}
          />
        </TabsContent>
        <TabsContent value="subscribers" className="mt-4">
          <DataTable
            data={subs.rows}
            columns={SUB_COLUMNS}
            rowKey={(r) => r.id}
            searchKeys={['user', 'plan']}
            filters={[{ key: 'status', label: 'Status', options: ['Active', 'Expired', 'Cancelled', 'Trial'].map((v) => ({ value: v, label: v })) }] as DataFilter[]}
            bulkActions={subBulk}
            exportName="user-subscriptions"
            onExport={(c) => logAdminExport('Subscription', c)}
            onEdit={(r) => { setEditingSub(r); setOpen(true); }}
            onDelete={subs.remove}
          />
        </TabsContent>
      </Tabs>

      {tab === 'plans' ? (
        <EntityDialog
          open={open}
          onOpenChange={setOpen}
          title={editingPlan ? 'Edit Plan' : 'Add Plan'}
          fields={PLAN_FIELDS}
          initial={editingPlan ?? undefined}
          submitLabel={editingPlan ? 'Save Changes' : 'Add Plan'}
          onSubmit={(v) => (editingPlan ? plans.update(editingPlan, v) : plans.create(v))}
        />
      ) : (
        <EntityDialog
          open={open}
          onOpenChange={setOpen}
          title={editingSub ? 'Edit Subscription' : 'Add Subscription'}
          fields={SUB_FIELDS}
          initial={editingSub ?? undefined}
          submitLabel={editingSub ? 'Save Changes' : 'Add Subscription'}
          onSubmit={(v) => (editingSub ? subs.update(editingSub, v) : subs.create(v))}
        />
      )}
    </div>
  );
}
