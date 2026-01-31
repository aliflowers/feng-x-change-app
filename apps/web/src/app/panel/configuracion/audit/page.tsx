'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  X,
  User,
  RefreshCw
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  actions: string[];
  resourceTypes: string[];
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [availableFilters, setAvailableFilters] = useState<Filters>({
    actions: [],
    resourceTypes: []
  });

  // Filter state
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchUserId, setSearchUserId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (selectedAction) params.append('action', selectedAction);
      if (selectedResourceType) params.append('resource_type', selectedResourceType);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (searchUserId) params.append('user_id', searchUserId);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();

      if (res.ok) {
        setLogs(data.logs);
        setPagination(data.pagination);
        setAvailableFilters(data.filters);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedAction, selectedResourceType, dateFrom, dateTo, searchUserId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setSelectedAction('');
    setSelectedResourceType('');
    setDateFrom('');
    setDateTo('');
    setSearchUserId('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExportCSV = () => {
    // Crear CSV
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Recurso', 'ID Recurso', 'IP'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('es-VE'),
      log.profiles?.full_name || 'N/A',
      log.profiles?.email || 'N/A',
      log.action,
      log.resource_type,
      log.resource_id || 'N/A',
      log.ip_address || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-500/20 text-red-400';
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-500/20 text-green-400';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-yellow-500/20 text-yellow-400';
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <FileText className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoría</h1>
            <p className="text-sm text-gray-400">
              {pagination.total} registros en total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Refrescar"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showFilters ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Action filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Acción</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Todas</option>
                {availableFilters.actions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Resource type filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de Recurso</label>
              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Todos</option>
                {availableFilters.resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            {/* User ID search */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">ID Usuario</label>
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="UUID del usuario"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Acción</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Recurso</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">IP</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                    <p className="text-gray-400 mt-2">Cargando logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white">{log.profiles?.full_name || 'Sistema'}</p>
                          <p className="text-xs text-gray-500">{log.profiles?.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{log.resource_type}</p>
                      {log.resource_id && (
                        <p className="text-xs text-gray-500 font-mono">{log.resource_id.slice(0, 8)}...</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <p className="text-sm text-gray-400">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-2 bg-gray-800 rounded-lg text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl w-full max-w-2xl mx-4 border border-gray-700 shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Detalles del Log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Fecha</p>
                  <p className="text-white">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Usuario</p>
                  <p className="text-white">{selectedLog.profiles?.full_name || 'Sistema'}</p>
                  <p className="text-xs text-gray-500">{selectedLog.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Acción</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Recurso</p>
                  <p className="text-white">{selectedLog.resource_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">ID Recurso</p>
                  <p className="text-white font-mono text-sm">{selectedLog.resource_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">IP</p>
                  <p className="text-white font-mono">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {selectedLog.old_value && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Valor Anterior</p>
                  <pre className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Valor Nuevo</p>
                  <pre className="p-3 bg-green-900/20 border border-green-800 rounded-lg text-sm text-green-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
