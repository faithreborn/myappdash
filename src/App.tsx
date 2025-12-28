import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  Users, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  Activity, 
  HardDriveDownload,
  Search,
  Plus,
  Clock,
  X,
  Eye,
  Loader2,
  Wifi,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Server,
  Upload,
  PieChart as PieChartIcon,
  Menu,
  Download,
  Database,
  Send,
  FileJson,
  Table,
  CheckSquare,
  Square,
  Edit3,
  Trash2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  initDB, 
  getClients, 
  addClient, 
  updateClient, 
  deleteClient,
  getSettings, 
  saveSettings, 
  addBackupRecord, 
  getBackupHistory,
  updateBackupRecord,
  deleteBackupRecord,
  Client, 
  BackupRecord 
} from './lib/db';

// --- Types ---

interface Settings { token: string; chatId: string; }
interface LogEntry { id: number; action_type: string; details: string; created_at: string; document_type?: string; price?: number; }

// --- Components ---

const Card = ({ children, className = '', noPadding = false }: { children: React.ReactNode; className?: string; noPadding?: boolean }) => (
  <div className={`rounded-3xl border border-white/5 bg-[#121212] text-card-foreground shadow-2xl backdrop-blur-sm ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'default' }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
  const sizes = {
    default: "h-11 px-5 text-sm",
    sm: "h-9 px-3 text-xs",
    icon: "h-10 w-10"
  };
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-400/20",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    ghost: "hover:bg-white/5 text-zinc-400 hover:text-white",
    destructive: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
    outline: "border border-white/10 bg-transparent hover:bg-white/5 text-zinc-300"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size as keyof typeof sizes] || sizes.default} ${variants[variant as keyof typeof variants]} ${className}`}>
      {Icon && <Icon className={`mr-2 ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />}
      {children}
    </button>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'emerald' }: any) => {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <Card className="relative overflow-hidden group hover:bg-white/[0.02] transition-colors p-4 sm:p-6">
      <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <Icon className="w-16 h-16 sm:w-24 sm:h-24" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border ${colors[color as keyof typeof colors]}`}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          {trend && (
             <div className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
               {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
               {trendValue}
             </div>
          )}
        </div>
        <div>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">{title}</p>
          <h3 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </Card>
  );
};

// --- Main App ---

function App() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'profits' | 'converter' | 'settings'>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettingsData] = useState<Settings>({ token: '', chatId: '' });
  const [history, setHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Modals & Sheets
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'logs' | 'manual-report' | 'export' | 'edit-record' | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientLogs, setClientLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [pingStatus, setPingStatus] = useState<Record<string, 'online'|'offline'|'checking'>>({});
  
  // Export State
  const [exportTables, setExportTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Edit Record State
  const [selectedRecord, setSelectedRecord] = useState<BackupRecord | null>(null);
  const [editRecordData, setEditRecordData] = useState({ revenue: 0, collected: 0 });
  
  // Forms
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [manualStats, setManualStats] = useState({ revenue: 0, collected: 0 });
  const [tempClientName, setTempClientName] = useState('');
  
  // Bank Converter State
  const [converting, setConverting] = useState(false);
  
  // Responsive Sidebar Init
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    // Set initial based on current width
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    (async () => {
      await initDB();
      await refreshData();
    })();
  }, []);

  const refreshData = async () => {
    setClients(await getClients());
    setSettingsData(await getSettings());
    setHistory(await getBackupHistory());
  };

  // --- Logic ---

  const checkConnection = async (c: Client) => {
    if (!c.supabaseUrl || !c.supabaseKey) {
       setPingStatus(prev => ({ ...prev, [c.id]: 'offline' }));
       return;
    }
    setPingStatus(prev => ({ ...prev, [c.id]: 'checking' }));
    try {
      const sb = createClient(c.supabaseUrl, c.supabaseKey, {
        auth: { persistSession: false },
        global: { headers: { 'x-application-name': 'facistore-admin-ping' } }
      });
      const { error } = await sb.from('customers').select('count', { count: 'exact', head: true });
      if (error) throw error;
      setPingStatus(prev => ({ ...prev, [c.id]: 'online' }));
    } catch {
      setPingStatus(prev => ({ ...prev, [c.id]: 'offline' }));
    }
  };

  const handleBackup = async (c: Client) => {
    if (!settings.token || (!c.telegramChatId && !settings.chatId)) return alert('Setup Telegram first');
    
    // Manual Backup Logic for clients without DB
    if (!c.supabaseUrl || !c.supabaseKey) {
        alert('This client has no database connected. Use Manual Report instead.');
        return;
    }

    setLoading(c.id);
    try {
      const sb = createClient(c.supabaseUrl, c.supabaseKey);
      
      const [customers, contracts, payments] = await Promise.all([
        sb.from('customers').select('count', { count: 'exact', head: true }),
        sb.from('installment_contracts').select('total_price'), 
        sb.from('payments').select('amount') 
      ]);

      let totalRevenue = 0;
      let totalCollected = 0;
      
      if (contracts.data) totalRevenue = contracts.data.reduce((sum, item) => sum + (item.total_price || 0), 0);
      if (payments.data) totalCollected = payments.data.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const stats = { 
        customers: customers.count || 0, 
        contracts: contracts.data?.length || 0, 
        payments: payments.data?.length || 0,
        totalRevenue,
        totalDebt: totalRevenue - totalCollected
      };

      const message = `
📦 *FaciStore Backup Report*
👤 *Client:* ${c.name}
━━━━━━━━━━━━━━━━
👥 *Customers:* ${stats.customers}
📄 *Contracts:* ${stats.contracts}
💰 *Total Revenue:* ${totalRevenue.toLocaleString()} DZD
💵 *Collected:* ${totalCollected.toLocaleString()} DZD
📉 *Outstanding:* ${(totalRevenue - totalCollected).toLocaleString()} DZD
━━━━━━━━━━━━━━━━
✅ *System Status:* Online
      `.trim();

      const form = new FormData();
      form.append('chat_id', c.telegramChatId || settings.chatId);
      form.append('text', message);
      form.append('parse_mode', 'Markdown');
      
      await fetch(`https://api.telegram.org/bot${settings.token}/sendMessage`, { method: 'POST', body: form });

      await addBackupRecord({ 
        clientId: c.id, 
        clientName: c.name, 
        date: new Date().toISOString(), 
        status: 'success', 
        stats 
      });
      
      if (clients.find(x => x.id === c.id)) {
        await updateClient({ ...c, lastBackup: new Date().toISOString() });
      }
      await refreshData();
      
    } catch (e) { 
      console.error(e);
      await addBackupRecord({ clientId: c.id, clientName: c.name, date: new Date().toISOString(), status: 'failed' });
      alert('Backup Failed'); 
    }
    setLoading(null);
  };

  const fetchClientLogs = async (c: Client) => {
    if (!c.supabaseUrl || !c.supabaseKey) {
        setClientLogs([]);
        return;
    }
    setLoadingLogs(true);
    setClientLogs([]);
    try {
      const sb = createClient(c.supabaseUrl, c.supabaseKey);
      const { data, error } = await sb.from('print_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setClientLogs(data || []);
    } catch (e) { console.error(e); }
    setLoadingLogs(false);
  };

  // === Export Functions ===
  const [tableRowCounts, setTableRowCounts] = useState<Record<string, number>>({});

  const fetchClientTables = async (c: Client) => {
    if (!c.supabaseUrl || !c.supabaseKey) return;
    setExportLoading(true);
    setExportTables([]);
    setSelectedTables([]);
    setTableRowCounts({});
    
    try {
      const sb = createClient(c.supabaseUrl, c.supabaseKey);
      
      // طريقة 1: جلب الجداول من OpenAPI schema
      let tableNames: string[] = [];
      
      try {
        const response = await fetch(`${c.supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': c.supabaseKey,
            'Authorization': `Bearer ${c.supabaseKey}`
          }
        });
        
        if (response.ok) {
          const openApiSpec = await response.json();
          // OpenAPI spec يحتوي على definitions لكل الجداول
          if (openApiSpec.definitions) {
            tableNames = Object.keys(openApiSpec.definitions).filter(name => 
              !name.startsWith('_') && // تجاهل الجداول الداخلية
              name !== 'rpc' // تجاهل RPC
            );
          } else if (openApiSpec.paths) {
            // أو من paths
            tableNames = Object.keys(openApiSpec.paths)
              .filter(path => path.startsWith('/') && !path.includes('rpc'))
              .map(path => path.replace('/', ''));
          }
        }
      } catch (e) {
        console.log('OpenAPI fetch failed, trying alternative method');
      }
      
      // طريقة 2: إذا فشلت الأولى، جرب قائمة شاملة
      if (tableNames.length === 0) {
        const allPossibleTables = [
          'customers', 'installment_contracts', 'payments', 'products', 
          'categories', 'suppliers', 'print_logs', 'guarantors', 'stores',
          'installment_plans', 'activity_logs', 'users', 'settings',
          'orders', 'order_items', 'invoices', 'expenses', 'inventory',
          'transactions', 'notifications', 'messages', 'files', 'documents',
          'employees', 'salaries', 'attendance', 'reports', 'analytics',
          'coupons', 'discounts', 'promotions', 'reviews', 'ratings',
          'addresses', 'shipping', 'returns', 'refunds', 'warranties'
        ];
        
        // جرب كل جدول
        const checkPromises = allPossibleTables.map(async (table) => {
          try {
            const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
            if (!error && count !== null) {
              return { table, count };
            }
          } catch {}
          return null;
        });
        
        const results = await Promise.all(checkPromises);
        const validTables = results.filter(r => r !== null) as { table: string; count: number }[];
        
        tableNames = validTables.map(r => r.table);
        validTables.forEach(r => {
          setTableRowCounts(prev => ({ ...prev, [r.table]: r.count }));
        });
      } else {
        // جلب عدد الصفوف لكل جدول
        const countPromises = tableNames.map(async (table) => {
          try {
            const { count } = await sb.from(table).select('*', { count: 'exact', head: true });
            if (count !== null) {
              return { table, count };
            }
          } catch {}
          return null;
        });
        
        const results = await Promise.all(countPromises);
        results.forEach(r => {
          if (r) setTableRowCounts(prev => ({ ...prev, [r.table]: r.count }));
        });
        
        // فلتر الجداول اللي نقدر نوصلها
        tableNames = results.filter(r => r !== null).map(r => r!.table);
      }
      
      // ترتيب أبجدي
      tableNames.sort();
      setExportTables(tableNames);
      
    } catch (e) {
      console.error(e);
    }
    setExportLoading(false);
  };

  const fetchTableData = async (c: Client, tables: string[]) => {
    if (!c.supabaseUrl || !c.supabaseKey) return {};
    
    const sb = createClient(c.supabaseUrl, c.supabaseKey);
    const data: Record<string, any[]> = {};
    
    for (const table of tables) {
      try {
        const { data: tableData, error } = await sb.from(table).select('*');
        if (!error && tableData) {
          data[table] = tableData;
        }
      } catch {}
    }
    
    return data;
  };

  const handleExportJSON = async () => {
    if (!selectedClient || selectedTables.length === 0) return;
    setExportLoading(true);
    
    try {
      const data = await fetchTableData(selectedClient, selectedTables);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClient.name}_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed');
    }
    setExportLoading(false);
  };

  const handleExportExcel = async () => {
    if (!selectedClient || selectedTables.length === 0) return;
    setExportLoading(true);
    
    try {
      const data = await fetchTableData(selectedClient, selectedTables);
      const wb = XLSX.utils.book_new();
      
      for (const [tableName, tableData] of Object.entries(data)) {
        if (tableData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(tableData);
          XLSX.utils.book_append_sheet(wb, ws, tableName.substring(0, 31));
        }
      }
      
      XLSX.writeFile(wb, `${selectedClient.name}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      alert('Export failed');
    }
    setExportLoading(false);
  };

  const handleSendToBot = async () => {
    if (!selectedClient || selectedTables.length === 0 || !settings.token) {
      alert('Setup Telegram first in Settings');
      return;
    }
    setExportLoading(true);
    
    try {
      const data = await fetchTableData(selectedClient, selectedTables);
      const chatId = selectedClient.telegramChatId || settings.chatId;
      
      if (!chatId) {
        alert('No Telegram Chat ID configured');
        setExportLoading(false);
        return;
      }

      // Send summary message
      let summary = `📊 *Data Export - ${selectedClient.name}*\n━━━━━━━━━━━━━━━━\n`;
      for (const [table, rows] of Object.entries(data)) {
        summary += `📁 *${table}:* ${rows.length} records\n`;
      }
      summary += `\n📅 ${new Date().toLocaleString()}`;

      const msgForm = new FormData();
      msgForm.append('chat_id', chatId);
      msgForm.append('text', summary);
      msgForm.append('parse_mode', 'Markdown');
      await fetch(`https://api.telegram.org/bot${settings.token}/sendMessage`, { method: 'POST', body: msgForm });

      // Send JSON file
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const fileForm = new FormData();
      fileForm.append('chat_id', chatId);
      fileForm.append('document', blob, `${selectedClient.name}_export.json`);
      fileForm.append('caption', `🗂 Full data export for ${selectedClient.name}`);
      await fetch(`https://api.telegram.org/bot${settings.token}/sendDocument`, { method: 'POST', body: fileForm });

      alert('Data sent to Telegram successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to send to Telegram');
    }
    setExportLoading(false);
  };

  const toggleTableSelection = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(exportTables);
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  // === Record Edit/Delete Functions ===
  const handleEditRecord = (record: BackupRecord) => {
    setSelectedRecord(record);
    setEditRecordData({
      revenue: record.stats?.totalRevenue || 0,
      collected: (record.stats?.totalRevenue || 0) - (record.stats?.totalDebt || 0)
    });
    setShowModal('edit-record');
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    
    const updatedRecord: BackupRecord = {
      ...selectedRecord,
      stats: {
        ...selectedRecord.stats,
        customers: selectedRecord.stats?.customers || 0,
        contracts: selectedRecord.stats?.contracts || 0,
        payments: selectedRecord.stats?.payments || 0,
        totalRevenue: editRecordData.revenue,
        totalDebt: editRecordData.revenue - editRecordData.collected
      }
    };
    
    await updateBackupRecord(updatedRecord);
    await refreshData();
    setShowModal(null);
    setSelectedRecord(null);
  };

  const handleDeleteRecord = async (record: BackupRecord) => {
    if (!record.id) return;
    if (!confirm(`هل تريد حذف سجل "${record.clientName}"؟`)) return;
    
    await deleteBackupRecord(record.id);
    await refreshData();
  };
  
  // ...

  // ... (inside App)
  
  const handleManualReport = async () => {
    if (!selectedClient && !tempClientName) return;
    
    let targetClient = selectedClient;

    if (!targetClient) {
        // Try to find existing client by name
        const existing = clients.find(c => c.name.toLowerCase() === tempClientName.trim().toLowerCase());
        if (existing) {
            targetClient = existing;
        } else {
            // Create new "Manual" client
            const isPhone = /^\d+$/.test(tempClientName.trim());
            const newClient: Client = {
                id: `manual_${Date.now()}`,
                name: tempClientName.trim(),
                status: 'active',
                phone: isPhone ? tempClientName.trim() : undefined
            };
            await addClient(newClient);
            targetClient = newClient;
        }
    }

    const stats = {
      customers: 0,
      contracts: 0,
      payments: 0,
      totalRevenue: Number(manualStats.revenue),
      totalDebt: Number(manualStats.revenue) - Number(manualStats.collected)
    };

    await addBackupRecord({
      clientId: targetClient.id,
      clientName: targetClient.name,
      date: new Date().toISOString(),
      status: 'success',
      stats
    });

    if (targetClient) {
        await updateClient({ ...targetClient, lastBackup: new Date().toISOString() });
    }
    
    await refreshData();
    setShowModal(null);
    setManualStats({ revenue: 0, collected: 0 });
    setTempClientName('');
    setSelectedClient(null);
  };

  const handleBankFileUpload = async (_file: File) => {
    setConverting(true);
    setTimeout(() => setConverting(false), 2000);
  };

  const latestRevenues = clients.reduce((acc, client) => {
    const clientBackups = history.filter(h => h.clientId === client.id && h.status === 'success');
    if (clientBackups.length > 0) {
      const last = clientBackups[clientBackups.length - 1];
      return acc + (last.stats?.totalRevenue || 0);
    }
    return acc;
  }, 0);
  
  const totalDebt = clients.reduce((acc, client) => {
    const clientBackups = history.filter(h => h.clientId === client.id && h.status === 'success');
    if (clientBackups.length > 0) {
      const last = clientBackups[clientBackups.length - 1];
      return acc + (last.stats?.totalDebt || 0);
    }
    return acc;
  }, 0);

  const totalCollected = latestRevenues - totalDebt;

  const globalStats = {
    revenue: history.reduce((acc, curr) => acc + (curr.stats?.totalRevenue || 0), 0),
    clients: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    success: history.filter(h => h.status === 'success').length
  };

  const pieData = [
    { name: 'Collected', value: totalCollected, color: '#10b981' },
    { name: 'Outstanding', value: totalDebt, color: '#f59e0b' }
  ];


  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden" dir="rtl">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen z-50 bg-[#0c0c0e] border-l border-white/5 flex flex-col transition-all duration-300 
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-20'}
      `}>
        <div className={`h-20 flex items-center ${isSidebarOpen ? 'px-6 gap-3' : 'justify-center'} border-b border-white/5 transition-all duration-300`}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
            F
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
             <h1 className="font-bold text-lg tracking-wide text-white whitespace-nowrap">FaciStore</h1>
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold whitespace-nowrap">Master Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-8 px-3 space-y-2">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'profits', label: 'Profits & Growth', icon: PieChartIcon },
            { id: 'converter', label: 'Tools', icon: FileSpreadsheet },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full flex items-center p-3 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              } ${!isSidebarOpen && 'justify-center'} ${isSidebarOpen && 'gap-3'}`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>{item.label}</span>
              {activeTab === item.id && isSidebarOpen && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_currentColor]"></div>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className={`flex items-center w-full p-2 hover:bg-white/5 rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'} ${isSidebarOpen && 'gap-3'}`}>
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 flex-shrink-0">
               <Server className="h-4 w-4 text-zinc-400" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 text-left' : 'w-0 opacity-0 hidden'}`}>
              <p className="text-xs font-medium text-white whitespace-nowrap">System Status</p>
              <p className="text-[10px] text-emerald-500 flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                All Systems Operational
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[url('/money-bg.jpg')] bg-cover bg-center relative isolate before:absolute before:inset-0 before:bg-black/80 before:-z-10 bg-fixed">
        
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-[#09090b]/60 sticky top-0 z-40">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="w-5 h-5" />
             </Button>
             <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
               {activeTab === 'dashboard' && 'Dashboard'}
               {activeTab === 'clients' && 'Clients'}
               {activeTab === 'profits' && 'Financial Breakdown'}
               {activeTab === 'converter' && 'Tools'}
               {activeTab === 'settings' && 'Settings'}
             </h2>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 font-mono">
                 <Clock className="w-3.5 h-3.5 mr-2" />
                 {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <Button size="icon" variant="ghost" className="rounded-full"><Search className="w-5 h-5"/></Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 ring-2 ring-white/10"></div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
              {/* Financial Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <StatCard 
                  title="Total Revenue" 
                  value={`${(latestRevenues / 1000000).toFixed(1)}M`} 
                  icon={DollarSign}
                  color="emerald"
                  trend="up"
                  trendValue="+12%"
                />
                 <StatCard 
                  title="Active Clients" 
                  value={globalStats.active} 
                  icon={Users}
                  color="blue"
                  trend="up"
                  trendValue="+1"
                />
                 <StatCard 
                  title="Outstanding" 
                  value={`${(totalDebt / 1000000).toFixed(1)}M`} 
                  icon={AlertTriangle}
                  color="amber"
                />
                 <StatCard 
                  title="Health" 
                  value="98.5%" 
                  icon={Activity}
                  color="purple"
                />
              </div>

              {/* Charts Section */}
              <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
                <Card className="lg:col-span-2 p-4 sm:p-6 flex flex-col h-[300px] sm:h-[400px]">
                  <div className="flex justify-between items-center mb-4 sm:mb-8">
                     <h3 className="font-bold text-white text-base sm:text-lg">Daily Activity</h3>
                     <select className="bg-white/5 border border-white/10 rounded-lg text-xs px-2 sm:px-3 py-1 text-zinc-400 focus:outline-none">
                       <option>This Week</option>
                     </select>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{n:'Mon',v:2400},{n:'Tue',v:1398},{n:'Wed',v:9800},{n:'Thu',v:3908},{n:'Fri',v:4800},{n:'Sat',v:3800},{n:'Sun',v:4300}]}>
                        <defs>
                          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{fill:'#52525b', fontSize:10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill:'#52525b', fontSize:10}} hide={window.innerWidth < 640} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px'}} />
                        <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                
                <Card className="p-4 sm:p-6 h-[300px] sm:h-[400px] flex flex-col">
                   <h3 className="font-bold text-white text-base sm:text-lg mb-4 sm:mb-6">Recent Backups</h3>
                   <div className="flex-1 overflow-y-auto w-full custom-scrollbar space-y-3 sm:space-y-4 pr-2">
                      {history.slice().reverse().slice(0,10).map((h, i) => (
                        <div key={i} className="flex gap-3 sm:gap-4 items-start p-2 sm:p-3 hover:bg-white/5 rounded-xl sm:rounded-2xl transition-colors cursor-default group">
                           <div className={`mt-1 min-w-[8px] h-2 rounded-full ${h.status==='success'?'bg-emerald-500':'bg-red-500'} ring-4 ring-white/5 group-hover:ring-white/10 transition-all`}></div>
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-semibold text-white truncate">{h.clientName}</p>
                             <div className="flex justify-between items-center mt-1">
                               <p className="text-xs text-zinc-500">{new Date(h.date).toLocaleTimeString()}</p>
                               {h.stats && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400">{h.stats.contracts} Contracts</span>}
                             </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
              </div>
            </div>
          )}

          {/* CLIENTS TAB */}
          {activeTab === 'clients' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
               <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#121212] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5 sticky top-0 z-30 shadow-2xl backdrop-blur-xl bg-opacity-80">
                  <div className="relative flex-1 sm:flex-none">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input 
                       placeholder="Search clients..." 
                       className="w-full sm:w-64 bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                     />
                  </div>
                  <Button icon={Plus} onClick={() => { setFormData({}); setShowModal('add'); }} className="w-full sm:w-auto">Add Client</Button>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                 {clients.map(c => (
                   <Card key={c.id} className="group hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-4 sm:mb-6">
                         <div className="flex gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-lg sm:text-xl font-bold text-emerald-500 group-hover:scale-105 transition-transform duration-300 shadow-xl flex-shrink-0">
                               {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                               <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors truncate">{c.name}</h3>
                               {c.supabaseUrl ? (
                                   <div className="flex items-center gap-2 mt-1">
                                      <div className={`w-2 h-2 rounded-full ${pingStatus[c.id] === 'online' ? 'bg-emerald-500' : pingStatus[c.id] === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                                      <span className="text-xs text-zinc-500">{pingStatus[c.id]?.toUpperCase() || 'UNKNOWN'}</span>
                                   </div>
                               ) : (
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-white/5">MANUAL</span>
                                   </div>
                               )}
                               {c.phone && <p className="text-xs text-zinc-500 mt-1">{c.phone}</p>}
                            </div>
                         </div>
                         <div className="flex gap-1 flex-shrink-0">
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="rounded-full hover:bg-blue-500/10 hover:text-blue-400 transition-colors h-8 w-8 sm:h-10 sm:w-10"
                               title="Export Data"
                               onClick={() => { 
                                 setSelectedClient(c); 
                                 setShowModal('export'); 
                                 fetchClientTables(c); 
                               }}
                            >
                               <Download className="w-4 h-4"/>
                            </Button>
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="rounded-full hover:bg-white/10 hover:text-white transition-colors h-8 w-8 sm:h-10 sm:w-10"
                               onClick={() => { setFormData(c); setSelectedClient(c); setShowModal('edit'); }}
                            >
                               <SettingsIcon className="w-4 h-4"/>
                            </Button>
                            <Button 
                               variant="ghost" 
                               size="icon" 
                               className="rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors h-8 w-8 sm:h-10 sm:w-10"
                               onClick={() => { if(confirm('⚠️ Are you sure?')) deleteClient(c.id).then(refreshData); }}
                            >
                               <X className="w-4 h-4"/>
                            </Button>
                         </div>
                      </div>

                      <div className="mb-4 sm:mb-6">
                         <div className="bg-white/[0.03] p-2.5 sm:p-3 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Last Backup</span>
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                              {c.lastBackup ? new Date(c.lastBackup).toLocaleDateString() : 'Never'}
                            </span>
                         </div>
                      </div>

                      <div className="mt-auto space-y-2 sm:space-y-3">
                         {c.supabaseUrl ? (
                             <>
                                <div className="flex gap-2">
                                    <Button 
                                      onClick={() => checkConnection(c)}
                                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 shadow-none text-xs h-9 sm:h-10"
                                    >
                                       {pingStatus[c.id] === 'checking' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4"/>}
                                    </Button>
                                    <Button 
                                       onClick={() => handleBackup(c)} 
                                       disabled={loading === c.id}
                                       className="flex-[3] text-xs h-9 sm:h-10"
                                       variant="primary"
                                    >
                                       {loading === c.id ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <HardDriveDownload className="w-4 h-4 mr-2"/>}
                                       Backup
                                    </Button>
                                 </div>
                                 <Button variant="outline" className="w-full text-xs h-9 sm:h-10" onClick={() => { setSelectedClient(c); setClientLogs([]); setShowModal('logs'); fetchClientLogs(c); }}>
                                    View Logs
                                 </Button>
                             </>
                         ) : (
                             <Button 
                                className="w-full text-xs h-9 sm:h-10"
                                variant="outline"
                                onClick={() => { setSelectedClient(c); setManualStats({ revenue: 0, collected: 0 }); setShowModal('manual-report'); }}
                             >
                                <FileSpreadsheet className="w-4 h-4 mr-2"/>
                                Add Manual Data
                             </Button>
                         )}
                      </div>
                   </Card>
                 ))}
               </div>
            </div>
          )}

          {/* PROFITS TAB - NEW */}
          {activeTab === 'profits' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
               
               {/* Header */}
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] p-4 rounded-3xl border border-white/5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Profit Analysis</h2>
                    <p className="text-zinc-500 text-xs sm:text-sm">Real-time financial breakdown</p>
                  </div>
                  <Button 
                    icon={Plus} 
                    className="w-full sm:w-auto"
                    onClick={() => { setSelectedClient(null); setTempClientName(''); setManualStats({ revenue: 0, collected: 0 }); setShowModal('manual-report'); }}
                  >
                     Add Record
                  </Button>
               </div>

               {/* Stats Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <StatCard 
                    title="Total Collected" 
                    value={`${Math.round(totalCollected).toLocaleString()} DA`} 
                    icon={DollarSign}
                    color="emerald"
                    trend="up"
                    trendValue="Net Profit"
                  />
                   <StatCard 
                    title="Total Outstanding" 
                    value={`${Math.round(totalDebt).toLocaleString()} DA`} 
                    icon={TrendingUp}
                    color="amber"
                    trend="up"
                    trendValue="Potential"
                  />
                   <Card className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-br from-emerald-900/20 to-black border-emerald-500/20">
                      <div>
                         <p className="text-zinc-500 text-xs sm:text-sm font-medium mb-1">Collection Rate</p>
                         <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {latestRevenues > 0 ? ((totalCollected / latestRevenues) * 100).toFixed(1) : 0}%
                         </h3>
                      </div>
                      <div className="h-14 w-14 sm:h-16 sm:w-16 p-2">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={pieData} innerRadius={18} outerRadius={28} paddingAngle={5} dataKey="value">
                                  {pieData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                  ))}
                               </Pie>
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                   </Card>
               </div>

               {/* Main Content Grid */}
               <div className="grid lg:grid-cols-3 gap-6">
                  
                  {/* Records Table */}
                  <Card className="lg:col-span-2 p-4 sm:p-6">
                     <h3 className="font-bold text-white text-lg sm:text-xl mb-4 sm:mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500"/>
                        Financial Records
                     </h3>
                     
                     {/* Mobile Cards View */}
                     <div className="lg:hidden space-y-3">
                        {history.slice().reverse().map((record, i) => (
                           <div key={record.id || i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <p className="font-bold text-white">{record.clientName}</p>
                                    <p className="text-xs text-zinc-500">{new Date(record.date).toLocaleDateString()}</p>
                                 </div>
                                 <div className="flex gap-1">
                                    <button 
                                       onClick={() => handleEditRecord(record)}
                                       className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                       <Edit3 className="w-4 h-4 text-blue-400"/>
                                    </button>
                                    <button 
                                       onClick={() => handleDeleteRecord(record)}
                                       className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                       <Trash2 className="w-4 h-4 text-red-400"/>
                                    </button>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                 <div className="bg-black/30 rounded-xl p-2">
                                    <p className="text-[10px] text-zinc-500">Revenue</p>
                                    <p className="text-sm font-bold text-white">{((record.stats?.totalRevenue || 0) / 1000).toFixed(0)}K</p>
                                 </div>
                                 <div className="bg-black/30 rounded-xl p-2">
                                    <p className="text-[10px] text-zinc-500">Collected</p>
                                    <p className="text-sm font-bold text-emerald-400">{(((record.stats?.totalRevenue || 0) - (record.stats?.totalDebt || 0)) / 1000).toFixed(0)}K</p>
                                 </div>
                                 <div className="bg-black/30 rounded-xl p-2">
                                    <p className="text-[10px] text-zinc-500">Debt</p>
                                    <p className="text-sm font-bold text-amber-400">{((record.stats?.totalDebt || 0) / 1000).toFixed(0)}K</p>
                                 </div>
                              </div>
                           </div>
                        ))}
                        {history.length === 0 && (
                           <div className="text-center py-12 text-zinc-500">
                              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                              <p>No records yet</p>
                           </div>
                        )}
                     </div>
                     
                     {/* Desktop Table View */}
                     <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                           <thead className="text-xs text-zinc-500 uppercase border-b border-white/5">
                              <tr>
                                 <th className="px-4 py-3">Client</th>
                                 <th className="px-4 py-3">Date</th>
                                 <th className="px-4 py-3">Revenue</th>
                                 <th className="px-4 py-3">Collected</th>
                                 <th className="px-4 py-3">Debt</th>
                                 <th className="px-4 py-3 text-center">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {history.slice().reverse().map((record, i) => (
                                 <tr key={record.id || i} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-white">{record.clientName}</td>
                                    <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(record.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-zinc-300">{Math.round(record.stats?.totalRevenue || 0).toLocaleString()} DA</td>
                                    <td className="px-4 py-3 text-emerald-400">{Math.round((record.stats?.totalRevenue || 0) - (record.stats?.totalDebt || 0)).toLocaleString()} DA</td>
                                    <td className="px-4 py-3 text-amber-400">{Math.round(record.stats?.totalDebt || 0).toLocaleString()} DA</td>
                                    <td className="px-4 py-3">
                                       <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                             onClick={() => handleEditRecord(record)}
                                             className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                                             title="Edit"
                                          >
                                             <Edit3 className="w-4 h-4 text-blue-400"/>
                                          </button>
                                          <button 
                                             onClick={() => handleDeleteRecord(record)}
                                             className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                             title="Delete"
                                          >
                                             <Trash2 className="w-4 h-4 text-red-400"/>
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        {history.length === 0 && (
                           <div className="text-center py-12 text-zinc-500">
                              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                              <p>No records yet</p>
                           </div>
                        )}
                     </div>
                  </Card>

                  {/* Distribution Chart */}
                  <Card className="p-4 sm:p-6">
                     <h3 className="font-bold text-white text-lg sm:text-xl mb-4 sm:mb-6">Distribution</h3>
                     <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={pieData}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={50}
                                 outerRadius={70}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{backgroundColor:'#18181b', border:'1px solid #27272a', borderRadius:'12px'}} />
                              <Legend verticalAlign="bottom" height={36}/>
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                     
                     {/* Quick Stats */}
                     <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                           <span className="text-xs text-zinc-400">Total Records</span>
                           <span className="font-bold text-white">{history.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                           <span className="text-xs text-zinc-400">Total Revenue</span>
                           <span className="font-bold text-white">{Math.round(latestRevenues).toLocaleString()} DA</span>
                        </div>
                     </div>
                  </Card>
               </div>
             </div>
          )}

          {/* CONVERTER TAB */}
          {activeTab === 'converter' && (
             <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
               <div className="text-center mb-10">
                 <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                   <FileSpreadsheet className="h-8 w-8" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-2">Financial Data Processor</h2>
                 <p className="text-zinc-500">Transform raw bank files directly into FaciStore compatible formats.</p>
               </div>
               
               <Card className="p-12 border-dashed border-2 border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer relative group bg-black/20">
                 <input 
                   type="file" 
                   accept=".xlsx" 
                   onChange={e => e.target.files && handleBankFileUpload(e.target.files[0])} 
                   className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                   disabled={converting} 
                 />
                 <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-300">
                   {converting ? (
                      <>
                        <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                        <p className="text-emerald-500 font-medium tracking-widest uppercase text-xs">Processing Data...</p>
                      </>
                   ) : (
                      <>
                        <div className="p-4 rounded-full bg-white/5 group-hover:bg-emerald-500/10 transition-colors">
                           <Upload className="h-8 w-8 text-zinc-400 group-hover:text-emerald-500" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-bold text-lg text-white">Drop Bank File Here</h3>
                          <p className="text-sm text-zinc-500 mt-1">Supports ETAT BALAYAGE .xlsx files</p>
                        </div>
                      </>
                   )}
                 </div>
               </Card>
             </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
               <h2 className="text-3xl font-bold text-white mb-8">System Configuration</h2>
               <Card className="p-8 space-y-8">
                 <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                       <Server className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-white">Telegram Gateway</h3>
                       <p className="text-sm text-zinc-500">Configure bot credentials for automated reports.</p>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bot Token</label>
                     <input 
                       value={settings.token} onChange={e => setSettingsData({...settings, token: e.target.value})}
                       className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                       type="password"
                       placeholder="123456789:ABCdefGHIjklMNOpqrs..."
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Default Chat ID</label>
                     <input 
                       value={settings.chatId} onChange={e => setSettingsData({...settings, chatId: e.target.value})}
                       className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                       placeholder="-100xxxxxxxxx"
                     />
                   </div>
                   <Button onClick={() => saveSettings(settings).then(() => alert('Configuration Saved Successfully'))} className="w-full h-12 text-base">
                     Save System Configuration
                   </Button>
                 </div>
               </Card>
             </div>
          )}
        </main>
      </div>
      
       {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           {showModal === 'logs' ? (
              <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-white/10" noPadding>
                 <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]">
                    <div>
                       <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          <Eye className="text-emerald-500"/> 
                          activity_log.db
                       </h3>
                       <p className="text-xs text-zinc-500 font-mono mt-1">Target: {selectedClient?.name} • ID: {selectedClient?.id}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowModal(null)}><X/></Button>
                 </div>
                 
                 <div className="flex-1 overflow-auto bg-[#0c0c0e] custom-scrollbar">
                    {loadingLogs ? (
                       <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500"/>
                          <p>Decrypting logs...</p>
                       </div>
                    ) : clientLogs.length > 0 ? (
                       <table className="w-full text-xs font-mono">
                          <thead className="bg-[#121212] text-zinc-500 sticky top-0 z-10 border-b border-white/5">
                             <tr>
                                <th className="p-4 text-left">TIMESTAMP</th>
                                <th className="p-4 text-left">ACTION</th>
                                <th className="p-4 text-left">DETAILS</th>
                                <th className="p-4 text-left">VALUE</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-zinc-300">
                             {clientLogs.map(log => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                   <td className="p-4 text-zinc-500">{new Date(log.created_at).toLocaleString()}</td>
                                   <td className="p-4"><span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">{log.document_type || 'SYSTEM'}</span></td>
                                   <td className="p-4">{log.details || 'No details provided'}</td>
                                   <td className="p-4 text-white font-bold">{log.price ? `${log.price} DZD` : '-'}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    ) : (
                       <div className="h-full flex items-center justify-center opacity-30">
                          <p>NO DATA FOUND</p>
                       </div>
                    )}
                 </div>
              </Card>

                      ): showModal === 'edit-record' ? (
              <Card className="w-full max-w-sm shadow-2xl border-white/10" noPadding>
                 <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                          <Edit3 className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white">Edit Record</h3>
                          <p className="text-xs text-zinc-500">{selectedRecord?.clientName}</p>
                       </div>
                       <Button variant="ghost" size="icon" className="mr-auto" onClick={() => setShowModal(null)}><X className="w-5 h-5"/></Button>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Revenue (DA)</label>
                          <input 
                             type="number"
                             value={editRecordData.revenue} 
                             onChange={e => setEditRecordData({...editRecordData, revenue: Number(e.target.value)})}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono text-lg font-bold"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Collected Amount (DA)</label>
                          <input 
                             type="number"
                             value={editRecordData.collected} 
                             onChange={e => setEditRecordData({...editRecordData, collected: Number(e.target.value)})}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-emerald-400 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-lg font-bold"
                          />
                       </div>
                       
                       <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-500">Calculated Debt</span>
                             <span className="font-mono font-bold text-amber-500">{(editRecordData.revenue - editRecordData.collected).toLocaleString()} DA</span>
                          </div>
                       </div>

                       <div className="pt-2 flex gap-3">
                          <Button variant="outline" className="flex-1" onClick={() => setShowModal(null)}>Cancel</Button>
                          <Button className="flex-[2]" onClick={handleUpdateRecord}>Update</Button>
                       </div>
                    </div>
                 </div>
              </Card>

           ): showModal === 'export' ? (
              <Card className="w-full max-w-md shadow-2xl border-white/10" noPadding>
                 <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                          <Database className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white">Export Data</h3>
                          <p className="text-xs text-zinc-500">{selectedClient?.name}</p>
                       </div>
                       <Button variant="ghost" size="icon" className="mr-auto" onClick={() => setShowModal(null)}><X className="w-5 h-5"/></Button>
                    </div>
                    
                    {exportLoading && exportTables.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500"/>
                          <p>Scanning database tables...</p>
                       </div>
                    ) : exportTables.length === 0 ? (
                       <div className="text-center py-12 text-zinc-500">
                          <Database className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                          <p>No tables found or no database connected</p>
                       </div>
                    ) : (
                       <>
                          <div className="flex items-center justify-between mb-4">
                             <p className="text-sm text-zinc-400">Select tables to export:</p>
                             <div className="flex gap-2">
                                <button onClick={selectAllTables} className="text-xs text-blue-400 hover:text-blue-300">Select All</button>
                                <span className="text-zinc-600">|</span>
                                <button onClick={deselectAllTables} className="text-xs text-zinc-400 hover:text-zinc-300">Clear</button>
                             </div>
                          </div>
                          
                          <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar mb-6">
                             {exportTables.map(table => (
                                <button
                                   key={table}
                                   onClick={() => toggleTableSelection(table)}
                                   className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                      selectedTables.includes(table) 
                                         ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' 
                                         : 'bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10'
                                   }`}
                                >
                                   {selectedTables.includes(table) ? (
                                      <CheckSquare className="w-5 h-5 text-blue-400"/>
                                   ) : (
                                      <Square className="w-5 h-5"/>
                                   )}
                                   <Table className="w-4 h-4"/>
                                   <span className="font-mono text-sm flex-1 text-right">{table}</span>
                                   <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-500">
                                      {tableRowCounts[table] !== undefined ? `${tableRowCounts[table]} rows` : '...'}
                                   </span>
                                </button>
                             ))}
                          </div>
                          
                          <div className="border-t border-white/5 pt-4">
                             <p className="text-xs text-zinc-500 mb-3">Export format:</p>
                             <div className="grid grid-cols-3 gap-2">
                                <Button 
                                   variant="outline" 
                                   className="flex-col h-auto py-3 gap-1"
                                   onClick={handleExportJSON}
                                   disabled={selectedTables.length === 0 || exportLoading}
                                >
                                   {exportLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileJson className="w-5 h-5 text-amber-400"/>}
                                   <span className="text-[10px]">JSON</span>
                                </Button>
                                <Button 
                                   variant="outline" 
                                   className="flex-col h-auto py-3 gap-1"
                                   onClick={handleExportExcel}
                                   disabled={selectedTables.length === 0 || exportLoading}
                                >
                                   {exportLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileSpreadsheet className="w-5 h-5 text-emerald-400"/>}
                                   <span className="text-[10px]">Excel</span>
                                </Button>
                                <Button 
                                   variant="outline" 
                                   className="flex-col h-auto py-3 gap-1"
                                   onClick={handleSendToBot}
                                   disabled={selectedTables.length === 0 || exportLoading}
                                >
                                   {exportLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 text-blue-400"/>}
                                   <span className="text-[10px]">Telegram</span>
                                </Button>
                             </div>
                          </div>
                          
                          {selectedTables.length > 0 && (
                             <p className="text-center text-xs text-zinc-500 mt-4">
                                {selectedTables.length} table(s) selected
                             </p>
                          )}
                       </>
                    )}
                 </div>
              </Card>

           ): showModal === 'manual-report' ? (
              <Card className="w-full max-w-sm shadow-2xl border-white/10" noPadding>
                 <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-1">Quick Financial Entry</h3>
                    <p className="text-xs text-zinc-500 mb-6">Record profit without creating a full account</p>
                    
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Client Identifier</label>
                          <input 
                             value={tempClientName} 
                             onChange={e => { setTempClientName(e.target.value); setSelectedClient(null); }}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                             placeholder="Enter Name, Phone, or Telegram ID..."
                             autoFocus
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Revenue (DA)</label>
                          <input 
                             type="number"
                             value={manualStats.revenue} 
                             onChange={e => setManualStats({...manualStats, revenue: Number(e.target.value)})}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-lg font-bold"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Collected Amount (DA)</label>
                          <input 
                             type="number"
                             value={manualStats.collected} 
                             onChange={e => setManualStats({...manualStats, collected: Number(e.target.value)})}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-emerald-400 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-lg font-bold"
                          />
                       </div>
                       
                       <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-500">Calculated Debt</span>
                             <span className="font-mono font-bold text-amber-500">{(manualStats.revenue - manualStats.collected).toLocaleString()} DA</span>
                          </div>
                       </div>

                       <div className="pt-2 flex gap-3">
                          <Button variant="outline" className="flex-1" onClick={() => setShowModal(null)}>Cancel</Button>
                          <Button className="flex-[2]" onClick={handleManualReport} disabled={!tempClientName && !selectedClient}>Submit Record</Button>
                       </div>
                    </div>
                 </div>
              </Card>
           ): (
              <Card className="w-full max-w-lg shadow-2xl border-white/10" noPadding>
                 <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6">
                       {showModal === 'add' ? 'New Client' : 'Edit Configuration'}
                    </h3>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Client Name</label>
                          <input 
                             value={formData.name || ''} 
                             onChange={e => setFormData({...formData, name: e.target.value})}
                             className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                             placeholder="Ex: Boutique Ahmed"
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                             <input 
                                value={formData.phone || ''} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                                placeholder="0550..."
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Telegram ID</label>
                             <input 
                                value={formData.telegramChatId || ''} 
                                onChange={e => setFormData({...formData, telegramChatId: e.target.value})}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                                placeholder="Chat ID"
                             />
                          </div>
                       </div>
                       
                       <div className="pt-4 border-t border-white/5">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Database Connection (Optional)</p>
                          <div className="space-y-3">
                              <input 
                                 value={formData.supabaseUrl || ''} 
                                 onChange={e => setFormData({...formData, supabaseUrl: e.target.value})}
                                 className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-zinc-300 text-xs font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
                                 placeholder="Supabase URL (https://...)"
                              />
                              <input 
                                 value={formData.supabaseKey || ''} 
                                 onChange={e => setFormData({...formData, supabaseKey: e.target.value})}
                                 className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-zinc-300 text-xs font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
                                 type="password"
                                 placeholder="Supabase Key"
                              />
                          </div>
                       </div>

                       <div className="pt-4 flex gap-3">
                          <Button variant="outline" className="flex-1" onClick={() => setShowModal(null)}>Cancel</Button>
                          <Button 
                             className="flex-[2]" 
                             onClick={async () => {
                                if (!formData.name) return alert('Name is required');
                                const payload = { ...formData, id: selectedClient?.id || Date.now().toString(), status: 'active' as const } as Client;
                                if (showModal === 'add') await addClient(payload);
                                else await updateClient(payload);
                                await refreshData();
                                setShowModal(null);
                             }}
                          >
                             Save Client
                          </Button>
                       </div>
                    </div>
                 </div>
              </Card>
           )}
        </div>
      )}

    </div>
  );
}

export default App;
