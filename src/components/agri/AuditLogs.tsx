import React, { useState, useEffect } from "react";
import { Shield, Clock, User, Database, ChevronDown, ChevronUp, RefreshCw, Filter, X, Calendar } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogsProps {
  onNavigate?: (page: string) => void;
  compact?: boolean;
}

const TABLE_NAMES = [
  { value: 'all', label: 'All Tables' },
  { value: 'profiles', label: 'Profile' },
  { value: 'price_alerts', label: 'Price Alerts' },
  { value: 'cattle_listings', label: 'Cattle Listings' },
  { value: 'push_subscriptions', label: 'Notifications' },
];

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'INSERT', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const AuditLogs: React.FC<AuditLogsProps> = ({ onNavigate, compact = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { user } = useAuth();

  // Calculate date range based on preset
  const getDateRange = () => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (datePreset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'custom':
        if (startDate) start = new Date(startDate);
        if (endDate) end = new Date(endDate + 'T23:59:59');
        break;
    }

    return { start, end };
  };

  const fetchLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      // Apply date range filter
      const { start, end } = getDateRange();
      if (start) {
        query = query.gte('created_at', start.toISOString());
      }
      if (end) {
        query = query.lte('created_at', end.toISOString());
      }

      query = query.limit(compact ? 10 : 50);

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
      setLoadError(null);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLoadError('Could not load activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user, actionFilter, tableFilter, datePreset, startDate, endDate]);

  const clearFilters = () => {
    setActionFilter('all');
    setTableFilter('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = actionFilter !== 'all' || tableFilter !== 'all' || datePreset !== 'all';

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
      case 'create':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'update':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delete':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
      case 'create':
        return '+';
      case 'update':
        return '↻';
      case 'delete':
        return '−';
      default:
        return '•';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTableName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user) {
    return (
      <AgriCard className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h3 className="font-bold text-foreground mb-2">Login Required</h3>
        <p className="text-sm text-muted-foreground mb-4">Please login to view your audit logs</p>
        <AgriButton onClick={() => onNavigate?.('auth')}>Login</AgriButton>
      </AgriCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Audit Logs</h2>
            <p className="text-xs text-muted-foreground">Track all your sensitive operations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <AgriButton 
            size="sm" 
            variant={showFilters ? 'primary' : 'outline'} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-destructive rounded-full" />}
          </AgriButton>
          <AgriButton size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </AgriButton>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <AgriCard className="p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground text-sm">Filters</h4>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Table</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_NAMES.map(table => (
                    <SelectItem key={table.value} value={table.value}>{table.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div className="mt-3 pt-3 border-t border-border">
            <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Range
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>
        </AgriCard>
      )}

      {/* Stats Summary */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <AgriCard className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Total Actions</p>
          </AgriCard>
          <AgriCard className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.action.toUpperCase() === 'INSERT').length}
            </p>
            <p className="text-xs text-muted-foreground">Creates</p>
          </AgriCard>
          <AgriCard className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {logs.filter(l => l.action.toUpperCase() === 'UPDATE').length}
            </p>
            <p className="text-xs text-muted-foreground">Updates</p>
          </AgriCard>
        </div>
      )}

      {/* Logs List */}
      <AgriCard className="divide-y divide-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-foreground mb-1">Could not load activity</h3>
            <p className="text-sm text-muted-foreground mb-3">{loadError}</p>
            <AgriButton size="sm" variant="outline" onClick={fetchLogs} className="mt-3">
              Retry
            </AgriButton>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-foreground mb-1">
              {hasActiveFilters ? 'No Matching Logs' : 'No Activity Yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more results' 
                : 'Your sensitive operations will appear here'}
            </p>
            {hasActiveFilters && (
              <AgriButton size="sm" variant="outline" onClick={clearFilters} className="mt-3">
                Clear Filters
              </AgriButton>
            )}
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4">
              <div 
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                    <span className="font-medium text-foreground">{formatTableName(log.table_name)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(log.created_at)}</span>
                    {log.record_id && (
                      <>
                        <span>•</span>
                        <span className="truncate">ID: {log.record_id.slice(0, 8)}...</span>
                      </>
                    )}
                  </div>
                </div>
                {(log.old_data || log.new_data) && (
                  expandedLog === log.id ? 
                    <ChevronUp className="w-5 h-5 text-muted-foreground" /> : 
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Expanded Details */}
              {expandedLog === log.id && (log.old_data || log.new_data) && (
                <div className="mt-3 pt-3 border-t border-border space-y-3 animate-fade-in">
                  {log.old_data && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Previous Data:</p>
                      <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_data && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">New Data:</p>
                      <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.ip_address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>IP: {log.ip_address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </AgriCard>

      {/* View All Link for Compact Mode */}
      {compact && logs.length > 0 && (
        <AgriButton 
          variant="outline" 
          className="w-full" 
          onClick={() => onNavigate?.('profile')}
        >
          View All Activity
        </AgriButton>
      )}
    </div>
  );
};

export default AuditLogs;
