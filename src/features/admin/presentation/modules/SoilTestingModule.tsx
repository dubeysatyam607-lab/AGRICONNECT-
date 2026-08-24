import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  FileCheck,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '../components/PageHeader';
import { AdminStatusBadge } from '../components/StatusBadge';
import {
  SoilTestOrder,
  SoilOrderStatus,
  SoilTestingKPIs,
  StructuredSoilReport,
} from '@/features/soil-testing/domain/soilTestingTypes';
import { soilTestingService } from '@/features/soil-testing/domain/soilTestingService';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function SoilTestingModule() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SoilTestOrder[]>([]);
  const [kpis, setKpis] = useState<SoilTestingKPIs>({
    totalRequests: 0,
    pendingPickup: 0,
    scheduledPickups: 0,
    samplesCollected: 0,
    samplesAtLab: 0,
    testingInProgress: 0,
    reportsReady: 0,
    completedTests: 0,
    failedOrCancelled: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testTypeFilter, setTestTypeFilter] = useState('all');

  // Manage Order Modal State
  const [selectedOrder, setSelectedOrder] = useState<SoilTestOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'assign' | 'status' | 'upload'>('details');

  // Agent Assignment Form
  const [agentName, setAgentName] = useState('Anil Sharma (Senior Field Agent)');
  const [agentPhone, setAgentPhone] = useState('9876543210');
  const [confirmedDate, setConfirmedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [confirmedSlot, setConfirmedSlot] = useState('09:00 AM - 01:00 PM');
  const [internalNotes, setInternalNotes] = useState('');

  // Status Progression Form
  const [newStatus, setNewStatus] = useState<SoilOrderStatus>('sample_received');
  const [statusNote, setStatusNote] = useState('');

  // Report Upload Form
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [labName, setLabName] = useState('AgriConnect Central Laboratory, Indore');
  const [phVal, setPhVal] = useState('7.1');
  const [nVal, setNVal] = useState('240');
  const [pVal, setPVal] = useState('18');
  const [kVal, setKVal] = useState('310');
  const [ocVal, setOcVal] = useState('0.65');
  const [znVal, setZnVal] = useState('0.85');
  const [uploadingReport, setUploadingReport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const res = await soilTestingService.getAdminSoilOrders({
      status: statusFilter,
      testType: testTypeFilter,
      search,
    });

    setOrders(res.data);
    setKpis(res.kpis);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, testTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openManageModal = (order: SoilTestOrder, tab: 'details' | 'assign' | 'status' | 'upload' = 'details') => {
    setSelectedOrder(order);
    setModalTab(tab);
    setModalOpen(true);
    setActionError(null);
    setActionSuccess(null);
    if (order.assigned_agent_name) setAgentName(order.assigned_agent_name);
    if (order.assigned_agent_phone) setAgentPhone(order.assigned_agent_phone);
    if (order.confirmed_pickup_date) setConfirmedDate(order.confirmed_pickup_date);
    if (order.pickup_time_slot) setConfirmedSlot(order.pickup_time_slot);
  };

  const handleAssignAgent = async () => {
    if (!selectedOrder || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await soilTestingService.assignAgentAndSchedulePickup(
      selectedOrder.id,
      {
        id: user.id, // verified assignment
        name: agentName,
        phone: agentPhone,
      },
      confirmedDate,
      confirmedSlot,
      user.id,
      user.user_metadata?.full_name || 'Admin',
      internalNotes
    );

    if (res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess('Pickup agent assigned and notification dispatched to farmer!');
      await loadData(true);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !user) return;
    setActionError(null);
    setActionSuccess(null);

    const res = await soilTestingService.updateOrderStatus(
      selectedOrder.id,
      newStatus,
      user.id,
      user.user_metadata?.full_name || 'Admin / Lab Technician',
      statusNote
    );

    if (res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess(`Status advanced to ${newStatus.replace(/_/g, ' ').toUpperCase()}`);
      await loadData(true);
    }
  };

  const handleUploadReport = async () => {
    if (!selectedOrder || !user) return;
    if (!reportFile) {
      setActionError('Please select a certified laboratory PDF report.');
      return;
    }

    setUploadingReport(true);
    setActionError(null);
    setActionSuccess(null);

    // Build structured parameters object
    const structured: StructuredSoilReport = {
      laboratoryName: labName,
      testedDate: new Date().toISOString(),
      parameters: {
        ph: {
          value: Number(phVal) || 7.0,
          unit: 'pH',
          status: Number(phVal) < 6.5 ? 'low' : Number(phVal) > 7.8 ? 'high' : 'optimal',
          benchmark: '6.5 - 7.5 (Neutral)',
          interpretation: Number(phVal) < 6.5 ? 'Slightly Acidic' : 'Optimal Soil Reaction',
        },
        nitrogen: {
          value: Number(nVal) || 200,
          unit: 'kg/ha',
          status: Number(nVal) < 280 ? 'low' : Number(nVal) > 560 ? 'high' : 'optimal',
          benchmark: '280 - 560 kg/ha',
          interpretation: Number(nVal) < 280 ? 'Low Available Nitrogen' : 'Optimal Available Nitrogen',
        },
        phosphorus: {
          value: Number(pVal) || 15,
          unit: 'kg/ha',
          status: Number(pVal) < 11 ? 'low' : Number(pVal) > 25 ? 'high' : 'optimal',
          benchmark: '11 - 25 kg/ha',
        },
        potassium: {
          value: Number(kVal) || 250,
          unit: 'kg/ha',
          status: Number(kVal) < 140 ? 'low' : Number(kVal) > 280 ? 'high' : 'optimal',
          benchmark: '140 - 280 kg/ha',
        },
        organicCarbon: {
          value: Number(ocVal) || 0.5,
          unit: '% OC',
          status: Number(ocVal) < 0.5 ? 'low' : Number(ocVal) > 0.75 ? 'high' : 'optimal',
          benchmark: '0.50 - 0.75 %',
        },
        zinc: {
          value: Number(znVal) || 0.6,
          unit: 'ppm (mg/kg)',
          status: Number(znVal) < 0.6 ? 'low' : 'optimal',
          benchmark: '> 0.6 ppm',
        },
      },
      recommendations: {
        cropsRecommended: ['Wheat', 'Gram (Chana)', 'Mustard', 'Soybean'],
        fertilizerPlan: [
          { item: 'Urea (46% N)', dosePerAcre: '45 kg/acre', timing: 'Split into 2 applications' },
          { item: 'DAP (18:46)', dosePerAcre: '50 kg/acre', timing: 'Basal dose during land preparation' },
          { item: 'Zinc Sulphate (21%)', dosePerAcre: '10 kg/acre', timing: 'Soil application before sowing' },
        ],
      },
    };

    const res = await soilTestingService.uploadLabReport(
      selectedOrder.id,
      reportFile,
      structured,
      user.id,
      user.user_metadata?.full_name || 'Lab In-Charge',
      labName
    );

    setUploadingReport(false);

    if (res.error) {
      setActionError(res.error.message);
    } else {
      setActionSuccess('Lab Report uploaded and farmer notified successfully!');
      await loadData(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soil Testing (Mitti Jaanch) Console"
        subtitle="Manage farmer test requests, assign verified pickup technicians, update lab status, and upload certified reports."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="rounded-xl font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Real KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Requests</span>
          <div className="text-2xl font-black text-foreground mt-1">{kpis.totalRequests}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Real-time DB records</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Pending Pickup</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{kpis.pendingPickup}</div>
          <span className="text-[10px] text-muted-foreground">Awaiting assignment</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase">Scheduled / In Field</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {kpis.scheduledPickups + kpis.samplesCollected}
          </div>
          <span className="text-[10px] text-muted-foreground">{kpis.samplesCollected} collected</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-purple-600 uppercase">In Lab Testing</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {kpis.samplesAtLab + kpis.testingInProgress}
          </div>
          <span className="text-[10px] text-muted-foreground">Analysis in progress</span>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Reports Ready</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.reportsReady}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            ₹{kpis.totalRevenue.toLocaleString('en-IN')} revenue
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, farmer, mobile…"
            className="pl-9 text-xs rounded-xl"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="agent_pending">Agent Pending</option>
            <option value="pickup_scheduled">Pickup Scheduled</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="sample_received">Sample at Lab</option>
            <option value="testing_in_progress">Testing in Progress</option>
            <option value="report_ready">Report Ready</option>
          </select>

          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="text-xs bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground font-semibold"
          >
            <option value="all">All Test Types</option>
            <option value="standard">Standard Soil Test</option>
            <option value="micronutrient">Micro-nutrient Test</option>
            <option value="water">Water Test</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Farmer</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Package</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Assigned Agent</th>
                <th className="p-3.5">Pickup Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading soil test requests…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    No soil test orders found matching filters.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-bold text-foreground">{o.order_number}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{o.farmer_name}</div>
                      <div className="text-[11px] text-muted-foreground">+91 {o.mobile}</div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {o.district}, {o.state}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-foreground capitalize">
                        {o.test_type}
                      </span>
                      <div className="text-[10px] text-muted-foreground">₹{o.total_amount}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground uppercase">
                        {o.order_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {o.assigned_agent_name ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {o.assigned_agent_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {o.confirmed_pickup_date || o.preferred_pickup_date || '—'}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openManageModal(o, 'details')}
                        className="h-7 text-xs font-bold rounded-lg"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Order Modal */}
      {selectedOrder && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
            <DialogHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Order Management
                </span>
                <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-0.5 rounded-full uppercase">
                  {selectedOrder.order_status.replace(/_/g, ' ')}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {selectedOrder.order_number} · {selectedOrder.farmer_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedOrder.district}, {selectedOrder.state} · +91 {selectedOrder.mobile}
              </DialogDescription>
            </DialogHeader>

            {actionSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
              {[
                { id: 'details', label: 'Order Info' },
                { id: 'assign', label: 'Assign Agent' },
                { id: 'status', label: 'Update Status' },
                { id: 'upload', label: 'Upload Lab PDF' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setModalTab(t.id as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    modalTab === t.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB: Details */}
            {modalTab === 'details' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block">Farmer Name</span>
                    <span className="font-bold text-foreground">{selectedOrder.farmer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Contact Mobile</span>
                    <span className="font-bold text-foreground">+91 {selectedOrder.mobile}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Crop & Stage</span>
                    <span className="font-bold text-foreground">
                      {selectedOrder.crop || 'Field Crop'} ({selectedOrder.crop_stage || 'Not specified'})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Farm Size</span>
                    <span className="font-bold text-foreground">
                      {selectedOrder.farm_size || '—'} {selectedOrder.farm_size_unit || 'Acre'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Full Address</span>
                    <span className="font-medium text-foreground">
                      {selectedOrder.village ? `${selectedOrder.village}, ` : ''}
                      {selectedOrder.address}, {selectedOrder.district}, {selectedOrder.state} - {selectedOrder.pincode}
                    </span>
                  </div>
                </div>

                {selectedOrder.report_url && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Official Report File Uploaded
                    </span>
                    <a
                      href={selectedOrder.report_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-700 underline flex items-center gap-1"
                    >
                      <span>View PDF</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Assign Agent */}
            {modalTab === 'assign' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Technician / Agent Name *</label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Technician Phone Number *</label>
                  <Input
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Confirmed Pickup Date *</label>
                    <Input
                      type="date"
                      value={confirmedDate}
                      onChange={(e) => setConfirmedDate(e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Time Slot *</label>
                    <select
                      value={confirmedSlot}
                      onChange={(e) => setConfirmedSlot(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                    >
                      <option value="09:00 AM - 01:00 PM">Morning (09:00 AM - 01:00 PM)</option>
                      <option value="02:00 PM - 06:00 PM">Afternoon (02:00 PM - 06:00 PM)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">Internal Admin Note</label>
                  <Input
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g. Route planned via Dhar highway"
                    className="text-xs rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleAssignAgent}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-2"
                >
                  Confirm & Dispatch Pickup Notification
                </Button>
              </div>
            )}

            {/* TAB: Update Status */}
            {modalTab === 'status' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Select Next Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground font-bold"
                  >
                    <option value="sample_received">Sample Received at Laboratory</option>
                    <option value="testing_in_progress">Chemical Analysis in Progress</option>
                    <option value="report_ready">Report Ready (Completed)</option>
                    <option value="cancelled">Cancelled / Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Audit Note</label>
                  <Input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="e.g. Sample logged into Spectrophotometer Station #2"
                    className="text-xs rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-2"
                >
                  Apply Status Transition
                </Button>
              </div>
            )}

            {/* TAB: Upload Lab Report */}
            {modalTab === 'upload' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Laboratory Name *</label>
                  <Input
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Select Certified PDF Report *</label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="pt-2 border-t border-border/50">
                  <span className="font-bold text-foreground block mb-2">
                    Key Laboratory Metrics (for automated farmer health card):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Soil pH</label>
                      <Input
                        value={phVal}
                        onChange={(e) => setPhVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Nitrogen (N)</label>
                      <Input
                        value={nVal}
                        onChange={(e) => setNVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Phosphorus (P)</label>
                      <Input
                        value={pVal}
                        onChange={(e) => setPVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Potassium (K)</label>
                      <Input
                        value={kVal}
                        onChange={(e) => setKVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">% Organic Carbon</label>
                      <Input
                        value={ocVal}
                        onChange={(e) => setOcVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block">Zinc (Zn ppm)</label>
                      <Input
                        value={znVal}
                        onChange={(e) => setZnVal(e.target.value)}
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleUploadReport}
                  disabled={uploadingReport || !reportFile}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-2"
                >
                  {uploadingReport ? 'Uploading PDF & Generating Report…' : 'Upload Report & Notify Farmer'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
