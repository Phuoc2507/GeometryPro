/**
 * TestApiKeyTab — tab admin "Test API Key".
 *
 * Gửi 1 đề bài qua NHIỀU api key cùng lúc (chế độ LÔ), đo token/thời gian, và so sánh
 * JSON hình giữa các key (cái nào khác thì gắn nhãn nhóm A/B… để admin tự kiểm).
 * Log lưu ở localStorage. Bấm "Mở bài" → mở hình trong tab mới (đọc từ localStorage).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send, Loader2, ChevronDown, ExternalLink, Trash2, KeyRound, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { testApiListKeys, testApiSend, type TestKeyMeta, type TestKeyResult } from '@/lib/adminApi';

const BATCHES_KEY = 'geo3d:apikey-test-batches';
const RESULT_PREFIX = 'geo3d:test-result:';
const MAX_BATCHES = 20;

interface Batch {
  id: string;
  name: string;          // tên lô = trích đề bài
  problem: string;
  createdAt: number;
  results: TestKeyResult[];
  groups: Record<string, string>; // keyId → nhãn nhóm (A/B…) theo JSON hình
  hasDiff: boolean;
}

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Chuẩn hoá JSON để so sánh: sắp khoá + làm tròn số (bỏ nhiễu float). */
function canonical(obj: unknown): string {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(x as Record<string, unknown>).sort()) o[k] = walk((x as Record<string, unknown>)[k]);
      return o;
    }
    if (typeof x === 'number') return Math.round(x * 1e4) / 1e4;
    return x;
  };
  try { return JSON.stringify(walk(obj)); } catch { return ''; }
}

/** Gắn nhãn nhóm A/B… cho các key theo JSON hình; hasDiff nếu >1 nhóm. */
function groupResults(results: TestKeyResult[]): { groups: Record<string, string>; hasDiff: boolean } {
  const groups: Record<string, string> = {};
  const sigToLabel = new Map<string, string>();
  let next = 0;
  for (const r of results) {
    if (!r.ok || r.geometry == null) continue;
    const sig = canonical(r.geometry);
    let label = sigToLabel.get(sig);
    if (!label) { label = String.fromCharCode(65 + next++); sigToLabel.set(sig, label); }
    groups[r.keyId] = label;
  }
  return { groups, hasDiff: sigToLabel.size > 1 };
}

function loadBatches(): Batch[] {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    return raw ? (JSON.parse(raw) as Batch[]) : [];
  } catch { return []; }
}

function saveBatches(batches: Batch[]) {
  // localStorage có hạn: cắt bớt lô cũ nếu vượt quota.
  let list = batches.slice(0, MAX_BATCHES);
  for (;;) {
    try { localStorage.setItem(BATCHES_KEY, JSON.stringify(list)); return; }
    catch { if (list.length <= 1) return; list = list.slice(0, list.length - 1); }
  }
}

const fmtTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const fmtTokens = (t: TestKeyResult['tokens']) => (t?.total != null ? `${t.total} tok` : '—');
const timeAgo = (ts: number) => new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export function TestApiKeyTab() {
  const [keys, setKeys] = useState<TestKeyMeta[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState('');
  const [sending, setSending] = useState(false);
  const [batches, setBatches] = useState<Batch[]>(() => loadBatches());
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [openJson, setOpenJson] = useState<Set<string>>(new Set());

  useEffect(() => {
    testApiListKeys()
      .then((ks) => { setKeys(ks); setSelected(new Set(ks.map((k) => k.id))); })
      .catch((e) => toast({ title: 'Không tải được danh sách API key', description: e.message, variant: 'destructive' }));
  }, []);

  const toggleKey = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  // "Chọn tất cả": đang có chọn → bỏ HẾT; đang trống → chọn HẾT.
  // (Bỏ riêng từng key thì bấm vào key đó — vẫn giữ phần còn lại.)
  const toggleAll = () => setSelected((s) => (s.size > 0 ? new Set() : new Set(keys.map((k) => k.id))));
  // ô "Chọn tất cả": đủ hết = tick; chọn một phần = gạch (indeterminate); trống = bỏ.
  const allState: boolean | 'indeterminate' =
    keys.length > 0 && selected.size === keys.length ? true : selected.size > 0 ? 'indeterminate' : false;

  const send = useCallback(async () => {
    const text = problem.trim();
    if (!text || selected.size === 0) return;
    setSending(true);
    try {
      const results = await testApiSend(text, [...selected]);
      const { groups, hasDiff } = groupResults(results);
      const batch: Batch = {
        id: uid(),
        name: text.length > 70 ? `${text.slice(0, 70)}…` : text,
        problem: text,
        createdAt: Date.now(),
        results, groups, hasDiff,
      };
      setBatches((prev) => { const next = [batch, ...prev].slice(0, MAX_BATCHES); saveBatches(next); return next; });
      setOpenBatch(batch.id);
    } catch (e) {
      toast({ title: 'Gửi thất bại', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }, [problem, selected]);

  const openResult = (batch: Batch, r: TestKeyResult) => {
    if (r.geometry == null) return;
    // id CỐ ĐỊNH theo (lô, key) → mở lại nhiều lần KHÔNG sinh rác localStorage mới.
    const id = `${batch.id}-${r.keyId}`;
    try {
      localStorage.setItem(RESULT_PREFIX + id, JSON.stringify({ name: batch.name, keyName: r.keyName, geometry: r.geometry }));
      window.open(`/admin/test-view/${id}`, '_blank', 'noopener');
    } catch {
      toast({ title: 'Không mở được', description: 'Bộ nhớ trình duyệt đầy — xoá bớt log rồi thử lại.', variant: 'destructive' });
    }
  };

  const clearLog = () => {
    // Dọn luôn các hình đã lưu để "Mở bài" (tránh rác localStorage).
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(RESULT_PREFIX)) localStorage.removeItem(k);
      }
    } catch { /* bỏ qua */ }
    setBatches([]); saveBatches([]);
  };

  return (
    <div className="space-y-4">
      {/* ── Ô gửi ── */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
        <Textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Dán đề bài để gửi thử qua các API key…"
          className="min-h-[90px] text-sm"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
            <Checkbox checked={allState} onCheckedChange={toggleAll} /> Chọn tất cả
          </label>
          {keys.map((k) => (
            <label key={k.id} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <Checkbox checked={selected.has(k.id)} onCheckedChange={() => toggleKey(k.id)} />
              <KeyRound className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{k.name}</span>
              <code className="text-[10px] text-muted-foreground bg-secondary/40 rounded px-1">{k.model}</code>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {selected.size >= 2 ? `Gửi LÔ cho ${selected.size} key — sẽ so sánh JSON hình.` : 'Gửi cho 1 key.'}
          </p>
          <Button size="sm" onClick={send} disabled={sending || !problem.trim() || selected.size === 0} className="gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Đang gửi…' : 'Gửi'}
          </Button>
        </div>
      </div>

      {/* ── Log lô ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Log ({batches.length})</h3>
        {batches.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearLog} className="gap-1.5 text-muted-foreground h-7">
            <Trash2 className="w-3.5 h-3.5" /> Xoá log
          </Button>
        )}
      </div>

      {batches.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Chưa có lô nào. Gửi một đề để bắt đầu.</p>
      ) : (
        <div className="space-y-2">
          {batches.map((b) => {
            const isOpen = openBatch === b.id;
            return (
              <div key={b.id} className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                <button
                  onClick={() => setOpenBatch(isOpen ? null : b.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
                >
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', !isOpen && '-rotate-90')} />
                  <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{b.name}</span>
                  {b.results.filter((r) => r.ok).length >= 2 && (
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                      b.hasDiff
                        ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-green-500/12 text-green-600 dark:text-green-400 border-green-500/30')}>
                      {b.hasDiff ? 'Khác biệt' : 'Giống nhau'}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{b.results.length} key · {timeAgo(b.createdAt)}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-border/50 divide-y divide-border/40">
                    {b.results.map((r) => {
                      const jsonId = `${b.id}:${r.keyId}`;
                      const jsonOpen = openJson.has(jsonId);
                      return (
                        <div key={r.keyId} className="px-3 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.ok
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className="text-[12.5px] font-medium">{r.keyName}</span>
                            <code className="text-[10px] text-muted-foreground bg-secondary/40 rounded px-1">{r.model}</code>
                            {b.groups[r.keyId] && (
                              <span className="text-[10px] font-bold px-1.5 rounded bg-primary/15 text-primary" title="Nhóm JSON hình giống nhau">
                                Nhóm {b.groups[r.keyId]}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                              {fmtTokens(r.tokens)} · {fmtTime(r.timeMs)}
                            </span>
                          </div>

                          {r.error && <p className="mt-1 text-[11px] text-red-500 break-words">{r.error}</p>}
                          {r.parseError && <p className="mt-1 text-[11px] text-amber-500">JSON lỗi cú pháp: {r.parseError}</p>}

                          {r.ok && (
                            <div className="mt-2 flex items-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                                disabled={r.geometry == null} onClick={() => openResult(b, r)}>
                                <ExternalLink className="w-3.5 h-3.5" /> Mở bài
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-muted-foreground"
                                onClick={() => setOpenJson((s) => { const n = new Set(s); n.has(jsonId) ? n.delete(jsonId) : n.add(jsonId); return n; })}>
                                {jsonOpen ? 'Ẩn JSON' : 'Xem JSON'}
                              </Button>
                            </div>
                          )}

                          {jsonOpen && (
                            <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-secondary/30 border border-border/40 p-2 text-[10.5px] leading-snug text-foreground/85">
                              {JSON.stringify(r.geometry ?? r.raw ?? null, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
