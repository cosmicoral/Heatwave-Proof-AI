import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const config = window.__QUICK_DAPP_CONFIG__ || {};
const CONTRACT_ADDRESS = config.contractAddress || '0x0000000000000000000000000000000000000000';

const ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "internalType": "string", "name": "fieldName", "type": "string" }], "name": "EmptyStringNotAllowed", "type": "error" },
  { "inputs": [{ "internalType": "uint8", "name": "provided", "type": "uint8" }], "name": "HumidityOutOfRange", "type": "error" },
  { "inputs": [], "name": "InvalidOwnerAddress", "type": "error" },
  { "inputs": [], "name": "NoAlertsPublished", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "inputs": [{ "internalType": "uint8", "name": "provided", "type": "uint8" }], "name": "RiskLevelOutOfRange", "type": "error" },
  { "inputs": [{ "internalType": "uint8", "name": "provided", "type": "uint8" }], "name": "UvIndexOutOfRange", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "string", "name": "city", "type": "string" }, { "indexed": false, "internalType": "uint8", "name": "riskLevel", "type": "uint8" }, { "indexed": false, "internalType": "int256", "name": "temperature", "type": "int256" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "publisher", "type": "address" }], "name": "HeatwaveAlertPublished", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferredTo", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "city", "type": "string" }], "name": "getAlertsByCity", "outputs": [{ "components": [{ "internalType": "string", "name": "city", "type": "string" }, { "internalType": "int256", "name": "temperature", "type": "int256" }, { "internalType": "uint8", "name": "humidity", "type": "uint8" }, { "internalType": "uint8", "name": "uvIndex", "type": "uint8" }, { "internalType": "uint8", "name": "riskLevel", "type": "uint8" }, { "internalType": "string", "name": "safetyAdvice", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "address", "name": "publisher", "type": "address" }], "internalType": "struct HeatwaveProof.Alert[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getLatestAlert", "outputs": [{ "components": [{ "internalType": "string", "name": "city", "type": "string" }, { "internalType": "int256", "name": "temperature", "type": "int256" }, { "internalType": "uint8", "name": "humidity", "type": "uint8" }, { "internalType": "uint8", "name": "uvIndex", "type": "uint8" }, { "internalType": "uint8", "name": "riskLevel", "type": "uint8" }, { "internalType": "string", "name": "safetyAdvice", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "address", "name": "publisher", "type": "address" }], "internalType": "struct HeatwaveProof.Alert", "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getTotalAlerts", "outputs": [{ "internalType": "uint256", "name": "count", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "string", "name": "city", "type": "string" }, { "internalType": "int256", "name": "temperature", "type": "int256" }, { "internalType": "uint8", "name": "humidity", "type": "uint8" }, { "internalType": "uint8", "name": "uvIndex", "type": "uint8" }, { "internalType": "uint8", "name": "riskLevel", "type": "uint8" }, { "internalType": "string", "name": "safetyAdvice", "type": "string" }], "name": "publishAlert", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  1: { label: 'Low',       bg: 'bg-green-600',      text: 'text-green-100',  border: 'border-green-500',  glow: '#22c55e' },
  2: { label: 'Moderate',  bg: 'bg-yellow-500',     text: 'text-yellow-950', border: 'border-yellow-400', glow: '#eab308' },
  3: { label: 'High',      bg: 'bg-orange-500',     text: 'text-orange-100', border: 'border-orange-400', glow: '#f97316' },
  4: { label: 'Very High', bg: 'bg-red-600',        text: 'text-red-100',    border: 'border-red-500',    glow: '#ef4444' },
  5: { label: 'Extreme',   bg: 'bg-red-950',        text: 'text-red-200',    border: 'border-red-900',    glow: '#7f1d1d' },
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  const ms = typeof ts === 'bigint' ? Number(ts) * 1000 : Number(ts) * 1000;
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatTemp(raw) {
  if (raw === undefined || raw === null) return '—';
  const n = typeof raw === 'bigint' ? Number(raw) : Number(raw);
  return (n / 10).toFixed(1);
}

function RiskBadge({ level }) {
  const r = RISK_CONFIG[level] || RISK_CONFIG[1];
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${r.bg} ${r.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 inline-block"></span>
      {r.label}
    </span>
  );
}

function AlertCard({ alert, isLatest }) {
  const risk = Number(alert.riskLevel);
  const rc = RISK_CONFIG[risk] || RISK_CONFIG[1];
  return (
    <div
      className="rounded-xl border border-orange-900/40 bg-[#181818] p-5 space-y-4 transition-all duration-300 hover:border-orange-500/60"
      style={{ boxShadow: `0 0 18px 0 ${rc.glow}22` }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xl">🌡️</span>
            <h3 className="text-lg font-bold text-white tracking-wide">{alert.city}</h3>
            {isLatest && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 border border-orange-600/40 ml-1">
                Latest
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(alert.timestamp)}</p>
        </div>
        <RiskBadge level={risk} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Temperature" value={`${formatTemp(alert.temperature)}°C`} icon="🌡️" />
        <StatBox label="Humidity" value={`${Number(alert.humidity)}%`} icon="💧" />
        <StatBox label="UV Index" value={`${Number(alert.uvIndex)}`} icon="☀️" />
      </div>

      {alert.safetyAdvice && (
        <div className="rounded-lg bg-[#1e1e1e] border border-orange-900/30 px-4 py-3">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">⚠️ Safety Advice</p>
          <p className="text-sm text-gray-300 leading-relaxed">{alert.safetyAdvice}</p>
        </div>
      )}

      <p className="text-[10px] text-gray-600 font-mono truncate">Publisher: {alert.publisher}</p>
    </div>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div className="rounded-lg bg-[#111] border border-gray-800 px-3 py-2 text-center">
      <p className="text-base">{icon}</p>
      <p className="text-base font-bold text-white mt-0.5">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────

export default function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contractOwner, setContractOwner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const [totalAlerts, setTotalAlerts] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState('');

  // Admin form
  const [form, setForm] = useState({
    city: '', temperature: '', humidity: '', uvIndex: '', riskLevel: '1', safetyAdvice: ''
  });
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null); // {type:'success'|'error', msg}

  // City search
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isPlaceholder = CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000';

  // ── Connect & listen ──────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const s = await provider.getSigner();
    const addr = await s.getAddress();
    setSigner(s);
    setAccount(addr);
    return { provider, signer: s, addr };
  }, []);

  const refreshOwnerCheck = useCallback(async (addr, s) => {
    if (isPlaceholder) return;
    try {
      const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, s);
      const o = await readContract.owner();
      setContractOwner(o);
      setIsOwner(o.toLowerCase() === addr.toLowerCase());
    } catch (e) {
      console.error('owner check failed', e);
    }
  }, [isPlaceholder]);

  const loadPublicData = useCallback(async (s) => {
    if (isPlaceholder || !s) return;
    setLoadingPublic(true);
    setPublicError('');
    try {
      const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, s);
      const [total, latest] = await Promise.all([
        c.getTotalAlerts(),
        c.getLatestAlert().catch(() => null),
      ]);
      setTotalAlerts(Number(total));
      setLatestAlert(latest);
    } catch (e) {
      setPublicError('Failed to load alert data. Make sure the contract is deployed.');
    } finally {
      setLoadingPublic(false);
    }
  }, [isPlaceholder]);

  useEffect(() => {
    (async () => {
      try {
        const { signer: s, addr } = await connect();
        await refreshOwnerCheck(addr, s);
        await loadPublicData(s);
      } catch (e) {
        console.error('auto-connect failed', e);
      }
    })();

    if (window.ethereum) {
      const handler = async (accounts) => {
        if (accounts.length === 0) {
          setAccount(null); setSigner(null); setIsOwner(false);
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const s = await provider.getSigner();
        const addr = await s.getAddress();
        setSigner(s);
        setAccount(addr);
        await refreshOwnerCheck(addr, s);
        await loadPublicData(s);
      };
      window.ethereum.on('accountsChanged', handler);
      return () => window.ethereum.removeListener('accountsChanged', handler);
    }
  }, []);

  // ── Publish Alert ─────────────────────────────────────────────────────────

  const handlePublish = async (e) => {
    e.preventDefault();
    setPublishing(true);
    setPublishStatus(null);
    try {
      const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tempRaw = Math.round(parseFloat(form.temperature) * 10);
      const tx = await c.publishAlert(
        form.city,
        BigInt(tempRaw),
        parseInt(form.humidity),
        parseInt(form.uvIndex),
        parseInt(form.riskLevel),
        form.safetyAdvice
      );
      setPublishStatus({ type: 'pending', msg: `Transaction sent: ${tx.hash.slice(0, 10)}…` });
      await tx.wait();
      setPublishStatus({ type: 'success', msg: '✅ Alert published successfully!' });
      setForm({ city: '', temperature: '', humidity: '', uvIndex: '', riskLevel: '1', safetyAdvice: '' });
      await loadPublicData(signer);
    } catch (err) {
      const msg = err?.reason || err?.message || 'Transaction failed';
      setPublishStatus({ type: 'error', msg: `❌ ${msg}` });
    } finally {
      setPublishing(false);
    }
  };

  // ── City Search ───────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchCity.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults(null);
    try {
      const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const results = await c.getAlertsByCity(searchCity.trim());
      setSearchResults(results);
    } catch (err) {
      setSearchError('Search failed. Check the city name and try again.');
    } finally {
      setSearching(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100">
      {/* Header */}
      <header className="border-b border-orange-900/40 bg-[#0d0d0d]/95 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                {config.title || 'HeatwaveProof'}
              </h1>
              <p className="text-[10px] text-orange-500 uppercase tracking-widest font-semibold">Emergency Alert System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalAlerts !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/50 border border-orange-800/40">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-xs text-orange-400 font-semibold">{totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}</span>
              </div>
            )}
            {account ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs font-mono text-gray-300">{account.slice(0, 6)}…{account.slice(-4)}</span>
                {isOwner && <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
              </div>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* Placeholder Banner */}
        {isPlaceholder && (
          <div className="rounded-xl border border-yellow-700/50 bg-yellow-950/30 px-5 py-4 flex gap-3 items-start">
            <span className="text-yellow-400 text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-yellow-300 font-bold text-sm">Contract Not Deployed Yet</p>
              <p className="text-yellow-600 text-xs mt-1">
                Deploy the <span className="font-mono">HeatwaveProof</span> contract and update the address in <span className="font-mono">dapp.config.json</span> or the source code to activate this DApp.
              </p>
            </div>
          </div>
        )}

        {/* ── Admin Panel ── */}
        {isOwner && (
          <section>
            <SectionHeader icon="🚨" title="Publish Alert" subtitle="Admin Panel — Owner Only" accent="orange" />
            <form onSubmit={handlePublish} className="rounded-xl border border-orange-900/50 bg-[#181818] p-6 space-y-5"
              style={{ boxShadow: '0 0 30px 0 #ff6b3511' }}>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City" required>
                  <input
                    type="text"
                    placeholder="e.g. Phoenix"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                    className="input-base"
                  />
                </Field>
                <Field label="Temperature (°C)" required hint="Decimals allowed — e.g. 37.5">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.5"
                    value={form.temperature}
                    onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
                    required
                    className="input-base"
                  />
                </Field>
                <Field label="Humidity (%)" required hint="0 – 100">
                  <input
                    type="number"
                    min="0" max="100"
                    placeholder="65"
                    value={form.humidity}
                    onChange={e => setForm(f => ({ ...f, humidity: e.target.value }))}
                    required
                    className="input-base"
                  />
                </Field>
                <Field label="UV Index" required hint="0 – 20">
                  <input
                    type="number"
                    min="0" max="20"
                    placeholder="11"
                    value={form.uvIndex}
                    onChange={e => setForm(f => ({ ...f, uvIndex: e.target.value }))}
                    required
                    className="input-base"
                  />
                </Field>
              </div>

              <Field label="Risk Level" required>
                <select
                  value={form.riskLevel}
                  onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}
                  className="input-base"
                >
                  <option value="1">1 — Low</option>
                  <option value="2">2 — Moderate</option>
                  <option value="3">3 — High</option>
                  <option value="4">4 — Very High</option>
                  <option value="5">5 — Extreme</option>
                </select>
              </Field>

              <Field label="Safety Advice" required>
                <textarea
                  rows={3}
                  placeholder="Avoid outdoor activities between 11am–4pm. Stay hydrated. Seek air-conditioned spaces."
                  value={form.safetyAdvice}
                  onChange={e => setForm(f => ({ ...f, safetyAdvice: e.target.value }))}
                  required
                  className="input-base resize-none"
                />
              </Field>

              {publishStatus && (
                <div className={`rounded-lg px-4 py-3 text-sm font-medium border ${
                  publishStatus.type === 'success'
                    ? 'bg-green-950/50 border-green-700/50 text-green-300'
                    : publishStatus.type === 'pending'
                    ? 'bg-blue-950/50 border-blue-700/50 text-blue-300'
                    : 'bg-red-950/50 border-red-700/50 text-red-300'
                }`}>
                  {publishStatus.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={publishing || isPlaceholder}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200
                  bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500
                  text-white disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-orange-900/30 hover:shadow-orange-700/40"
              >
                {publishing ? '⏳ Publishing…' : '🚨 Publish Heatwave Alert'}
              </button>
            </form>
          </section>
        )}

        {/* ── Public Panel ── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <SectionHeader icon="📋" title="View Alerts" subtitle="Live On-Chain Data" accent="red" />
            <div className="flex items-center gap-2">
              {totalAlerts !== null && (
                <span className="text-sm text-gray-400">
                  <span className="text-orange-400 font-bold">{totalAlerts}</span> total alert{totalAlerts !== 1 ? 's' : ''} on-chain
                </span>
              )}
              <button
                onClick={() => loadPublicData(signer)}
                disabled={loadingPublic || !signer}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] border border-gray-700 text-gray-300 hover:border-orange-700 hover:text-orange-400 transition-colors disabled:opacity-40"
              >
                {loadingPublic ? '⟳ Loading…' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {publicError && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {publicError}
            </div>
          )}

          {/* Latest Alert */}
          {loadingPublic ? (
            <SkeletonCard />
          ) : latestAlert && latestAlert.city ? (
            <AlertCard alert={latestAlert} isLatest={true} />
          ) : !isPlaceholder && !loadingPublic && totalAlerts === 0 ? (
            <EmptyState message="No alerts published yet." />
          ) : null}

          {/* City Search */}
          <div className="rounded-xl border border-gray-800 bg-[#181818] p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <span>🔍</span> Search Alerts by City
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter city name…"
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="input-base flex-1"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !signer || !searchCity.trim()}
                className="px-5 py-2.5 rounded-lg bg-orange-700 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {searching ? '⟳' : 'Search'}
              </button>
            </div>

            {searchError && (
              <p className="text-sm text-red-400">{searchError}</p>
            )}

            {searchResults !== null && (
              <div className="space-y-3 pt-1">
                {searchResults.length === 0 ? (
                  <EmptyState message={`No alerts found for "${searchCity}".`} />
                ) : (
                  <>
                    <p className="text-xs text-gray-500">{searchResults.length} alert{searchResults.length !== 1 ? 's' : ''} found for <span className="text-orange-400 font-semibold">"{searchCity}"</span></p>
                    {[...searchResults].reverse().map((alert, i) => (
                      <AlertCard key={i} alert={alert} isLatest={false} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-16 py-6 text-center">
        <p className="text-xs text-gray-700">
          {config.title || 'HeatwaveProof'} · On-Chain Emergency Alert System
        </p>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, accent }) {
  const colors = {
    orange: 'text-orange-500',
    red: 'text-red-500',
  };
  return (
    <div className="mb-4">
      <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${colors[accent] || 'text-white'}`}>
        <span>{icon}</span> {title}
      </h2>
      <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5 ml-7">{subtitle}</p>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
        {hint && <span className="ml-2 text-gray-600 normal-case font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-800 bg-[#111] px-6 py-10 text-center">
      <p className="text-3xl mb-2">🌤️</p>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#181818] p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-gray-800"></div>
          <div className="h-3 w-24 rounded bg-gray-800"></div>
        </div>
        <div className="h-6 w-20 rounded-full bg-gray-800"></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg bg-[#111] border border-gray-800 px-3 py-4"></div>
        ))}
      </div>
      <div className="rounded-lg bg-[#111] border border-gray-800 px-4 py-6"></div>
    </div>
  );
}
