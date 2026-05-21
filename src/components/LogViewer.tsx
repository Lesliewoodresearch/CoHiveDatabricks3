import React, { useState, useCallback } from 'react';
import { X, Search, Download, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { SpinHex } from './LoadingGem';

interface LogRow {
  logId: string;
  eventType: string;
  severity: 'info' | 'warn' | 'error';
  userEmail: string;
  brand: string;
  projectType: string;
  hexId: string;
  message: string;
  details: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  userEmail: string;
}

const EVENT_TYPES = [
  'assessment_complete', 'assessment_failed',
  'file_upload', 'file_approved', 'file_unapproved', 'file_deleted',
  'gem_saved', 'login', 'error',
];

const HEX_IDS = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade', 'stories', 'research', 'Wisdom'];

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  info:  { label: 'Info',  bg: 'bg-blue-100',   text: 'text-blue-700',  icon: <Info className="w-3 h-3" /> },
  warn:  { label: 'Warn',  bg: 'bg-amber-100',  text: 'text-amber-700', icon: <AlertTriangle className="w-3 h-3" /> },
  error: { label: 'Error', bg: 'bg-red-100',    text: 'text-red-700',   icon: <AlertCircle className="w-3 h-3" /> },
};

const EVENT_COLORS: Record<string, string> = {
  assessment_complete: 'bg-green-100 text-green-700',
  assessment_failed:   'bg-red-100 text-red-700',
  file_upload:         'bg-blue-100 text-blue-700',
  file_approved:       'bg-emerald-100 text-emerald-700',
  file_unapproved:     'bg-orange-100 text-orange-700',
  file_deleted:        'bg-red-100 text-red-700',
  gem_saved:           'bg-purple-100 text-purple-700',
  login:               'bg-gray-100 text-gray-700',
  error:               'bg-red-100 text-red-700',
};

function formatTime(ts: string) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return ts;
  }
}

function formatDuration(ms: number | null) {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function LogViewer({ onClose, userEmail }: Props) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [hexId, setHexId] = useState('');

  const LIMIT = 100;

  const fetchLogs = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userEmail, limit: String(LIMIT), offset: String(newOffset) });
      if (startDate)   params.set('startDate', startDate);
      if (endDate)     params.set('endDate', endDate);
      if (eventType)   params.set('eventType', eventType);
      if (severity)    params.set('severity', severity);
      if (filterEmail) params.set('filterEmail', filterEmail);
      if (hexId)       params.set('hexId', hexId);

      const resp = await fetch(`/api/databricks/logs/query?${params}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
      if (newOffset === 0) {
        setLogs(data.logs || []);
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      }
      setOffset(newOffset);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userEmail, startDate, endDate, eventType, severity, filterEmail, hexId]);

  const toggleRow = (logId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  };

  const exportCSV = () => {
    const headers = ['Time', 'Event Type', 'Severity', 'User', 'Brand', 'Project Type', 'Hex', 'Message', 'Duration', 'Details'];
    const rows = logs.map(l => [
      formatTime(l.createdAt),
      l.eventType,
      l.severity,
      l.userEmail,
      l.brand,
      l.projectType,
      l.hexId,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      l.durationMs != null ? String(l.durationMs) : '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohive-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStartDate(''); setEndDate(''); setEventType('');
    setSeverity(''); setFilterEmail(''); setHexId('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
            <p className="text-sm text-gray-500 mt-0.5">Query events from the Databricks activity log</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-44"
              >
                <option value="">All types</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32"
              >
                <option value="">All</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Email</label>
              <input
                type="text"
                placeholder="Filter by email..."
                value={filterEmail}
                onChange={e => setFilterEmail(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hex</label>
              <select
                value={hexId}
                onChange={e => setHexId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
              >
                <option value="">All hexes</option>
                {HEX_IDS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-end pb-0.5">
              <button
                onClick={() => fetchLogs(0)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? <SpinHex className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                Fetch Logs
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-100"
              >
                Clear
              </button>
              {logs.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-100"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        {logs.length > 0 && !loading && (
          <div className="px-6 py-2 border-b border-gray-100 bg-white flex-shrink-0">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{logs.length}</span> entries
              {logs.length === LIMIT && ' — scroll to end to load more'}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Query failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && logs.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Search className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Set filters above and click <span className="font-medium">Fetch Logs</span> to load entries</p>
            </div>
          )}

          {logs.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Time</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Event</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Severity</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">User</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Brand</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Hex</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">ms</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const expanded = expandedRows.has(log.logId);
                  const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                  const eventColor = EVENT_COLORS[log.eventType] || 'bg-gray-100 text-gray-700';
                  const hasDetails = !!log.details && log.details !== '{}';
                  return (
                    <React.Fragment key={log.logId}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expanded ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
                        onClick={() => hasDetails && toggleRow(log.logId)}
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${eventColor}`}>
                            {log.eventType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}>
                            {sev.icon}{sev.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 max-w-0 truncate" title={log.userEmail}>{log.userEmail}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 truncate max-w-0" title={log.brand}>{log.brand || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{log.hexId || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">
                          <div className="flex items-center gap-1">
                            {hasDetails && (
                              expanded
                                ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            )}
                            {log.message}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{formatDuration(log.durationMs)}</td>
                      </tr>
                      {expanded && hasDetails && (
                        <tr className="bg-blue-50 border-b border-blue-100">
                          <td colSpan={8} className="px-8 py-3">
                            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap bg-white border border-blue-100 rounded p-3 overflow-x-auto max-h-48">
                              {(() => {
                                try { return JSON.stringify(JSON.parse(log.details!), null, 2); }
                                catch { return log.details; }
                              })()}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Load more */}
        {logs.length > 0 && logs.length % LIMIT === 0 && (
          <div className="px-6 py-3 border-t border-gray-200 flex justify-center flex-shrink-0">
            <button
              onClick={() => fetchLogs(offset + LIMIT)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? <SpinHex className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              Load next 100
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
