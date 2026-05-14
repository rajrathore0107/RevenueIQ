import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { getSales, addSale, deleteSale, uploadCSV, getForecast, getAnomalies, getAlerts, getInsights, getAIExplanation } from '../api';

const NAV_ITEMS = ['Overview', 'Sales Data', 'Forecast', 'Anomalies', 'Insights', 'Alerts'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [sales, setSales] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loading, setLoading] = useState({});
  const [form, setForm] = useState({ date: '', revenue: '', quantity: '', product: '', category: '' });
  const [forecastDays, setForecastDays] = useState(30);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { 
  loadSales(); 
  loadAlerts(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function loadSales() {
    try {
      const res = await getSales();
      setSales(res.data.sales || []);
    } catch { logout(); }
  }

  async function loadAlerts() {
    try {
      const res = await getAlerts();
      setAlerts(res.data || []);
    } catch {}
  }

  async function handleAddSale(e) {
    e.preventDefault();
    try {
      await addSale(form);
      setForm({ date: '', revenue: '', quantity: '', product: '', category: '' });
      loadSales();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add sale');
    }
  }

  async function handleDeleteSale(id) {
    if (!window.confirm('Delete this record?')) return;
    await deleteSale(id);
    loadSales();
  }

  async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(l => ({...l, csv: true}));
    try {
      const res = await uploadCSV(formData);
      alert(res.data.message);
      loadSales();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    }
    setLoading(l => ({...l, csv: false}));
  }

  async function handleForecast() {
    setLoading(l => ({...l, forecast: true}));
    setForecast(null); setAiExplanation('');
    try {
      const res = await getForecast(forecastDays);
      setForecast(res.data);
      setActiveTab('Forecast');
      const aiRes = await getAIExplanation('revenue_forecast', {
        trend: res.data.trend,
        growth_rate: res.data.growth_rate,
        summary: res.data.summary
      });
      setAiExplanation(aiRes.data.explanation);
    } catch (err) {
      alert(err.response?.data?.message || 'Forecast failed. Need at least 10 records.');
    }
    setLoading(l => ({...l, forecast: false}));
  }

  async function handleAnomalies() {
    setLoading(l => ({...l, anomaly: true}));
    setAnomalies(null);
    try {
      const res = await getAnomalies();
      setAnomalies(res.data);
      setActiveTab('Anomalies');
      loadAlerts();
    } catch (err) {
      alert(err.response?.data?.message || 'Need at least 10 records.');
    }
    setLoading(l => ({...l, anomaly: false}));
  }

  async function handleInsights() {
    setLoading(l => ({...l, insights: true}));
    setInsights(null);
    try {
      const res = await getInsights();
      setInsights(res.data);
      setActiveTab('Insights');
    } catch (err) {
      alert(err.response?.data?.message || 'Need at least 7 records.');
    }
    setLoading(l => ({...l, insights: false}));
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.revenue || 0), 0);
  const avgRevenue = sales.length ? totalRevenue / sales.length : 0;
  const chartData = [...sales].reverse().slice(0, 30).map(s => ({
    date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(s.revenue)
  }));

  return (
    <div style={s.app}>
      <aside style={s.sidebar}>
        <div style={s.brand}>RevenueIQ</div>
        <div style={s.bizName}>{user.businessName}</div>
        <div style={s.bizType}>{user.businessType}</div>
        <nav style={s.nav}>
          {NAV_ITEMS.map(item => (
            <button key={item} style={{...s.navBtn, ...(activeTab === item ? s.navActive : {})}}
              onClick={() => setActiveTab(item)}>{item}</button>
          ))}
        </nav>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </aside>

      <main style={s.main}>
        {activeTab === 'Overview' && (
          <div>
            <h1 style={s.pageTitle}>Overview</h1>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statVal}>₹{totalRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                <div style={s.statLabel}>Total Revenue</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>{sales.length}</div>
                <div style={s.statLabel}>Total Records</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>₹{avgRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                <div style={s.statLabel}>Avg Daily Revenue</div>
              </div>
              <div style={s.statCard}>
                <div style={{...s.statVal, color: alerts.filter(a => !a.is_read).length > 0 ? '#f87171' : '#4ade80'}}>
                  {alerts.filter(a => !a.is_read).length}
                </div>
                <div style={s.statLabel}>Unread Alerts</div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>Revenue Trend (Last 30 days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e"/>
                    <XAxis dataKey="date" stroke="#475569" fontSize={12}/>
                    <YAxis stroke="#475569" fontSize={12}/>
                    <Tooltip contentStyle={{background:'#13131a', border:'1px solid #1e1e2e', borderRadius:'8px', color:'#e2e8f0'}}/>
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={s.actionGrid}>
              <div style={s.actionCard}>
                <h3 style={s.actionTitle}>Run Forecast</h3>
                <p style={s.actionDesc}>Predict future revenue using AI</p>
                <select style={s.select} value={forecastDays} onChange={e => setForecastDays(Number(e.target.value))}>
                  <option value={7}>Next 7 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
                <button style={s.actionBtn} onClick={handleForecast} disabled={loading.forecast}>
                  {loading.forecast ? 'Forecasting...' : 'Generate Forecast'}
                </button>
              </div>
              <div style={s.actionCard}>
                <h3 style={s.actionTitle}>Detect Anomalies</h3>
                <p style={s.actionDesc}>Find unusual patterns in your data</p>
                <button style={{...s.actionBtn, background: '#f59e0b'}} onClick={handleAnomalies} disabled={loading.anomaly}>
                  {loading.anomaly ? 'Detecting...' : 'Detect Anomalies'}
                </button>
              </div>
              <div style={s.actionCard}>
                <h3 style={s.actionTitle}>Business Insights</h3>
                <p style={s.actionDesc}>Get detailed performance analysis</p>
                <button style={{...s.actionBtn, background: '#10b981'}} onClick={handleInsights} disabled={loading.insights}>
                  {loading.insights ? 'Analyzing...' : 'Get Insights'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Sales Data' && (
          <div>
            <h1 style={s.pageTitle}>Sales Data</h1>
            <div style={s.twoCol}>
              <div style={s.formCard}>
                <h3 style={s.cardTitle}>Add Record</h3>
                <form onSubmit={handleAddSale} style={s.form}>
                  <input style={s.input} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required/>
                  <input style={s.input} type="number" placeholder="Revenue (₹)" value={form.revenue} onChange={e => setForm({...form, revenue: e.target.value})} required/>
                  <input style={s.input} type="number" placeholder="Quantity (optional)" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}/>
                  <input style={s.input} type="text" placeholder="Product (optional)" value={form.product} onChange={e => setForm({...form, product: e.target.value})}/>
                  <input style={s.input} type="text" placeholder="Category (optional)" value={form.category} onChange={e => setForm({...form, category: e.target.value})}/>
                  <button style={s.submitBtn} type="submit">Add Record</button>
                </form>
              </div>
              <div style={s.formCard}>
                <h3 style={s.cardTitle}>Upload CSV</h3>
                <p style={s.hint}>CSV must have date and revenue columns. Quantity column optional.</p>
                <div style={s.csvBox}>
                  <input type="file" accept=".csv" onChange={handleCSVUpload} style={{display:'none'}} id="csvInput"/>
                  <label htmlFor="csvInput" style={s.csvLabel}>
                    {loading.csv ? 'Uploading...' : 'Click to upload CSV'}
                  </label>
                </div>
                <div style={{marginTop:'16px'}}>
                  <p style={s.hint}>Sample CSV format:</p>
                  <pre style={s.code}>date,revenue,quantity{'\n'}2024-01-01,5000,50{'\n'}2024-01-02,6200,62</pre>
                </div>
              </div>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.cardTitle}>Records ({sales.length})</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Date','Revenue','Quantity','Product','Category','Action'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 50).map(sale => (
                      <tr key={sale.id}>
                        <td style={s.td}>{new Date(sale.date).toLocaleDateString('en-IN')}</td>
                        <td style={{...s.td, color:'#4ade80'}}>₹{parseFloat(sale.revenue).toLocaleString('en-IN')}</td>
                        <td style={s.td}>{sale.quantity || '-'}</td>
                        <td style={s.td}>{sale.product || '-'}</td>
                        <td style={s.td}>{sale.category || '-'}</td>
                        <td style={s.td}>
                          <button style={s.deleteBtn} onClick={() => handleDeleteSale(sale.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Forecast' && forecast && (
          <div>
            <h1 style={s.pageTitle}>Revenue Forecast</h1>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={{...s.statVal, color: forecast.trend === 'growing' ? '#4ade80' : forecast.trend === 'declining' ? '#f87171' : '#f59e0b'}}>
                  {forecast.trend?.toUpperCase()}
                </div>
                <div style={s.statLabel}>Trend</div>
              </div>
              <div style={s.statCard}>
                <div style={{...s.statVal, color: forecast.growth_rate > 0 ? '#4ade80' : '#f87171'}}>
                  {forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate}%
                </div>
                <div style={s.statLabel}>Growth Rate</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>{forecast.best_period}</div>
                <div style={s.statLabel}>Best Day</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>{forecast.worst_period}</div>
                <div style={s.statLabel}>Worst Day</div>
              </div>
            </div>

            {aiExplanation && (
              <div style={s.aiCard}>
                <div style={s.aiBadge}>AI Insight</div>
                <p style={s.aiText}>{aiExplanation}</p>
              </div>
            )}

            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>Forecast ({forecast.forecast?.length} days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecast.forecast?.slice(0, 30)}>
                  <defs>
                    <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e"/>
                  <XAxis dataKey="date" stroke="#475569" fontSize={11}/>
                  <YAxis stroke="#475569" fontSize={11}/>
                  <Tooltip contentStyle={{background:'#13131a', border:'1px solid #1e1e2e', borderRadius:'8px', color:'#e2e8f0'}}/>
                  <Area type="monotone" dataKey="upper_bound" stroke="none" fill="#a78bfa" fillOpacity={0.1}/>
                  <Area type="monotone" dataKey="predicted" stroke="#a78bfa" fill="url(#fc)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#a78bfa" fillOpacity={0.1}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'Anomalies' && anomalies && (
          <div>
            <h1 style={s.pageTitle}>Anomaly Detection</h1>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={{...s.statVal, color: anomalies.total_anomalies > 0 ? '#f87171' : '#4ade80'}}>
                  {anomalies.total_anomalies}
                </div>
                <div style={s.statLabel}>Anomalies Found</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>{anomalies.anomaly_rate}%</div>
                <div style={s.statLabel}>Anomaly Rate</div>
              </div>
            </div>
            <div style={s.aiCard}>
              <div style={{...s.aiBadge, background:'#f59e0b22', color:'#f59e0b'}}>Summary</div>
              <p style={s.aiText}>{anomalies.summary}</p>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>Revenue with Anomalies Highlighted</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={anomalies.anomalies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e"/>
                  <XAxis dataKey="date" stroke="#475569" fontSize={11}/>
                  <YAxis stroke="#475569" fontSize={11}/>
                  <Tooltip contentStyle={{background:'#13131a', border:'1px solid #1e1e2e', borderRadius:'8px', color:'#e2e8f0'}}
                    formatter={(val, name, props) => [
                      `₹${val.toLocaleString('en-IN')}${props.payload.is_anomaly ? ' ⚠️' : ''}`,
                      'Revenue'
                    ]}/>
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={s.tableCard}>
              <h3 style={s.cardTitle}>Detected Anomalies</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Date','Revenue','Deviation','Message'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.anomalies?.filter(a => a.is_anomaly).map((a, i) => (
                      <tr key={i}>
                        <td style={s.td}>{a.date}</td>
                        <td style={{...s.td, color:'#f87171'}}>₹{a.revenue.toLocaleString('en-IN')}</td>
                        <td style={{...s.td, color: a.deviation_percent > 0 ? '#4ade80' : '#f87171'}}>
                          {a.deviation_percent > 0 ? '+' : ''}{a.deviation_percent}%
                        </td>
                        <td style={s.td}>{a.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Insights' && insights && (
          <div>
            <h1 style={s.pageTitle}>Business Insights</h1>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statVal}>₹{insights.overview?.total_revenue?.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                <div style={s.statLabel}>Total Revenue</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>₹{insights.overview?.average_daily_revenue?.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                <div style={s.statLabel}>Avg Daily Revenue</div>
              </div>
              <div style={s.statCard}>
                <div style={{...s.statVal, color: insights.performance?.week_over_week_growth > 0 ? '#4ade80' : '#f87171'}}>
                  {insights.performance?.week_over_week_growth > 0 ? '+' : ''}{insights.performance?.week_over_week_growth}%
                </div>
                <div style={s.statLabel}>Week over Week</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal}>{insights.consistency?.rating}</div>
                <div style={s.statLabel}>Revenue Consistency</div>
              </div>
            </div>

            <div style={s.twoCol}>
              <div style={s.formCard}>
                <h3 style={s.cardTitle}>Best & Worst Days</h3>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Best Weekday</span>
                  <span style={{color:'#4ade80', fontWeight:'600'}}>{insights.performance?.best_weekday}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Worst Weekday</span>
                  <span style={{color:'#f87171', fontWeight:'600'}}>{insights.performance?.worst_weekday}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Best Day</span>
                  <span style={{color:'#4ade80'}}>{insights.performance?.best_day?.date}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Best Revenue</span>
                  <span style={{color:'#4ade80'}}>₹{insights.performance?.best_day?.revenue?.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div style={s.formCard}>
                <h3 style={s.cardTitle}>Day of Week Performance</h3>
                {insights.day_of_week_performance && Object.entries(insights.day_of_week_performance)
                  .sort((a, b) => b[1] - a[1])
                  .map(([day, avg]) => (
                    <div key={day} style={s.infoRow}>
                      <span style={s.infoLabel}>{day}</span>
                      <span style={{color:'#a78bfa'}}>₹{avg.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div style={s.formCard}>
              <h3 style={s.cardTitle}>Recommendations</h3>
              {insights.recommendations?.map((rec, i) => (
                <div key={i} style={{...s.recCard, borderColor: rec.priority === 'high' ? '#f87171' : rec.priority === 'medium' ? '#f59e0b' : '#4ade80'}}>
                  <span style={{...s.recBadge, background: rec.priority === 'high' ? '#f8717122' : rec.priority === 'medium' ? '#f59e0b22' : '#4ade8022',
                    color: rec.priority === 'high' ? '#f87171' : rec.priority === 'medium' ? '#f59e0b' : '#4ade80'}}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <p style={{color:'#cbd5e1', fontSize:'14px', marginTop:'6px'}}>{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Alerts' && (
          <div>
            <h1 style={s.pageTitle}>Alerts</h1>
            {alerts.length === 0 ? (
              <div style={s.empty}>No alerts yet. Run anomaly detection to generate alerts.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{...s.alertCard, opacity: alert.is_read ? 0.6 : 1,
                    borderColor: alert.severity === 'high' ? '#f87171' : '#f59e0b'}}>
                    <div style={s.alertHeader}>
                      <span style={{...s.recBadge, background: alert.severity === 'high' ? '#f8717122' : '#f59e0b22',
                        color: alert.severity === 'high' ? '#f87171' : '#f59e0b'}}>
                        {alert.severity?.toUpperCase()}
                      </span>
                      <span style={{color:'#64748b', fontSize:'13px'}}>{alert.date}</span>
                    </div>
                    <p style={{color:'#cbd5e1', fontSize:'14px', marginTop:'6px'}}>{alert.message}</p>
                    <p style={{color:'#64748b', fontSize:'13px', marginTop:'4px'}}>Revenue: ₹{parseFloat(alert.revenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  app: { display: 'flex', minHeight: '100vh', background: '#0a0a0f' },
  sidebar: { width: '220px', background: '#13131a', borderRight: '1px solid #1e1e2e', padding: '24px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand: { fontSize: '22px', fontWeight: '700', color: '#6366f1', fontFamily: 'Space Grotesk', marginBottom: '4px' },
  bizName: { fontSize: '13px', color: '#e2e8f0', fontWeight: '500', marginBottom: '2px' },
  bizType: { fontSize: '11px', color: '#475569', textTransform: 'capitalize', marginBottom: '32px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navBtn: { background: 'transparent', border: 'none', color: '#64748b', padding: '10px 12px', borderRadius: '8px', textAlign: 'left', fontSize: '14px', cursor: 'pointer' },
  navActive: { background: '#6366f122', color: '#a5b4fc' },
  logoutBtn: { background: 'transparent', border: '1px solid #1e1e2e', color: '#64748b', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', marginTop: '16px' },
  main: { flex: 1, padding: '32px', overflowY: 'auto' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'Space Grotesk', marginBottom: '24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  statVal: { fontSize: '24px', fontWeight: '700', color: '#a5b4fc', fontFamily: 'Space Grotesk', marginBottom: '4px' },
  statLabel: { fontSize: '12px', color: '#475569' },
  chartCard: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  chartTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  actionCard: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px' },
  actionTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' },
  actionDesc: { fontSize: '13px', color: '#475569', marginBottom: '16px' },
  actionBtn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: '600', width: '100%', marginTop: '8px' },
  select: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '14px', width: '100%' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  formCard: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px' },
  cardTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none' },
  submitBtn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: '600' },
  hint: { color: '#475569', fontSize: '13px', marginBottom: '12px', lineHeight: '1.5' },
  csvBox: { border: '2px dashed #1e1e2e', borderRadius: '8px', padding: '32px', textAlign: 'center' },
  csvLabel: { color: '#6366f1', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  code: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' },
  tableCard: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#475569', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #1e1e2e', textTransform: 'uppercase' },
  td: { padding: '10px 12px', color: '#cbd5e1', fontSize: '14px', borderBottom: '1px solid #0d0d14' },
  deleteBtn: { background: '#f8717122', color: '#f87171', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px' },
  aiCard: { background: '#6366f111', border: '1px solid #6366f133', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  aiText: { color: '#cbd5e1', fontSize: '14px', lineHeight: '1.7', marginTop: '8px' },
  aiBadge: { background: '#6366f133', color: '#a5b4fc', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', display: 'inline-block' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0d0d14' },
  infoLabel: { color: '#64748b', fontSize: '14px' },
  recCard: { background: '#13131a', border: '1px solid', borderRadius: '8px', padding: '14px', marginBottom: '10px' },
  recBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px' },
  alertCard: { background: '#13131a', border: '1px solid', borderRadius: '12px', padding: '16px' },
  alertHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#475569', padding: '60px', fontSize: '15px' },
};