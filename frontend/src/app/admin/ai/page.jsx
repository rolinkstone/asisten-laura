'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  Search,
  Loader2,
  ShieldCheck,
  KeyRound,
  Save,
  Check,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api, getToken, getUserRole } from '../../../lib/api';
import {
  Card,
  Button,
  Input,
  Badge,
  Spinner,
  ErrorBox,
  PageHeader
} from '../../../components/admin/ui';

const PROVIDERS = [
  { name: 'openai', label: 'OpenAI' },
  { name: 'gemini', label: 'Gemini' },
  { name: 'deepseek', label: 'DeepSeek' }
];

export default function AiPage() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/admin/config', { token: getToken() })
      .then((res) => {
        setConfig(res.data);
        setForm({
          enabled: res.data.enabled,
          providerOrder: (res.data.providerOrder || []).join(', '),
          models: res.data.models || {},
          keys: { openai: '', gemini: '', deepseek: '' }
        });
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    // Halaman AI (API key) khusus admin — arahkan non-admin ke Dashboard
    if (getUserRole() !== 'admin') {
      router.replace('/admin');
      return;
    }
    load();
  }, []);

  const saveLlm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const body = {
        enabled: form.enabled,
        providerOrder: form.providerOrder,
        openai_model: form.models.openai,
        gemini_model: form.models.gemini,
        deepseek_model: form.models.deepseek
      };
      // API key baru hanya dikirim bila diisi (hapus key pakai tombol terpisah)
      for (const p of PROVIDERS) {
        if (form.keys[p.name]) body[`${p.name}_api_key`] = form.keys[p.name];
      }
      await api('/admin/llm-config', { method: 'POST', body, token: getToken() });
      setSaved('Pengaturan LLM disimpan & langsung berlaku.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hapus API key → nonaktifkan provider (override .env), langsung tanpa tombol simpan
  const removeKey = async (name) => {
    const label = name.toUpperCase();
    if (
      !confirm(
        `Hapus API key ${label}? Provider akan dinonaktifkan (mengabaikan nilai .env). Anda bisa mengisi ulang key baru kapan saja.`
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    setSaved('');
    try {
      await api('/admin/llm-config', {
        method: 'POST',
        body: { [`${name}_api_key`]: '' },
        token: getToken()
      });
      setSaved(`API key ${label} dihapus. Provider ${label} dinonaktifkan.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setResults(null);
    setError('');
    try {
      const res = await api('/rag/search', {
        method: 'POST',
        body: { query, limit: 5 },
        token: getToken()
      });
      setResults(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  if (error && !config) {
    return (
      <div>
        <PageHeader title="AI — Model & RAG" subtitle="Kelola LLM dan uji coba retrieval" />
        <ErrorBox message={error} />
        <div className="mt-4">
          <Button variant="outline" onClick={load}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!config || !form) return <Spinner />;

  return (
    <div>
      <PageHeader title="AI — Model & RAG" subtitle="Kelola LLM dan uji coba retrieval" />

      <ErrorBox message={error} />
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center gap-2">
          <Check size={16} /> {saved}
        </div>
      )}

      {/* ===== Pengaturan LLM ===== */}
      <Card className="p-5 mb-8">
        <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Cpu size={16} /> Pengaturan LLM
          <Badge color={form.enabled ? 'green' : 'red'}>{form.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
        </h2>

        <form onSubmit={saveLlm} className="space-y-6">
          {/* Toggle aktif/nonaktif */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Aktifkan LLM (jawaban AI)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Nonaktifkan untuk sementara: chat tetap berjalan dengan sumber Knowledge Base tanpa jawaban model AI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              className={`relative w-12 h-7 rounded-full transition shrink-0 ${
                form.enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-transform ${
                  form.enabled ? 'translate-x-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Urutan provider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Urutan Provider <span className="text-slate-400">(pisahkan dengan koma)</span>
            </label>
            <Input
              value={form.providerOrder}
              onChange={(e) => setForm((f) => ({ ...f, providerOrder: e.target.value }))}
              placeholder="mis. deepseek, gemini"
            />
            <p className="text-xs text-slate-400 mt-1">
              Provider pertama dipakai utama; berikutnya sebagai cadangan saat utama gagal/limit.
            </p>
          </div>

          {/* Per provider */}
          <div className="space-y-4">
            {PROVIDERS.map((p) => {
              const configured = config.configured?.[p.name];
              return (
                <div key={p.name} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-slate-800">{p.label}</p>
                    <Badge color={configured ? 'green' : 'red'}>
                      {configured ? '✓ API key tersimpan' : 'Belum ada API key'}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                      <Input
                        value={form.models[p.name] || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            models: { ...f.models, [p.name]: e.target.value }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                      <div className="flex gap-1.5">
                        <Input
                          type="password"
                          value={form.keys[p.name]}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              keys: { ...f.keys, [p.name]: e.target.value }
                            }))
                          }
                          placeholder={
                            configured ? '•••••••• (biarkan kosong = tidak diubah)' : 'Isi API key baru...'
                          }
                        />
                        {configured && (
                          <button
                            type="button"
                            onClick={() => removeKey(p.name)}
                            className="px-2.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                            title="Hapus API key (nonaktifkan provider)"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
            <span className="text-xs text-slate-400">
              Berlaku langsung tanpa restart server.
            </span>
          </div>
        </form>
      </Card>

      {/* ===== Status ===== */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <KeyRound size={16} /> Status LLM
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="Status" value={form.enabled ? 'Aktif' : 'Nonaktif'} badge={form.enabled ? 'Aktif' : 'Nonaktif'} badgeColor={form.enabled ? 'green' : 'red'} />
            <Row label="Urutan Provider" value={config.providerOrder.join(' → ') || '-'} />
            {PROVIDERS.map((p) => (
              <Row
                key={p.name}
                label={`${p.label}`}
                value={config.models?.[p.name] || '-'}
                badge={config.configured?.[p.name] ? '✓ Key' : '✗ Tanpa key'}
                badgeColor={config.configured?.[p.name] ? 'green' : 'red'}
              />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} /> Konfigurasi Embedding / RAG
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="Model Embedding" value={config.embedding_model} />
            <Row label="Min Score" value={String(config.search_min_score)} />
            <Row label="Limit Hasil" value={String(config.search_result_limit)} />
            <Row label="Environment" value={config.node_env} />
          </div>
        </Card>
      </div>

      {/* ===== Uji RAG ===== */}
      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search size={16} /> Uji Vector Search (RAG)
        </h2>
        <form onSubmit={runSearch} className="flex gap-2 max-w-xl">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tulis pertanyaan, mis. Bagaimana cara melakukan pengaduan?"
            required
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Cari
          </Button>
        </form>

        {results && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-3">
              {results.count} chunk ditemukan dalam {results.duration_ms} ms
            </p>
            <div className="space-y-3">
              {results.results.map((r) => (
                <div key={r.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-800">{r.document_title}</p>
                    <Badge color="blue">{Math.round(r.score * 100)}%</Badge>
                  </div>
                  {r.section && (
                    <p className="text-xs text-slate-400 mb-1">
                      Section: {r.section} · Halaman {r.page_number || '-'}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-3">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, badge, badgeColor = 'green' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-800">{value}</span>
        {badge && <Badge color={badgeColor}>{badge}</Badge>}
      </div>
    </div>
  );
}
