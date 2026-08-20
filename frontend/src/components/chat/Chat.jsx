'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Square,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  FileText,
  Search,
  PenLine
} from 'lucide-react';
import Markdown from './Markdown';
import {
  streamChat,
  api,
  getSessionId,
  setSessionId,
  getLocalHistory,
  setLocalHistory
} from '../../lib/api';

const LAURA_MENU = [
  { num: '1', icon: Search, label: 'Cek Produk & Izin Edar' },
  { num: '2', icon: FileText, label: 'Pengaduan & Laporan Produk' },
  { num: '3', icon: ShieldCheck, label: 'Informasi Konsultasi & Layanan Publik' },
  { num: '4', icon: PenLine, label: 'Tips Konsumsi Aman & Cek KLIK' }
];

const scoreColor = (score) => {
  if (score >= 0.7) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 0.4) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-600 border-rose-200';
};

function TypingIndicator({ label }) {
  return (
    <div className="flex items-center gap-2 text-slate-400 py-1">
      <span className="flex gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function Chat() {
  const [chatKey, setChatKey] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = getLocalHistory();
    if (saved.length > 0) setMessages(saved);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      // Mulai percakapan baru → kembali ke posisi paling atas agar rapi
      scrollRef.current?.scrollTo({ top: 0 });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput('');

    const userId = Date.now();
    const asstId = userId + 1;

    setMessages((m) => [
      ...m,
      { id: userId, role: 'user', content: question },
      { id: asstId, role: 'assistant', content: '', sources: [], streaming: true, phase: 'searching' }
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';

    try {
      await streamChat({
        question,
        sessionId: getSessionId(),
        signal: controller.signal,
        onEvent: (evt) => {
          if (evt.type === 'sources') {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId ? { ...msg, sources: evt.sources, phase: 'thinking' } : msg
              )
            );
          } else if (evt.type === 'token') {
            acc += evt.text;
            setMessages((m) =>
              m.map((msg) => (msg.id === asstId ? { ...msg, content: acc, phase: 'streaming' } : msg))
            );
          } else if (evt.type === 'done') {
            if (evt.session_id) setSessionId(evt.session_id);
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId ? { ...msg, streaming: false, phase: null, model: evt.model } : msg
              )
            );
          } else if (evt.type === 'error') {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId
                  ? { ...msg, content: `⚠️ ${evt.message}`, streaming: false, phase: null }
                  : msg
              )
            );
          }
        }
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId
              ? { ...msg, content: `⚠️ ${err.message}`, streaming: false, phase: null }
              : msg
          )
        );
      } else {
        // dihentikan user → selesaikan tanpa pesan error
        setMessages((m) =>
          m.map((msg) => (msg.id === asstId ? { ...msg, streaming: false, phase: null } : msg))
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      setMessages((m) => {
        const clean = m.map(({ streaming, phase, ...rest }) => rest);
        setLocalHistory(clean);
        return m;
      });
    }
  };

  const stop = () => abortRef.current?.abort();

  const copy = async (id, content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard tidak tersedia
    }
  };

  const sendFeedback = async (rating) => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.streaming);
    if (!lastAssistant) return;
    setMessages((m) =>
      m.map((msg) => (msg.id === lastAssistant.id ? { ...msg, feedback: rating } : msg))
    );
    try {
      await api('/public/feedback', {
        method: 'POST',
        body: {
          rating,
          comment: rating === 'up' ? 'Jawaban bermanfaat' : 'Jawaban kurang memuaskan'
        }
      });
    } catch {
      // abaikan error feedback
    }
  };

  const resetChat = () => {
    setMessages([]);
    setLocalHistory([]);
    // Remount bersih → tata letak sama persis seperti refresh halaman
    setChatKey((k) => k + 1);
  };

  return (
    <div
      key={chatKey}
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-brand-50/60 to-slate-50"
    >
      {/* Dekorasi latar (lembut, agar tidak polos) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-300/25 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-300/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-emerald-200/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(15, 23, 42, 0.3) 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }}
        />
      </div>

      {/* Maskot BBPOM di sisi kanan, dekat panel chat (desktop lebar) */}
      <div className="hidden xl:block fixed right-[calc(50%_-_36rem)] bottom-28 z-10 w-44 pointer-events-none select-none">
        <div className="overflow-hidden rounded-3xl bg-slate-900 shadow-2xl shadow-brand-900/30 ring-1 ring-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/maskot-bpom.png"
            alt="Maskot BBPOM"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-screen max-w-3xl mx-auto px-4">
        {/* Header */}
        <header className="sticky top-0 z-20 py-4 backdrop-blur-md bg-white/70 border-b border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-brand-600/20 overflow-hidden">
              <Sparkles size={20} className="relative z-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/icon.png"
                alt="BBPOM"
                className="absolute inset-0 z-10 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">BBPOM AI Assistant</h1>
              <p className="text-xs text-slate-500">Balai POM Palangka Raya</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition"
            title="Mulai percakapan baru"
          >
            <RefreshCw size={18} />
          </button>
        </header>

        {/* Area pesan */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="m-auto w-full px-1 py-8">
                <div className="text-center">
                  <div className="relative h-20 w-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 opacity-20 blur-xl" />
                    <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-brand-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 overflow-hidden">
                      <Bot size={34} className="relative z-0" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/icon.png"
                        alt="BBPOM"
                        className="absolute inset-0 z-10 h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Selamat datang di Layanan Informasi Resmi BBPOM di Palangka Raya 👋
                  </h2>

                  <p className="text-slate-600 mt-3 text-sm leading-relaxed max-w-md mx-auto">
                    Saya <span className="font-semibold text-brand-700">Asisten LAURA</span> (Asisten
                    Layanan Aduan &amp; Informasi Obat dan Makanan). Siap membantu Anda mendapatkan
                    informasi seputar Obat dan Makanan yang aman dan terpercaya.
                  </p>
                </div>

                <div className="mt-7 flex flex-col gap-2.5 max-w-md mx-auto">
                  {LAURA_MENU.map((m) => (
                    <button
                      key={m.num}
                      onClick={() => send(m.num)}
                      className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm text-left text-sm text-slate-700 shadow-sm hover:border-brand-400 hover:text-brand-700 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <span className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center font-bold shadow-sm">
                        {m.num}
                      </span>
                      <span className="flex items-center gap-2 min-w-0">
                        <m.icon size={16} className="text-brand-500 shrink-0" />
                        <span>{m.label}</span>
                      </span>
                      <span className="ml-auto text-slate-300 group-hover:text-brand-400 transition">
                        →
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-center text-xs text-slate-400 mt-5">
                  Balas dengan angka 1 - 4 atau ketik langsung pertanyaan Anda.
                </p>
              </div>
            ) : (
              <div className="m-auto w-full py-6 space-y-5">
                {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="msg-in flex justify-end">
                <div className="max-w-[80%] flex gap-2 items-end">
                  <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-md shadow-brand-600/15 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-0.5 shrink-0">
                    <User size={15} />
                  </div>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="msg-in flex gap-3">
                <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden">
                  <Bot size={17} className="relative z-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/icon.png"
                    alt=""
                    className="absolute inset-0 z-10 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="max-w-[85%] min-w-0 flex-1">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    {msg.streaming ? (
                      <>
                        {msg.phase === 'searching' && <TypingIndicator label="Mencari di basis pengetahuan..." />}
                        {msg.phase === 'thinking' && <TypingIndicator label="Menyusun jawaban..." />}
                        {msg.phase === 'streaming' && (
                          <span className="md-body">
                            <Markdown>{msg.content}</Markdown>
                            <span className="stream-cursor" />
                          </span>
                        )}
                      </>
                    ) : msg.content ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      <TypingIndicator label="Mencari di basis pengetahuan..." />
                    )}

                    {/* Sumber */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
                          <ExternalLink size={12} /> Sumber ({msg.sources.length})
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {msg.sources.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-slate-700 truncate">{s.title}</p>
                                <p className="text-slate-400 truncate">
                                  {[s.section, s.page ? `hal. ${s.page}` : null]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[11px] font-medium ${scoreColor(
                                  s.score
                                )}`}
                              >
                                {Math.round(s.score * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aksi: copy, feedback, model */}
                  {!msg.streaming && msg.content && msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-1 text-slate-400 pl-1">
                      <button
                        onClick={() => copy(msg.id, msg.content)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition"
                        title="Salin jawaban"
                      >
                        {copiedId === msg.id ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => sendFeedback('up')}
                        className={`p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition ${
                          msg.feedback === 'up' ? 'text-emerald-600 bg-emerald-50' : ''
                        }`}
                        title="Jawaban bermanfaat"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => sendFeedback('down')}
                        className={`p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition ${
                          msg.feedback === 'down' ? 'text-rose-600 bg-rose-50' : ''
                        }`}
                        title="Jawaban kurang memuaskan"
                      >
                        <ThumbsDown size={14} />
                      </button>
                      {msg.model && (
                        <span className="ml-auto text-[11px] flex items-center gap-1 text-slate-400">
                          <ShieldCheck size={12} /> {msg.model}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="pb-5 pt-1">
          <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-lg shadow-slate-200/60 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ketik pertanyaan Anda..."
              className="flex-1 resize-none outline-none bg-transparent px-2 py-2 text-[15px] max-h-32"
            />
            {loading ? (
              <button
                onClick={stop}
                className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition shadow-sm"
                title="Hentikan"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition shadow-sm"
              >
                <Send size={17} />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            BBPOM AI Assistant dapat membuat kesalahan. Verifikasi informasi penting pada sumber resmi.
          </p>
        </div>
      </div>
    </div>
  );
}
