const __vite__mapDeps = (i, m = __vite__mapDeps, d = m.f || (m.f = ["assets/DeveloperModeWorkspace-DgGQCXh1.js", "assets/index-O1AJ09Lc.js", "assets/index-Bc9i5GSr.css", "assets/useVisibilityPolling-Dli71NtM.js", "assets/RuntimePrimitives-DR0A8pZm.js", "assets/windowUtils-CswbmmCe.js", "assets/runtimeManagerUtils-D6MyZunj.js", "assets/AdvancedControlPanel-DoMYHCqT.js"])) => i.map((i2) => d[i2]);
import { j as n, r as o, _ as Yt } from "./index-O1AJ09Lc.js";
import { c as qt, l as jr, d as Cr, s as Rr, f as oe, e as Er, h as Pr, b as Wr, a as zr } from "./runtimeManagerUtils-D6MyZunj.js";
import { u as Nr } from "./useVisibilityPolling-Dli71NtM.js";
import { P as Lr } from "./ProcessContextMenu-DisuwACe.js";
import { T as g, l as Ir, s as Br, b as It, u as Ke, a as Bt, t as $r, L as Dr, D as Hr, c as _r } from "./windowUtils-CswbmmCe.js";
import { l as $t, s as Fr, f as Or } from "./chatUtils-Cj9tevGG.js";
function Ur({ palette: i, approvalCount: r, chatThreadCount: s, optimizerStatus: l, drawerOpen: a, onDrawerMouseEnter: c, onDrawerMouseLeave: b }) {
  const u = i.mode === "light", x = u ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(151,209,255,0.10)", h = u ? "rgba(255,255,255,0.82)" : "rgba(6,11,22,0.82)", w = u ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.02)", p = u ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(214,231,255,0.08)", A = { borderRadius: 8, border: i.sidebarBtnBorder, background: u ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)", color: i.sidebarText, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }, E = { fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: i.sidebarMuted, fontWeight: 600 }, ie = { fontSize: 11, color: i.sidebarMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return n.jsxs("div", { onMouseEnter: c, onMouseLeave: b, style: { display: "grid", gap: 1, padding: "0 6px 2px", borderTop: x, background: h, flexShrink: 0, overflow: "hidden" }, children: [n.jsx("div", { style: { display: "flex", justifyContent: "center" }, children: n.jsx("div", { "aria-hidden": "true", style: { width: 32, height: 4, borderRadius: g.radius.pill, border: i.sidebarBtnBorder, background: u ? a ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.07)" : a ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.11)", boxShadow: u ? "inset 0 1px 0 rgba(255,255,255,0.42)" : "inset 0 1px 0 rgba(255,255,255,0.18)", transition: `background ${g.motion.fast}, border-color ${g.motion.fast}, opacity ${g.motion.fast}`, opacity: a ? 0.95 : 0.8 } }) }), n.jsxs("div", { style: { display: "flex", alignItems: "stretch", gap: 6, maxHeight: a ? 180 : 0, opacity: a ? 1 : 0, transform: a ? "translateY(0)" : "translateY(12px)", pointerEvents: a ? "auto" : "none", transition: `max-height ${g.motion.panel}, opacity ${g.motion.medium}, transform ${g.motion.panel}`, overflow: "hidden" }, children: [n.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: "7px 10px", borderRadius: 12, border: p, background: w, minWidth: 0 }, children: [n.jsx("div", { style: E, children: "Assistant" }), n.jsx("div", { style: ie, children: s === 0 ? "No conversations" : `${s} conversation${s === 1 ? "" : "s"}` }), n.jsx("button", { "data-tm-button": "true", style: A, onClick: () => {
    var j, P;
    return void ((P = (j = window.horizonsDesktop) == null ? void 0 : j.windowManager) == null ? void 0 : P.openChat());
  }, title: "Open Chat Manager", children: "Open Chat" })] }), n.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: "7px 10px", borderRadius: 12, border: p, background: w, minWidth: 0 }, children: [n.jsx("div", { style: E, children: "Dev" }), n.jsx("div", { style: ie, children: l || "Workspace" }), n.jsx("button", { "data-tm-button": "true", style: A, onClick: () => {
    var j, P;
    return void ((P = (j = window.horizonsDesktop) == null ? void 0 : j.windowManager) == null ? void 0 : P.openDev());
  }, title: "Open Dev Workspace", children: "Open Dev" })] }), n.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: "7px 10px", borderRadius: 12, border: r > 0 ? u ? "1px solid rgba(196,116,0,0.22)" : "1px solid rgba(255,216,143,0.22)" : p, background: r > 0 ? u ? "rgba(196,116,0,0.05)" : "rgba(255,216,143,0.05)" : w, minWidth: 0, position: "relative" }, children: [n.jsx("div", { style: { ...E, display: "flex", alignItems: "center", gap: 5 }, children: "Approvals" }), r > 0 ? n.jsx("span", { style: { position: "absolute", top: 6, right: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: u ? "rgba(196,116,0,0.75)" : "rgba(255,180,0,0.85)", color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: 0 }, children: r > 99 ? "99+" : r }) : null, n.jsx("div", { style: ie, children: r === 0 ? "None pending" : `${r} pending` }), n.jsx("button", { "data-tm-button": "true", style: { ...A, ...r > 0 ? { border: u ? "1px solid rgba(196,116,0,0.3)" : "1px solid rgba(255,216,143,0.28)", background: u ? "rgba(196,116,0,0.1)" : "rgba(255,216,143,0.1)", color: u ? "rgba(120,60,0,0.9)" : "rgba(255,220,160,0.95)" } : {} }, onClick: () => {
    var j, P;
    return void ((P = (j = window.horizonsDesktop) == null ? void 0 : j.windowManager) == null ? void 0 : P.openApproval());
  }, title: "Open Approvals", children: "Review" })] })] })] });
}
const Kt = 1024 * 1024, Dt = 1024 * Kt;
function Ve(i) {
  return `${Math.round(Math.max(0, i || 0))}%`;
}
function he(i) {
  const r = Math.max(0, Number(i) || 0);
  return r >= Dt ? `${(r / Dt).toFixed(1)} GB` : `${Math.round(r / Kt)} MB`;
}
function Gr(i, r = false) {
  return i >= 80 ? r ? "#b85000" : "#ff9d6b" : i >= 60 ? r ? "#8b6200" : "#f7d18b" : r ? "rgba(0,0,0,0.82)" : "rgba(244, 248, 255, 0.98)";
}
function Vt(i) {
  const r = String(i || "").trim();
  if (!r) return "--";
  const s = [["available", "Available"], ["running", "Running"], ["active", "Running"], ["waiting", "Waiting"], ["queued", "Queued"], ["ready", "Ready"], ["idle", "Idle"], ["review", "Review"], ["apply", "Apply"], ["offline", "Offline"], ["error", "Error"], ["rate", "Rate"], ["stable", "Stable"]], l = r.toLowerCase();
  for (const [a, c] of s) if (l.includes(a)) return c;
  return r.length <= 10 ? r : `${r.slice(0, 9).trimEnd()}\u2026`;
}
function Yr(i) {
  const r = Math.max(0, i.cpuPercent || 0), s = Math.max(0, i.gpuPercent || 0), l = Math.max(0, i.ramPercent || 0);
  return s >= r && s >= l && s > 0 ? `GPU ${Math.round(s)}%` : l >= r && l >= s && l > 0 ? `RAM ${Math.round(l)}%` : r > 0 ? `CPU ${Math.round(r)}%` : Vt(i.status);
}
function Xt(i) {
  return Math.max(6, Math.min(100, Math.max(i.cpuPercent || 0, i.gpuPercent || 0, i.ramPercent || 0)));
}
function qr(i, r) {
  return qt(i, "", "all", "cpu", { ...r, hideProtected: false }).map((s) => ({ id: s.id, iconKey: s.iconKey, name: s.name, metric: Yr(s), intensity: Xt(s), groupId: s.groupId, path: s.path || null, mainWindowTitle: null, processName: s.name, safeActions: s.actions.map((l) => l.id), actions: s.actions.map((l) => l.id), isProtected: s.isProtected, hasVisibleWindow: void 0, aiWorker: s.isAiWorker }));
}
function Kr(i, r) {
  if (!i) return [];
  const s = /* @__PURE__ */ new Map();
  for (const a of (r == null ? void 0 : r.rows) || []) for (const c of a.pids || []) {
    const b = Number(c);
    Number.isFinite(b) && b > 0 && s.set(b, a);
  }
  const l = Math.max(0, Number(i.totalMemoryBytes) || 0);
  return [...Array.isArray(i.processes) ? i.processes : []].filter((a) => Number(a == null ? void 0 : a.pid) > 0 && String((a == null ? void 0 : a.processName) || "").trim()).sort((a, c) => Number((c == null ? void 0 : c.cpuPercentHint) || 0) - Number((a == null ? void 0 : a.cpuPercentHint) || 0) || Number((c == null ? void 0 : c.gpuPercent) || 0) - Number((a == null ? void 0 : a.gpuPercent) || 0) || Number((c == null ? void 0 : c.workingSetBytes) || 0) - Number((a == null ? void 0 : a.workingSetBytes) || 0) || Number((a == null ? void 0 : a.pid) || 0) - Number((c == null ? void 0 : c.pid) || 0)).map((a) => {
    const c = Math.max(0, Number(a.cpuPercentHint) || 0), b = Math.max(0, Number(a.gpuPercent) || 0), u = Math.max(0, Number(a.workingSetBytes) || 0), x = l > 0 ? u / l * 100 : 0, h = String(a.processName || "").trim(), w = String(a.mainWindowTitle || "").trim(), p = s.get(Number(a.pid));
    return { id: `pid-${a.pid}`, iconKey: h.slice(0, 1) || "p", name: w ? `${h} - ${w}` : `${h} (${a.pid})`, metric: c >= 1 ? `CPU ${Math.round(c)}%` : b >= 1 ? `GPU ${Math.round(b)}%` : u > 0 ? `RAM ${he(u)}` : `PID ${a.pid}`, intensity: Math.max(6, Math.min(100, Math.max(c, b, x))), pid: Number(a.pid), pids: p ? [...p.pids] : [Number(a.pid)], groupId: (p == null ? void 0 : p.groupId) || null, path: (p == null ? void 0 : p.path) || a.path || null, mainWindowTitle: (p == null ? void 0 : p.mainWindowTitle) || w || null, processName: h, safeActions: p != null && p.safeActions ? [...p.safeActions] : [], actions: p != null && p.safeActions ? [...p.safeActions] : [], isProtected: p == null ? void 0 : p.protected, hasVisibleWindow: p == null ? void 0 : p.hasVisibleWindow, aiWorker: p == null ? void 0 : p.aiWorker };
  });
}
function Vr(i, r) {
  return qt(i, "", "all", "cpu", r).map((s) => ({ id: s.id, iconKey: s.iconKey, name: s.name, metric: Vt(s.status), intensity: Math.max(10, Xt(s), s.tone === "error" ? 72 : s.tone === "warning" ? 54 : s.tone === "active" ? 42 : 12), groupId: s.groupId, path: s.path || null, mainWindowTitle: null, processName: s.name, safeActions: s.actions.map((l) => l.id), actions: s.actions.map((l) => l.id), isProtected: s.isProtected, hasVisibleWindow: void 0, aiWorker: s.isAiWorker }));
}
function Ht(i, r) {
  switch (i) {
    case "running":
      return { border: r ? "1px solid rgba(16,124,16,0.18)" : "1px solid rgba(110,231,183,0.18)", background: r ? "rgba(16,124,16,0.08)" : "rgba(22, 78, 66, 0.52)", color: r ? "rgba(12,72,12,0.92)" : "rgba(214,255,236,0.98)" };
    case "paused":
      return { border: r ? "1px solid rgba(196,116,0,0.18)" : "1px solid rgba(255,216,143,0.2)", background: r ? "rgba(196,116,0,0.08)" : "rgba(84, 60, 24, 0.48)", color: r ? "rgba(110,64,0,0.92)" : "rgba(255,239,198,0.98)" };
    case "starting":
    case "stopping":
      return { border: r ? "1px solid rgba(0,120,212,0.18)" : "1px solid rgba(143,213,255,0.2)", background: r ? "rgba(0,120,212,0.08)" : "rgba(25, 46, 82, 0.5)", color: r ? "rgba(0,86,153,0.94)" : "rgba(220,237,255,0.98)" };
    case "disabled":
    case "stopped":
      return { border: r ? "1px solid rgba(0,0,0,0.09)" : "1px solid rgba(214,231,255,0.08)", background: r ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.035)", color: r ? "rgba(0,0,0,0.58)" : "rgba(214,231,255,0.66)" };
    default:
      return { border: r ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: r ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", color: r ? "rgba(0,0,0,0.58)" : "rgba(214,231,255,0.66)" };
  }
}
function Xr(i, r) {
  switch (i) {
    case "running":
      return { border: r ? "1px solid rgba(16,124,16,0.22)" : "1px solid rgba(110,231,183,0.24)", background: r ? "rgba(16,124,16,0.12)" : "rgba(22, 78, 66, 0.55)", color: r ? "rgba(12,72,12,0.94)" : "rgba(214,255,236,0.98)" };
    case "paused":
      return { border: r ? "1px solid rgba(196,116,0,0.22)" : "1px solid rgba(255,216,143,0.24)", background: r ? "rgba(196,116,0,0.12)" : "rgba(84, 60, 24, 0.56)", color: r ? "rgba(110,64,0,0.94)" : "rgba(255,239,198,0.98)" };
    case "starting":
    case "stopping":
      return { border: r ? "1px solid rgba(0,120,212,0.22)" : "1px solid rgba(143,213,255,0.24)", background: r ? "rgba(0,120,212,0.12)" : "rgba(25, 46, 82, 0.58)", color: r ? "rgba(0,86,153,0.94)" : "rgba(220,237,255,0.98)" };
    case "disabled":
    case "stopped":
      return { border: r ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: r ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", color: r ? "rgba(0,0,0,0.56)" : "rgba(214,231,255,0.62)" };
    default:
      return { border: r ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: r ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", color: r ? "rgba(0,0,0,0.56)" : "rgba(214,231,255,0.62)" };
  }
}
function Jr(i) {
  return String(i || "S").trim().slice(0, 1).toUpperCase() || "S";
}
function Qr({ palette: i, row: r, index: s }) {
  const l = i.mode === "light", a = Ht(r.status, l).border, c = s % 2 === 0 ? l ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.025)" : "transparent", b = Ht(r.status, l), u = Xr(r.status, l);
  return n.jsxs("div", { "data-tm-row": "true", title: r.description || `${r.displayName} (${r.serviceName})`, style: { display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) 84px 82px", alignItems: "center", gap: g.spacing.tight, padding: "7px 10px", minHeight: g.controlHeights.processRow, borderRadius: g.radius.compact, border: a, background: c, boxShadow: l ? "inset 0 -1px 0 rgba(0,0,0,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.02)" }, children: [n.jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 7, background: u.background, border: u.border, color: u.color, fontSize: 10.5, fontWeight: 800, lineHeight: 1, fontFamily: "ui-monospace, monospace", userSelect: "none" }, children: Jr(r.displayName || r.serviceName) }), n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 2 }, children: [n.jsx("div", { style: { fontSize: 12.75, fontWeight: 620, color: i.sidebarText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.displayName }), n.jsxs("div", { style: { fontSize: 10.5, color: i.sidebarMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: [r.serviceName, r.contextLabel ? ` \xB7 ${r.contextLabel}` : ""] })] }), n.jsx("div", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 22, padding: "0 10px", borderRadius: g.radius.pill, border: b.border, background: b.background, color: b.color, fontSize: 10.75, fontWeight: 700, letterSpacing: "0.04em", textTransform: "none", whiteSpace: "nowrap", justifySelf: "end" }, children: r.statusLabel }), n.jsx("div", { style: { textAlign: "right", fontSize: 10.75, fontWeight: 600, letterSpacing: "0.04em", color: l ? "rgba(0,0,0,0.56)" : "rgba(214,231,255,0.68)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: r.startupLabel })] });
}
const Zr = { a: "#6ee7b7", b: "#a7f3d0", c: "#5fd0ff", d: "#a5b4fc", e: "#8bda9c", f: "#fb923c", g: "#f7c76d", h: "#9b87f5", l: "#c084fc", m: "#f59e0b", n: "#4ade80", p: "#7bb9ff", q: "#93c5fd", r: "#f7d18b", s: "#94a3b8", u: "#9dd5ff", v: "#38bdf8", w: "#64748b" };
function en({ palette: i, row: r, index: s, onContextMenu: l }) {
  const a = r.iconKey.toLowerCase().slice(0, 1), c = Zr[a] ?? "rgba(180,200,255,0.65)", b = r.intensity ?? Math.max(2, 28 - s * 2), u = i.mode === "light", x = b >= 72, h = b >= 52, w = Array.from({ length: 5 }, (p, A) => {
    const E = (A + 1) / 5;
    return Math.max(4, Math.min(16, b * (0.4 + E * 0.56) / 10));
  });
  return n.jsxs("div", { "data-tm-row": "true", onContextMenu: (p) => {
    p.preventDefault(), l == null || l(p);
  }, style: { display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) 82px 42px", alignItems: "center", gap: g.spacing.tight, padding: "7px 10px", minHeight: g.controlHeights.processRow, borderRadius: g.radius.compact, border: x ? u ? "1px solid rgba(196,116,0,0.18)" : "1px solid rgba(255, 193, 120, 0.16)" : h ? u ? "1px solid rgba(0,120,212,0.12)" : "1px solid rgba(143,213,255,0.1)" : u ? "1px solid rgba(0,0,0,0.03)" : "1px solid rgba(214,231,255,0.03)", background: x ? u ? "rgba(196,116,0,0.06)" : "linear-gradient(180deg, rgba(42, 31, 20, 0.72), rgba(25, 19, 14, 0.72))" : h ? u ? "rgba(0,120,212,0.04)" : "linear-gradient(180deg, rgba(28, 34, 58, 0.7), rgba(18, 23, 39, 0.7))" : s % 2 === 0 ? u ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.025)" : "transparent", boxShadow: u ? "inset 0 -1px 0 rgba(0,0,0,0.035)" : "inset 0 1px 0 rgba(255,255,255,0.02)", cursor: "context-menu" }, children: [n.jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`, color: c, fontSize: 11, fontWeight: 800, lineHeight: 1, fontFamily: "ui-monospace, monospace", userSelect: "none" }, children: a.toUpperCase() }), n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 2 }, children: [n.jsx("div", { style: { fontSize: 12.75, fontWeight: 600, color: x ? u ? "rgba(0,0,0,0.88)" : "rgba(255, 241, 220, 0.98)" : i.sidebarText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.name }), n.jsx("div", { style: { fontSize: 10.25, color: i.sidebarMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: r.aiWorker ? "AI worker" : r.isProtected ? "Protected group" : "Live process group" })] }), n.jsx("div", { style: { fontSize: 11.5, fontWeight: x ? 700 : 500, minWidth: 82, textAlign: "right", color: x ? u ? "#8b6200" : "rgba(255,216,143,0.96)" : u ? "rgba(0,0,0,0.56)" : "rgba(214,231,255,0.62)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", whiteSpace: "nowrap" }, children: r.metric }), n.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "end", gap: 4, height: 16 }, children: w.map((p, A) => n.jsx("span", { style: { display: "block", height: `${p}px`, borderRadius: 999, background: c, opacity: 0.3 + A * 0.15, boxShadow: u ? "none" : `0 0 10px color-mix(in srgb, ${c} 25%, transparent)` } }, `${r.id || r.name}-bar-${A}`)) })] });
}
function Jt(i) {
  const r = Math.max(0, Math.min(100, Number(i) || 0));
  return Array.from({ length: 8 }, (s, l) => {
    const a = (l + 1) / 8;
    return Math.max(8, Math.min(100, r * (0.62 + a * 0.28)));
  });
}
function tn({ values: i, accent: r, palette: s, columns: l = 16, compact: a = false }) {
  const c = s.mode === "light", b = i.length ? i : Jt(36), u = a ? Math.min(l, 8) : l, x = b.slice(-u), h = a ? 8 : 18, w = a ? 10 : 20;
  return n.jsx("div", { style: { display: "grid", gridTemplateColumns: `repeat(${x.length}, minmax(0, 1fr))`, alignItems: "end", gap: 3, minHeight: w }, children: x.map((p, A) => n.jsx("span", { style: { height: `${Math.max(a ? 2 : 4, Math.min(h, p / 100 * h))}px`, borderRadius: 999, background: r, opacity: 0.32 + A / Math.max(1, x.length - 1) * 0.68, boxShadow: c ? "none" : `0 0 10px color-mix(in srgb, ${r} 40%, transparent)` } }, `${r}-${A}`)) });
}
function rn({ label: i, value: r, percent: s, secondary: l, history: a, accent: c, palette: b, compact: u = false }) {
  const x = b.mode === "light", h = s != null ? Gr(s, x) : x ? "rgba(0,0,0,0.82)" : "rgba(244,248,255,0.98)", w = c || h, p = u ? 14 : r.length > 10 ? 16 : g.typography.metric, A = (s || 0) >= 65;
  return n.jsxs("div", { style: { flex: 1, minWidth: 0, minHeight: u ? 56 : 180, borderRadius: g.radius.card, border: x ? "1px solid rgba(0,0,0,0.11)" : "1px solid rgba(131,148,232,0.16)", background: x ? b.sidebarSurfaceStrong : "linear-gradient(180deg, rgba(27,31,51,0.98), rgba(16,19,31,0.98))", boxShadow: x ? g.shadow.soft : A ? `0 16px 28px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px color-mix(in srgb, ${w} 8%, transparent)` : "0 14px 26px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)", padding: u ? "6px 10px" : "14px 14px 14px", display: "grid", alignContent: "start", gap: u ? 4 : g.spacing.tight }, children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: u ? 4 : g.spacing.tight }, children: [n.jsx("div", { style: { fontSize: g.typography.eyebrow, letterSpacing: "0.14em", textTransform: "uppercase", color: x ? "rgba(0,0,0,0.48)" : "rgba(214,231,255,0.52)" }, children: i }), s != null ? n.jsxs("span", { style: { fontSize: g.typography.meta, color: b.sidebarMuted, fontVariantNumeric: "tabular-nums" }, children: [Math.round(s), "%"] }) : null] }), n.jsx("div", { style: { fontSize: p, fontWeight: 700, lineHeight: 1.02, color: h, fontVariantNumeric: "tabular-nums", whiteSpace: "normal", overflowWrap: "anywhere", textShadow: x ? "none" : A ? `0 0 20px color-mix(in srgb, ${w} 12%, transparent)` : "none" }, children: r }), !u && n.jsx("div", { style: { fontSize: 11.25, color: b.sidebarMuted, minHeight: 30, lineHeight: 1.5, whiteSpace: "pre-wrap" }, children: l || "Live telemetry" }), n.jsx(tn, { values: a || Jt(s || 0), accent: w, palette: b, compact: u })] });
}
function _t({ palette: i, title: r, detail: s, tone: l }) {
  const a = i.mode === "light", b = { neutral: { border: a ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: a ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", color: i.sidebarText }, active: { border: a ? "1px solid rgba(16,124,16,0.22)" : "1px solid rgba(110,231,183,0.18)", background: a ? "rgba(16,124,16,0.08)" : "rgba(20, 61, 55, 0.32)", color: a ? "rgba(12,72,12,0.92)" : "rgba(214,255,236,0.98)" }, warning: { border: a ? "1px solid rgba(196,116,0,0.22)" : "1px solid rgba(255, 216, 143, 0.2)", background: a ? "rgba(196,116,0,0.08)" : "rgba(84, 60, 24, 0.32)", color: a ? "rgba(110,64,0,0.92)" : "rgba(255, 239, 198, 0.98)" }, error: { border: a ? "1px solid rgba(196,43,28,0.22)" : "1px solid rgba(255, 161, 186, 0.22)", background: a ? "rgba(196,43,28,0.08)" : "rgba(87, 34, 47, 0.36)", color: a ? "rgba(120,20,12,0.92)" : "rgba(255, 226, 235, 0.98)" } }[l];
  return n.jsx("div", { style: { minHeight: "100%", display: "grid", placeItems: "center", padding: "10px 2px 12px", boxSizing: "border-box" }, children: n.jsxs("div", { style: { width: "100%", borderRadius: 14, ...b, padding: "14px 12px", boxSizing: "border-box", display: "grid", gap: 6 }, children: [n.jsx("div", { style: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: b.color, opacity: 0.88 }, children: r }), n.jsx("div", { style: { fontSize: 12, lineHeight: 1.6, color: b.color }, children: s })] }) });
}
o.lazy(async () => ({ default: (await Yt(() => import("./DeveloperModeWorkspace-DgGQCXh1.js"), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6]))).DeveloperModeWorkspace }));
o.lazy(async () => ({ default: (await Yt(() => import("./AdvancedControlPanel-DoMYHCqT.js"), __vite__mapDeps([7, 1, 2, 5, 4, 6]))).AdvancedControlPanel }));
const fe = { WebkitAppRegion: "no-drag" };
function nn(i) {
  if (i.button !== 0 || i.target.closest("button, input, select, textarea, a, [data-tm-button]")) return;
  i.preventDefault();
  const r = i.screenX, s = i.screenY, l = window.screenX, a = window.screenY;
  function c(u) {
    var x, h, w;
    (w = (h = (x = window.horizonsDesktop) == null ? void 0 : x.taskManager) == null ? void 0 : h.dragWindow) == null || w.call(h, l + u.screenX - r, a + u.screenY - s);
  }
  function b() {
    document.removeEventListener("mousemove", c), document.removeEventListener("mouseup", b);
  }
  document.addEventListener("mousemove", c), document.addEventListener("mouseup", b);
}
const Ft = 6e3, Ot = g.shell.mainColumnWidth, an = 12, on = 2e3, sn = 420, ln = 520;
function dn() {
  var i;
  return typeof window < "u" ? (i = window.horizonsDesktop) == null ? void 0 : i.taskManager : void 0;
}
function cn() {
  var i;
  return typeof window < "u" ? (i = window.horizonsDesktop) == null ? void 0 : i.runtimeManager : void 0;
}
async function Ut(i, r) {
  const s = await fetch(Wr(i), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) }), l = await s.json().catch(() => null);
  if (!s.ok) {
    const a = l && typeof l == "object" && "error" in l ? l.error : s.statusText;
    throw new Error(a || `Request failed with HTTP ${s.status}`);
  }
  return l;
}
function Xe(i, r) {
  const s = Math.max(0, Math.min(100, Number(r) || 0));
  return [...i, s].slice(-18);
}
function un(i) {
  return i ? `Last scan ${zr(i)}` : "Last scan pending";
}
function Ee(i) {
  const r = String(i || "").trim();
  return r ? r.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase()) : "Unknown";
}
const Pe = { all: "All", running: "Running", stopped: "Stopped", disabled: "Disabled" }, Je = { status: "Status", name: "Name", startup: "Startup" };
function pn(i, r) {
  return r === "all" ? true : i.status === r;
}
function se(i) {
  switch (i) {
    case "running":
      return 0;
    case "starting":
    case "stopping":
    case "paused":
      return 1;
    case "stopped":
    case "disabled":
      return 2;
    default:
      return 3;
  }
}
function Gt(i) {
  switch (i) {
    case "automatic":
      return 0;
    case "automatic_delayed":
      return 1;
    case "manual":
      return 2;
    case "disabled":
      return 3;
    default:
      return 4;
  }
}
function gn(i, r, s) {
  return s === "name" ? String(i.displayName || "").localeCompare(String(r.displayName || "")) || se(i.status) - se(r.status) || String(i.serviceName || "").localeCompare(String(r.serviceName || "")) : s === "startup" ? Gt(i.startupType) - Gt(r.startupType) || String(i.displayName || "").localeCompare(String(r.displayName || "")) || se(i.status) - se(r.status) : se(i.status) - se(r.status) || String(i.displayName || "").localeCompare(String(r.displayName || "")) || String(i.serviceName || "").localeCompare(String(r.serviceName || ""));
}
const aiTaskFilterLabels = { all: "All", enabled: "Enabled", paused: "Paused" }, aiTaskSortLabels = { nextRun: "Next Run", name: "Name", lastRun: "Last Run" }, aiTaskWeekdays = [["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"], ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"]];
function matchesAiTaskFilter(i, r) {
  return r === "enabled" ? !!i.enabled : r === "paused" ? !i.enabled : true;
}
function getTaskTimeValue(i, r = Number.MAX_SAFE_INTEGER) {
  const s = i ? new Date(i).getTime() : Number.NaN;
  return Number.isFinite(s) ? s : r;
}
function compareAiTaskRows(i, r, s) {
  return s === "name" ? String(i.name || "").localeCompare(String(r.name || "")) || getTaskTimeValue(i.nextRunAt) - getTaskTimeValue(r.nextRunAt) : s === "lastRun" ? getTaskTimeValue(r.lastRunAt, 0) - getTaskTimeValue(i.lastRunAt, 0) || String(i.name || "").localeCompare(String(r.name || "")) : getTaskTimeValue(i.nextRunAt) - getTaskTimeValue(r.nextRunAt) || String(i.name || "").localeCompare(String(r.name || ""));
}
function aiTaskToneStyles(i, r) {
  switch (i) {
    case "active":
      return { border: r ? "1px solid rgba(16,124,16,0.22)" : "1px solid rgba(110,231,183,0.22)", background: r ? "rgba(16,124,16,0.1)" : "rgba(22, 78, 66, 0.55)", color: r ? "rgba(12,72,12,0.94)" : "rgba(214,255,236,0.98)" };
    case "warning":
      return { border: r ? "1px solid rgba(196,116,0,0.22)" : "1px solid rgba(255,216,143,0.24)", background: r ? "rgba(196,116,0,0.1)" : "rgba(84, 60, 24, 0.56)", color: r ? "rgba(110,64,0,0.94)" : "rgba(255,239,198,0.98)" };
    case "error":
      return { border: r ? "1px solid rgba(196,43,28,0.22)" : "1px solid rgba(255,161,186,0.24)", background: r ? "rgba(196,43,28,0.1)" : "rgba(87, 34, 47, 0.56)", color: r ? "rgba(120,20,12,0.94)" : "rgba(255,226,235,0.98)" };
    default:
      return { border: r ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: r ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", color: r ? "rgba(0,0,0,0.56)" : "rgba(214,231,255,0.62)" };
  }
}
function buildLocalDateValue(i = /* @__PURE__ */ new Date()) {
  const r = i.getTimezoneOffset() * 60 * 1e3;
  return new Date(i.getTime() - r).toISOString().slice(0, 10);
}
function createScheduleConfigForType(i, r = {}) {
  switch (i) {
    case "once":
      return { date: String(r.date || buildLocalDateValue()), time: String(r.time || "09:00") };
    case "hourly":
      return { minuteOffset: Number.isFinite(Number(r.minuteOffset)) ? Math.max(0, Math.min(59, Number(r.minuteOffset))) : 0 };
    case "weekly":
      return { dayOfWeek: Number.isFinite(Number(r.dayOfWeek)) ? Math.max(0, Math.min(6, Number(r.dayOfWeek))) : 1, time: String(r.time || "09:00") };
    case "daily":
    default:
      return { time: String(r.time || "09:00") };
  }
}
function createAiTaskDraft(i = null) {
  return i ? { mode: "edit", id: i.id, name: i.name || "", prompt: i.prompt || "", scheduleType: i.scheduleType || "daily", scheduleConfig: createScheduleConfigForType(i.scheduleType || "daily", i.scheduleConfig || {}), enabled: i.enabled !== false } : { mode: "create", id: null, name: "", prompt: "", scheduleType: "daily", scheduleConfig: createScheduleConfigForType("daily"), enabled: true };
}
function AiTaskRow({ palette: i, row: r, index: s, busyKey: l, onRunNow: a, onEdit: c, onToggleEnabled: b, onDelete: u }) {
  const x = i.mode === "light", h = aiTaskToneStyles(r.statusTone, x), w = aiTaskToneStyles(r.enabled ? "active" : "warning", x), p = (A) => l === `${r.id}:${A}`, E = { height: 20, padding: "0 7px", borderRadius: 999, border: x ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(214,231,255,0.12)", background: x ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.03)", color: i.sidebarMuted, fontSize: 10, cursor: "pointer", outline: "none", whiteSpace: "nowrap" };
  return n.jsxs("div", { "data-tm-row": "true", style: { display: "grid", gridTemplateColumns: "20px minmax(0, 1.55fr) minmax(0, 0.9fr) 88px 96px", alignItems: "start", gap: g.spacing.tight, padding: "8px 10px", minHeight: g.controlHeights.processRow + 16, borderRadius: g.radius.compact, border: x ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.08)", background: s % 2 === 0 ? x ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.025)" : "transparent", boxShadow: x ? "inset 0 -1px 0 rgba(0,0,0,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.02)" }, children: [n.jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 7, background: x ? "rgba(0,120,212,0.08)" : "rgba(88,118,218,0.16)", border: x ? "1px solid rgba(0,120,212,0.18)" : "1px solid rgba(131,148,232,0.24)", color: x ? "#0078d4" : "rgba(191,206,255,0.95)", fontSize: 10.5, fontWeight: 800, lineHeight: 1, fontFamily: "ui-monospace, monospace", userSelect: "none" }, children: String(r.name || "T").trim().slice(0, 1).toUpperCase() || "T" }), n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 4 }, children: [n.jsx("div", { style: { fontSize: 12.75, fontWeight: 620, color: i.sidebarText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.name }), n.jsx("div", { style: { fontSize: 10.5, color: i.sidebarMuted, lineHeight: 1.45, maxHeight: 30, overflow: "hidden" }, children: r.promptPreview }), n.jsxs("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 2 }, children: [n.jsx("button", { type: "button", onClick: () => a(r), disabled: p("run"), style: { ...E, opacity: p("run") ? 0.6 : 1 }, children: p("run") ? "Running..." : "Run Now" }), n.jsx("button", { type: "button", onClick: () => c(r), disabled: p("edit"), style: { ...E, opacity: p("edit") ? 0.6 : 1 }, children: "Edit" }), n.jsx("button", { type: "button", onClick: () => b(r), disabled: p("toggle"), style: { ...E, opacity: p("toggle") ? 0.6 : 1 }, children: p("toggle") ? "Saving..." : r.enabled ? "Pause" : "Resume" }), n.jsx("button", { type: "button", onClick: () => u(r), disabled: p("delete"), style: { ...E, border: x ? "1px solid rgba(196,43,28,0.18)" : "1px solid rgba(255,161,186,0.2)", color: x ? "rgba(120,20,12,0.9)" : "rgba(255,220,228,0.92)", opacity: p("delete") ? 0.6 : 1 }, children: p("delete") ? "Deleting..." : "Delete" })] })] }), n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 3, paddingTop: 1 }, children: [n.jsx("div", { style: { fontSize: 11, fontWeight: 600, color: i.sidebarText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.scheduleLabel || "Unscheduled" }), n.jsx("div", { style: { fontSize: 10.25, color: i.sidebarMuted, lineHeight: 1.45, maxHeight: 30, overflow: "hidden" }, children: r.lastError || r.lastResultPreview || "Prompt scheduler idle." })] }), n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 3, paddingTop: 1, textAlign: "right" }, children: [n.jsx("div", { style: { fontSize: 10.75, fontWeight: 600, color: i.sidebarText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: r.nextRunLabel || "Paused" }), n.jsx("div", { style: { fontSize: 10.25, color: i.sidebarMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: r.nextRunRelativeLabel || "Never" })] }), n.jsxs("div", { style: { display: "grid", gap: 6, justifyItems: "end", paddingTop: 1 }, children: [n.jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 22, padding: "0 10px", borderRadius: g.radius.pill, border: h.border, background: h.background, color: h.color, fontSize: 10.75, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }, children: r.statusLabel || "Idle" }), n.jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 20, padding: "0 9px", borderRadius: g.radius.pill, border: w.border, background: w.background, color: w.color, fontSize: 10.25, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }, children: r.stateLabel || (r.enabled ? "Enabled" : "Paused") })] })] });
}
function AiTaskEditor({ palette: i, draft: r, error: s, busy: l, onChange: a, onScheduleConfigChange: c, onScheduleTypeChange: b, onEnabledChange: u, onCancel: x, onSave: h }) {
  const w = i.mode === "light", p = { width: "100%", borderRadius: 10, border: w ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(214,231,255,0.12)", background: w ? "rgba(255,255,255,0.72)" : "rgba(8,12,24,0.82)", color: i.sidebarText, padding: "7px 9px", fontSize: 11.25, outline: "none", boxSizing: "border-box" }, A = { ...p, minHeight: 72, resize: "vertical", lineHeight: 1.45, fontFamily: "inherit" }, E = { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: w ? "rgba(0,0,0,0.44)" : "rgba(214,231,255,0.4)" };
  return n.jsxs("div", { style: { borderRadius: 12, border: w ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(214,231,255,0.1)", background: w ? "rgba(0,0,0,0.03)" : "rgba(7,10,20,0.72)", padding: 10, display: "grid", gap: 8 }, children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }, children: [n.jsxs("div", { style: { display: "grid", gap: 2 }, children: [n.jsx("div", { style: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: w ? "rgba(0,0,0,0.44)" : "rgba(214,231,255,0.35)" }, children: r.mode === "edit" ? "Edit Task" : "New Task" }), n.jsx("div", { style: { fontSize: 10.5, color: i.sidebarMuted }, children: "Schedule saved Horizons AI prompts." })] }), n.jsx("label", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: i.sidebarMuted }, children: [n.jsx("input", { type: "checkbox", checked: !!r.enabled, onChange: (ie) => u(ie.target.checked) }), "Enabled"] })] }), n.jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px", gap: 8 }, children: [n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Name" }), n.jsx("input", { type: "text", value: r.name, onChange: (ie) => a("name", ie.target.value), placeholder: "Daily memory report", style: p })] }), n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Schedule Type" }), n.jsxs("select", { value: r.scheduleType, onChange: (ie) => b(ie.target.value), style: p, children: [n.jsx("option", { value: "once", children: "Once" }), n.jsx("option", { value: "hourly", children: "Hourly" }), n.jsx("option", { value: "daily", children: "Daily" }), n.jsx("option", { value: "weekly", children: "Weekly" })] })] })] }), n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Prompt" }), n.jsx("textarea", { value: r.prompt, onChange: (ie) => a("prompt", ie.target.value), placeholder: "Summarize active AI runtime pressure and tell me what should be cleaned up.", style: A })] }), r.scheduleType === "once" ? n.jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 132px", gap: 8 }, children: [n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Date" }), n.jsx("input", { type: "date", value: r.scheduleConfig.date || "", onChange: (ie) => c("date", ie.target.value), style: p })] }), n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Time" }), n.jsx("input", { type: "time", value: r.scheduleConfig.time || "09:00", onChange: (ie) => c("time", ie.target.value), style: p })] })] }) : r.scheduleType === "hourly" ? n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Minute Offset" }), n.jsx("input", { type: "number", min: "0", max: "59", value: r.scheduleConfig.minuteOffset ?? 0, onChange: (ie) => c("minuteOffset", Number(ie.target.value || 0)), style: p })] }) : r.scheduleType === "weekly" ? n.jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 132px", gap: 8 }, children: [n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Day" }), n.jsx("select", { value: String(r.scheduleConfig.dayOfWeek ?? 1), onChange: (ie) => c("dayOfWeek", Number(ie.target.value)), style: p, children: aiTaskWeekdays.map(([ie, j]) => n.jsx("option", { value: ie, children: j }, ie)) })] }), n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Time" }), n.jsx("input", { type: "time", value: r.scheduleConfig.time || "09:00", onChange: (ie) => c("time", ie.target.value), style: p })] })] }) : n.jsxs("label", { style: { display: "grid", gap: 4 }, children: [n.jsx("span", { style: E, children: "Time" }), n.jsx("input", { type: "time", value: r.scheduleConfig.time || "09:00", onChange: (ie) => c("time", ie.target.value), style: p })] }), s ? n.jsx("div", { style: { fontSize: 10.5, color: w ? "rgba(120,20,12,0.92)" : "rgba(255,196,210,0.92)", lineHeight: 1.4 }, children: s }) : null, n.jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 6 }, children: [n.jsx("button", { type: "button", onClick: x, disabled: l, style: { height: 24, padding: "0 10px", borderRadius: 999, border: w ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(214,231,255,0.12)", background: "transparent", color: i.sidebarMuted, fontSize: 10.5, cursor: "pointer", outline: "none", opacity: l ? 0.6 : 1 }, children: "Cancel" }), n.jsx("button", { type: "button", onClick: h, disabled: l, style: { height: 24, padding: "0 12px", borderRadius: 999, border: w ? "1px solid rgba(0,120,212,0.35)" : "1px solid rgba(132,212,255,0.24)", background: w ? "rgba(0,120,212,0.12)" : "rgba(132,212,255,0.12)", color: w ? "#0078d4" : "rgba(220,237,255,0.95)", fontSize: 10.5, fontWeight: 600, cursor: "pointer", outline: "none", opacity: l ? 0.6 : 1 }, children: l ? "Saving..." : r.mode === "edit" ? "Save Task" : "Create Task" })] })] });
}
function Mn() {
  var Pt, Wt, zt, Nt, Lt;
  const [i, r] = o.useState(() => Ir()), s = i === "light" ? Dr : Hr, l = s.mode === "light", a = dn(), c = cn();
  o.useEffect(() => {
    Br(i), document.documentElement.classList.toggle("theme-light", i === "light");
  }, [i]);
  const b = o.useMemo(() => $t(), []), [u, x] = o.useState(null), [h, w] = o.useState(null), [p, A] = o.useState(null), [E, ie] = o.useState(null), [j, P] = o.useState(null), [, Qt] = o.useState(null), [le, _] = o.useState(null), [We, Qe] = o.useState(null), [ze, Ze] = o.useState(null), [, et] = o.useState(null), [xe, F] = o.useState(false), [tt, rt] = o.useState(false), [nt, at] = o.useState(false), [de, ot] = o.useState(false), [Ne, Zt] = o.useState(false), [st, er] = o.useState(false), [y, tr] = o.useState("computer"), [V, rr] = o.useState("processes"), [X, nr] = o.useState("all"), [Le, ar] = o.useState("status"), [bn, mn] = o.useState("optimizer"), [ye] = o.useState(b.promptDraft), [ce, it] = o.useState(b.threads), [J] = o.useState(b.activeThreadId), [ve] = o.useState(false), [Q] = o.useState(false), [lt] = o.useState("conversation"), [dt] = o.useState(b.managerFilter), [, Ie] = o.useState(false), [ct, or] = o.useState(false), [ut, pt] = o.useState(false), [sr, gt] = o.useState(false), [L, ir] = o.useState(() => jr()), [O, lr] = o.useState(null), [fn, bt] = o.useState(false), [hn, mt] = o.useState(null), [xn, we] = o.useState(null), [Be, $e] = o.useState([]), De = o.useRef(null), ft = o.useRef(false), ht = o.useRef(false), [xt, dr] = o.useState(null), [cr, ur] = o.useState({ computer: { cpu: [], gpu: [], ram: [] }, ai: { cpu: [], gpu: [], ram: [] } }), [yt, M] = o.useState(null), [S, Se] = o.useState(null), pr = o.useRef(null), gr = o.useRef(null), U = o.useRef(null), I = o.useRef(null), B = o.useRef(null), $ = o.useRef({}), W = o.useRef(null), z = o.useMemo(() => ({ ...Cr(L), showProtected: true }), [L]), He = o.useMemo(() => ce.find((e) => e.id === J) || null, [J, ce]), Z = (He == null ? void 0 : He.messages) || [], br = o.useMemo(() => Z.filter((e) => e.role === "assistant" || e.role === "user"), [Z]);
  const [aiTaskFilter, setAiTaskFilter] = o.useState("all"), [aiTaskSort, setAiTaskSort] = o.useState("nextRun"), [aiTaskDraft, setAiTaskDraft] = o.useState(null), [aiTaskDraftError, setAiTaskDraftError] = o.useState(null), [aiTaskBusyKey, setAiTaskBusyKey] = o.useState(null), applySlotTwoPayload = o.useCallback((e, t = null) => (P(e), Ze(e && e.ok ? null : (e == null ? void 0 : e.error) || t), er(true), e), []);
  o.useEffect(() => {
    Rr(L);
  }, [L]);
  const ke = o.useCallback(async (e = false) => {
    try {
      const t = await oe("/api/task-manager/summary");
      x(t);
    } catch {
    }
  }, []), Ae = o.useCallback(async (e = false) => {
    if (!c || !(a != null && a.getSnapshot)) {
      A(null), w(null), _("Desktop runtime bridge unavailable."), ot(true), e || F(false);
      return;
    }
    e || F(true);
    try {
      const [t, d] = await Promise.allSettled([c.getComputerOverview(z), a.getSnapshot()]);
      if (t.status === "rejected") throw t.reason;
      A(t.value), d.status === "fulfilled" ? w(d.value) : w(null), _(null);
    } catch (t) {
      const d = t instanceof Error ? t.message : String(t);
      _(d);
    } finally {
      ot(true), e || F(false);
    }
  }, [z, a, c]), D = o.useCallback(async (e = false) => {
    e || rt(true);
    try {
      const t = await oe("/api/runtime-manager/ai");
      ie(t), Qe(null);
    } catch (t) {
      const d = t instanceof Error ? t.message : String(t);
      Qe(d);
    } finally {
      Zt(true), e || rt(false);
    }
  }, []), vt = o.useCallback(async (e = false, t = y) => {
    e || at(true);
    try {
      const d = t === "ai" ? "/api/runtime-manager/ai-tasks" : "/api/runtime-manager/windows-services", v = t === "ai" ? "Unable to load AI tasks." : "Unable to load Windows services.", k = await oe(d);
      return applySlotTwoPayload(k, v), k;
    } catch (d) {
      const v = d instanceof Error ? d.message : String(d);
      return Ze(v), null;
    } finally {
      er(true), e || at(false);
    }
  }, [applySlotTwoPayload, y]), H = o.useCallback(async (e = false) => {
    e || bt(true);
    try {
      const t = await oe("/api/optimizer/status");
      lr(t), mt(null);
    } catch (t) {
      const d = t instanceof Error ? t.message : String(t);
      mt(d);
    } finally {
      e || bt(false);
    }
  }, []), ue = o.useCallback(async (e = false) => {
    try {
      const t = await oe("/api/task-manager/actions/pending-approvals");
      $e(It(Array.isArray(t.approvals) ? t.approvals : []));
    } catch {
    }
  }, []), Me = o.useCallback(async (e = false) => {
    try {
      const t = await oe("/api/task-manager/conversations");
      Qt(t), et(null);
    } catch (t) {
      const d = t instanceof Error ? t.message : String(t);
      et(d);
    }
  }, []), G = o.useCallback(async (e = false) => {
    await Promise.all([ke(e), Ae(e), D(e), Me(e), H(e), ue(e), ...V === "services" ? [vt(e, y)] : []]);
  }, [D, Ae, Me, ue, H, ke, vt, V, y]);
  o.useEffect(() => {
    Ae(false);
  }, [Ae]);
  const wt = o.useCallback(async () => {
    await Promise.all([ke(true), D(true), Me(true), H(true), ue(true)]);
  }, [D, Me, ue, H, ke]), ee = o.useMemo(() => {
    var e;
    return (e = h == null ? void 0 : h.processes) != null && e.length && p ? Kr(h, p) : [];
  }, [p, h]), St = !!p && !!((Pt = h == null ? void 0 : h.processes) != null && Pt.length) && ee.length > 0 && !xe && de && !le;
  o.useEffect(() => {
    if (ft.current || !(a != null && a.notifyStartupReady) || !St) return;
    ft.current = true;
    let e = false, t = 0, d = 0;
    return t = window.requestAnimationFrame(() => {
      d = window.requestAnimationFrame(() => {
        var v;
        e || (a.notifyStartupReady({ stage: "process-list", rowCount: ee.length, groupCount: ((v = p == null ? void 0 : p.rows) == null ? void 0 : v.length) ?? 0, hasSnapshot: true }).catch(() => {
        }), ht.current || (ht.current = true, window.setTimeout(() => {
          e || wt();
        }, 120)));
      });
    }), () => {
      e = true, t && window.cancelAnimationFrame(t), d && window.cancelAnimationFrame(d);
    };
  }, [p, le, de, xe, h, a, wt, St, ee.length]), Nr(() => G(true), { enabled: true, pollMs: Ft, backgroundPollMs: Ft * 2, runImmediately: false }), Ke("approvals:changed", (e) => {
    var d;
    const t = e;
    ((d = t == null ? void 0 : t.approval) == null ? void 0 : d.status) === "pending" ? $e((v) => It([t.approval, ...v.filter((k) => k.id !== t.approval.id)])) : t != null && t.approvalId && (t.action === "approved" || t.action === "declined") && $e((v) => v.filter((k) => k.id !== t.approvalId)), ue(true);
  }), Ke("chat:threads-changed", () => {
    const e = $t();
    e.threads && it(e.threads);
  }), Ke("theme:changed", (e) => {
    e && typeof e == "object" && "mode" in e && r(e.mode);
  }), o.useEffect(() => {
    const e = (t) => {
      t.key === _r && r(t.newValue === "light" ? "light" : "dark");
    };
    return window.addEventListener("storage", e), () => window.removeEventListener("storage", e);
  }, []), o.useEffect(() => {
    if (V !== "services") return;
    Se(null), P(null), Ze(null), er(false), void vt(false, y);
  }, [V, y, vt]), o.useEffect(() => {
    if (V !== "services") return;
    y === "ai" ? (["all", "enabled", "paused"].includes(X) || nr("all"), ["nextRun", "name", "lastRun"].includes(Le) || ar("nextRun")) : (["all", "running", "stopped", "disabled"].includes(X) || nr("all"), ["status", "name", "startup"].includes(Le) || ar("status"));
  }, [V, X, Le, y]), o.useEffect(() => {
    var t, d, v;
    const e = ((t = Be[0]) == null ? void 0 : t.id) ?? null;
    e && e !== De.current && (De.current = e, (v = (d = window.horizonsDesktop) == null ? void 0 : d.windowManager) == null || v.openApproval()), e || (De.current = null);
  }, [Be]), o.useEffect(() => {
    Fr({ activeThreadId: J, promptDraft: ye, managerFilter: dt, threads: ce }), Bt("chat:threads-changed");
  }, [J, dt, ce, ye]), o.useEffect(() => {
    if (xt) return W.current != null && window.clearTimeout(W.current), W.current = window.setTimeout(() => {
      dr(null), W.current = null;
    }, 5200), () => {
      W.current != null && (window.clearTimeout(W.current), W.current = null);
    };
  }, [xt]), o.useEffect(() => {
    if (yt) return U.current != null && window.clearTimeout(U.current), U.current = window.setTimeout(() => {
      M(null), U.current = null;
    }, 3200), () => {
      U.current != null && (window.clearTimeout(U.current), U.current = null);
    };
  }, [yt]);
  const kt = o.useCallback(() => {
    W.current != null && (window.clearTimeout(W.current), W.current = null);
  }, []), _e = o.useCallback((e, t) => {
    const d = String(e || "").trim();
    d && it((v) => v.map((k) => k.id === d ? Or(t(k)) : k));
  }, []), N = o.useCallback(() => {
    I.current != null && (window.clearTimeout(I.current), I.current = null);
  }, []), te = o.useCallback(() => {
    B.current != null && (window.clearTimeout(B.current), B.current = null);
  }, []), At = o.useCallback(() => {
    te(), gt(true);
  }, [te]), Te = o.useCallback(() => {
    te(), B.current = window.setTimeout(() => {
      gt(false), B.current = null;
    }, ln);
  }, [te]), Mt = o.useCallback((e = false) => {
    N(), !(Q || !e && ct || ve) && (I.current = window.setTimeout(() => {
      Ie(false), I.current = null;
    }, on));
  }, [ct, ve, Q, N]), re = o.useCallback((e) => {
    if (e) {
      const t = $.current[e];
      if (!t) return;
      t.fade != null && window.clearTimeout(t.fade), t.remove != null && window.clearTimeout(t.remove), delete $.current[e];
      return;
    }
    Object.keys($.current).forEach((t) => {
      const d = $.current[t];
      d.fade != null && window.clearTimeout(d.fade), d.remove != null && window.clearTimeout(d.remove);
    }), $.current = {};
  }, []);
  o.useEffect(() => {
    const e = J;
    if (!e) return;
    const t = Z.filter((d) => d.role === "assistant" && (d.pending || d.drawerVisible === true));
    t.length > 0 && (N(), pt(true)), t.forEach((d) => {
      if (d.pending || d.drawerPersistent || typeof d.drawerExpiresAt != "number") {
        re(d.id);
        return;
      }
      if ($.current[d.id]) return;
      const v = Math.max(0, d.drawerExpiresAt - Date.now()), k = Math.max(0, v - sn), ae = window.setTimeout(() => {
        _e(e, (f) => ({ ...f, messages: f.messages.map((T) => T.id === d.id ? { ...T, drawerFading: true } : T) }));
      }, k), K = window.setTimeout(() => {
        _e(e, (f) => ({ ...f, messages: f.messages.map((T) => T.id === d.id ? { ...T, drawerVisible: false, drawerFading: false, drawerExpiresAt: null } : T) })), re(d.id);
      }, v);
      $.current[d.id] = { fade: ae, remove: K };
    }), Object.keys($.current).forEach((d) => {
      t.some((k) => k.id === d && !k.pending && !k.drawerPersistent && typeof k.drawerExpiresAt == "number") || re(d);
    });
  }, [J, Z, N, re, _e]), o.useEffect(() => {
    var t;
    const e = Z.some((d) => d.role === "assistant" && (d.pending || d.drawerVisible === true));
    if (Q || e || ve || ye.trim().length > 0) {
      N();
      return;
    }
    ut && (N(), (t = pr.current) == null || t.blur(), pt(false), or(false), Ie(false));
  }, [ut, Z, ve, Q, N, ye]), o.useEffect(() => {
    if (!Q || lt !== "conversation") return;
    const e = gr.current;
    e && e.scrollTo({ top: e.scrollHeight, behavior: "smooth" });
  }, [lt, br, Q]), o.useEffect(() => () => {
    I.current != null && (window.clearTimeout(I.current), I.current = null), B.current != null && (window.clearTimeout(B.current), B.current = null), kt(), re();
  }, [re, kt]);
  const openAiTaskPlanner = o.useCallback(async (e, t = {}) => {
    var d, v, k, ae;
    const f = (ae = (k = window.horizonsDesktop) == null ? void 0 : k.broadcast) == null ? void 0 : ae.send, T = async () => {
      if (!f) return;
      try {
        await f(e, t);
      } catch {
      }
    };
    try {
      await (((v = (d = window.horizonsDesktop) == null ? void 0 : d.windowManager) == null ? void 0 : v.openTasks) ? v.openTasks() : (v == null ? void 0 : v.open) ? v.open("tasks") : Promise.resolve());
    } catch {
    }
    try {
      await (((v = (d = window.horizonsDesktop) == null ? void 0 : d.windowManager) == null ? void 0 : v.focusTasks) ? v.focusTasks() : (v == null ? void 0 : v.focus) ? v.focus("tasks") : Promise.resolve());
    } catch {
    }
    T(), [180, 520, 1200].forEach((R) => {
      window.setTimeout(() => {
        T();
      }, R);
    });
  }, []), openNewAiTaskDraft = o.useCallback(() => {
    setAiTaskDraft(null), setAiTaskDraftError(null), openAiTaskPlanner("ai-tasks:compose-open", { source: "main-shell" }), M("Opened Task Scheduler.");
  }, [M, openAiTaskPlanner]), openEditAiTaskDraft = o.useCallback((e) => {
    setAiTaskDraft(null), setAiTaskDraftError(null), openAiTaskPlanner("ai-tasks:select-task", { taskId: e.id, mode: "edit", source: "main-shell" }), M(`Opened ${e.name} in Task Scheduler.`);
  }, [M, openAiTaskPlanner]), closeAiTaskDraft = o.useCallback(() => {
    setAiTaskDraft(null), setAiTaskDraftError(null);
  }, []), updateAiTaskDraftField = o.useCallback((e, t) => {
    setAiTaskDraft((d) => d ? { ...d, [e]: t } : d), setAiTaskDraftError(null);
  }, []), updateAiTaskDraftScheduleConfig = o.useCallback((e, t) => {
    setAiTaskDraft((d) => d ? { ...d, scheduleConfig: { ...d.scheduleConfig, [e]: t } } : d), setAiTaskDraftError(null);
  }, []), updateAiTaskDraftType = o.useCallback((e) => {
    setAiTaskDraft((t) => t ? { ...t, scheduleType: e, scheduleConfig: createScheduleConfigForType(e, t.scheduleConfig || {}) } : t), setAiTaskDraftError(null);
  }, []), saveAiTaskDraft = o.useCallback(async () => {
    if (!aiTaskDraft) return;
    const e = { name: aiTaskDraft.name, prompt: aiTaskDraft.prompt, scheduleType: aiTaskDraft.scheduleType, scheduleConfig: aiTaskDraft.scheduleConfig, enabled: aiTaskDraft.enabled };
    setAiTaskBusyKey(aiTaskDraft.id ? `editor:${aiTaskDraft.id}` : "editor:create");
    try {
      const t = aiTaskDraft.id ? await Ut(`/api/runtime-manager/ai-tasks/${encodeURIComponent(aiTaskDraft.id)}`, e) : await Ut("/api/runtime-manager/ai-tasks", e);
      applySlotTwoPayload(t, "Unable to save AI task."), closeAiTaskDraft(), M(aiTaskDraft.id ? "AI task updated." : "AI task created.");
    } catch (t) {
      setAiTaskDraftError(t instanceof Error ? t.message : String(t));
    } finally {
      setAiTaskBusyKey(null);
    }
  }, [aiTaskDraft, applySlotTwoPayload, closeAiTaskDraft]), runAiTask = o.useCallback(async (e) => {
    setAiTaskBusyKey(`${e.id}:run`);
    try {
      const t = await Ut(`/api/runtime-manager/ai-tasks/${encodeURIComponent(e.id)}/run`, {});
      applySlotTwoPayload(t, "Unable to run the selected AI task."), M(`${e.name}: run completed.`);
    } catch (t) {
      M(t instanceof Error ? t.message : String(t));
    } finally {
      setAiTaskBusyKey(null);
    }
  }, [applySlotTwoPayload]), toggleAiTaskEnabled = o.useCallback(async (e) => {
    setAiTaskBusyKey(`${e.id}:toggle`);
    try {
      const t = await Ut(`/api/runtime-manager/ai-tasks/${encodeURIComponent(e.id)}`, { enabled: !e.enabled });
      applySlotTwoPayload(t, "Unable to update the selected AI task."), M(`${e.name}: ${e.enabled ? "paused" : "resumed"}.`);
    } catch (t) {
      M(t instanceof Error ? t.message : String(t));
    } finally {
      setAiTaskBusyKey(null);
    }
  }, [applySlotTwoPayload]), deleteAiTaskRow = o.useCallback(async (e) => {
    setAiTaskBusyKey(`${e.id}:delete`);
    try {
      const t = await Ut(`/api/runtime-manager/ai-tasks/${encodeURIComponent(e.id)}/delete`, {});
      applySlotTwoPayload(t, "Unable to delete the selected AI task."), setAiTaskDraft((d) => d && d.id === e.id ? null : d), setAiTaskDraftError(null), M(`${e.name}: deleted.`);
    } catch (t) {
      M(t instanceof Error ? t.message : String(t));
    } finally {
      setAiTaskBusyKey(null);
    }
  }, [applySlotTwoPayload]);
  const mr = o.useMemo(() => $r(s), [s]), R = o.useMemo(() => Er(p), [p]), C = o.useMemo(() => Pr(E), [E]), Fe = y === "computer" ? R : C, m = y === "computer" ? (R == null ? void 0 : R.summary) ?? null : (C == null ? void 0 : C.summary) ?? null, pe = (m == null ? void 0 : m.cpuPercent) ?? 0, ge = (m == null ? void 0 : m.gpuPercent) ?? 0, Oe = (m == null ? void 0 : m.ramUsedBytes) ?? 0, je = (m == null ? void 0 : m.ramTotalBytes) ?? 0, be = je > 0 ? Oe / je * 100 : 0, Ue = o.useMemo(() => ee.length ? ee : qr((R == null ? void 0 : R.rows) || [], L), [R == null ? void 0 : R.rows, ee, L]), Ge = o.useMemo(() => Vr((C == null ? void 0 : C.rows) || [], L), [C == null ? void 0 : C.rows, L]), Y = y === "computer" ? Ue : Ge, isAiTaskSurface = y === "ai" && V === "services", me = o.useMemo(() => isAiTaskSurface ? [] : [...(Array.isArray(j == null ? void 0 : j.rows) ? j.rows : []).filter((d) => pn(d, X))].sort((d, v) => gn(d, v, Le)), [X, j == null ? void 0 : j.rows, Le, isAiTaskSurface]), aiTaskRows = o.useMemo(() => isAiTaskSurface ? [...(Array.isArray(j == null ? void 0 : j.rows) ? j.rows : []).filter((d) => matchesAiTaskFilter(d, aiTaskFilter))].sort((d, v) => compareAiTaskRows(d, v, aiTaskSort)) : [], [aiTaskFilter, aiTaskSort, j == null ? void 0 : j.rows, isAiTaskSurface]), Ce = o.useMemo(() => isAiTaskSurface ? ze ? { title: "Unable to load AI tasks", detail: `${ze} Try Refresh to retry.`, tone: "error" } : nt && !aiTaskRows.length ? { title: "Loading tasks", detail: "Reading scheduled Horizons AI prompts.", tone: "neutral" } : st ? aiTaskRows.length ? null : { title: "No scheduled AI tasks yet", detail: "Use New Task to schedule saved Horizons AI prompts.", tone: "warning" } : { title: "Loading tasks", detail: "Reading scheduled Horizons AI prompts.", tone: "neutral" } : ze ? { title: "Unable to load Windows services", detail: `${ze} Try Refresh to retry.`, tone: "error" } : nt && !me.length ? { title: "Loading services", detail: "Querying the local Windows Service Control Manager.", tone: "neutral" } : st ? me.length ? null : { title: "No services match the current filter", detail: "Try changing the filter or use Refresh to query the machine again.", tone: "warning" } : { title: "Loading services", detail: "Querying the local Windows Service Control Manager.", tone: "neutral" }, [aiTaskRows.length, isAiTaskSurface, me.length, nt, st, ze]), q = o.useMemo(() => y === "computer" ? c ? xe && !de ? { title: "Loading Processes", detail: "Collecting live process telemetry from the desktop runtime.", tone: "neutral" } : le ? { title: "Computer Telemetry Error", detail: le, tone: "error" } : de ? Ue.length ? null : { title: "No Processes Reported", detail: "The desktop runtime did not return any live processes yet.", tone: "warning" } : { title: "Loading Processes", detail: "Collecting live process telemetry from the desktop runtime.", tone: "neutral" } : { title: "Desktop Unavailable", detail: "The My PC view needs the Windows desktop runtime bridge to stream live process telemetry.", tone: "warning" } : tt && !Ne ? { title: "Loading AI Runtime", detail: "Fetching live AI runtime telemetry from the taskmanager API.", tone: "neutral" } : We ? { title: "AI Runtime Error", detail: We, tone: "error" } : Ne ? Ge.length ? null : { title: "No AI Tasks Reported", detail: "The taskmanager API returned no AI runtime rows yet.", tone: "warning" } : { title: "Loading AI Runtime", detail: "Fetching live AI runtime telemetry from the taskmanager API.", tone: "neutral" }, [We, Ne, tt, le, de, xe, c, Ge.length, Ue.length, y]), fr = ((Wt = R == null ? void 0 : R.pressure) == null ? void 0 : Wt.level) || "", hr = ((zt = u == null ? void 0 : u.pressureLevel) == null ? void 0 : zt.trim()) || ((Nt = C == null ? void 0 : C.pressure) == null ? void 0 : Nt.level) || "", Ye = (y === "computer" ? fr : hr).trim(), Tt = y === "ai" && ((Lt = u == null ? void 0 : u.sessionMode) == null ? void 0 : Lt.trim()) || "", Re = y === "ai" && ((C == null ? void 0 : C.footer.providerLabel) || (u == null ? void 0 : u.providerLabel)) || null;
  o.useEffect(() => {
    m != null && m.capturedAt && ur((e) => ({ ...e, [y]: { cpu: Xe(e[y].cpu, pe), gpu: Xe(e[y].gpu, ge), ram: Xe(e[y].ram, be) } }));
  }, [m == null ? void 0 : m.capturedAt, pe, ge, be, y]), o.useCallback(async () => {
    if (O) {
      we("kill-switch");
      try {
        await Ut("/api/optimizer/kill-switch", { active: !O.killSwitchActive }), await H(true), M(O.killSwitchActive ? "Automatic actions resumed." : "Automatic actions paused.");
      } catch (e) {
        M(e instanceof Error ? e.message : String(e));
      } finally {
        we(null);
      }
    }
  }, [H, O]), o.useCallback(async (e) => {
    we("performance-mode");
    try {
      await Ut("/api/optimizer/performance-mode", { mode: e }), await H(true), M(`Optimizer mode set to ${Ee(e)}.`);
    } catch (t) {
      M(t instanceof Error ? t.message : String(t));
    } finally {
      we(null);
    }
  }, [H]), o.useCallback((e) => {
    ir((t) => ({ ...t, ...e }));
  }, []), o.useCallback(async () => {
    if (!(c != null && c.scan)) {
      await G(false), M("Runtime scan refreshed available shell data.");
      return;
    }
    F(true);
    try {
      const e = await c.scan(z);
      A(e), _(null), await D(true), M("Runtime scan completed.");
    } catch (e) {
      const t = e instanceof Error ? e.message : String(e);
      _(t), M(t);
    } finally {
      F(false);
    }
  }, [z, c, D, G]), o.useCallback(async () => {
    var e;
    if (!(c != null && c.optimize)) {
      M("Optimization is only available in the Windows desktop build.");
      return;
    }
    F(true);
    try {
      const t = await c.optimize(z);
      t != null && t.overview && A(t.overview), _(null), await D(true), M((e = t == null ? void 0 : t.actionsApplied) != null && e.length ? `Optimize completed: ${t.actionsApplied.map((d) => `${d.name || "Task"} ${d.action || "updated"}`).join(", ")}` : "Optimize completed with no safe actions required.");
    } catch (t) {
      const d = t instanceof Error ? t.message : String(t);
      _(d), M(d);
    } finally {
      F(false);
    }
  }, [z, c, D]);
  const xr = o.useMemo(() => {
    var K;
    if (!S) return [];
    const { row: e } = S, t = new Set([...e.safeActions || [], ...e.actions || []].map(String)), d = !!(e.groupId && c || (e.groupId || (K = e.pids) != null && K.length || e.pid) && (a != null && a.stopGroup)), v = !e.isProtected && !!e.groupId && t.has("lower-priority") && !!c, k = !e.isProtected && !!e.groupId && t.has("suspend") && !!c, ae = !!(e.path && (a != null && a.revealPath));
    return [{ id: "end-task", label: "End task", icon: "stop", tone: "warning", disabled: !d || !!e.isProtected }, { id: "end-tree", label: "End process tree", icon: "stop", tone: "warning", disabled: !d || !!e.isProtected }, { id: "efficiency-mode", label: "Efficiency mode", icon: "efficiency", separatorBefore: true, disabled: !v }, { id: "open-file-location", label: "Open file location", icon: "location", disabled: !ae }, { id: "search-online", label: "Search online", icon: "search", disabled: !e.name }, { id: "properties", label: "Properties", icon: "rename", separatorBefore: true }, { id: "go-to-details", label: "Go to details", icon: "details" }, { id: "suspend", label: "Suspend", icon: "suspend", separatorBefore: true, disabled: !k }];
  }, [a, c, S]), ne = cr[y], qe = o.useMemo(() => Y.filter((e) => (e.intensity || 0) >= 68).length, [Y]), yr = (m == null ? void 0 : m.capturedAt) || (y === "computer" ? p == null ? void 0 : p.capturedAt : E == null ? void 0 : E.capturedAt) || (u == null ? void 0 : u.capturedAt) || null;
  un(yr);
  const vr = o.useMemo(() => [`${Y.length} ${y === "computer" ? "processes" : "AI groups"}`, `${qe} hot`, Ye ? Ee(Ye) : "System stable", Ee(y === "ai" ? Tt || Re || "AI idle" : Re || "AI idle")], [qe, Ye, Re, Y.length, Tt, y]);
  Fe != null && Fe.recommendations;
  const wr = y === "computer" ? "Process Monitor" : isAiTaskSurface ? "AI Tasks" : "AI Runtime", Sr = isAiTaskSurface ? Ce ? Ce.detail : "Schedule saved Horizons AI prompts." : q ? q.tone === "neutral" ? y === "computer" ? "Scanning active processes..." : "Reading AI runtime..." : q.detail : y === "computer" ? "Scanning active processes..." : "Watching active AI runtime groups...", jt = y === "computer" ? `${Y.length} visible groups \xB7 ${qe} hot` : `${(m == null ? void 0 : m.activeTaskCount) || Y.length} active groups`, Ct = m != null && m.vramTotalBytes ? `${he(m.vramUsedBytes)} / ${he(m.vramTotalBytes)} VRAM` : Re || "GPU telemetry standby", Rt = m ? `${he(Oe)} / ${he(je)}` : "Memory telemetry standby", kr = o.useMemo(() => [{ key: "cpu", label: y === "computer" ? "CPU" : "Compute", value: m ? Ve(pe) : "--", percent: pe, secondary: jt, history: ne.cpu }, { key: "gpu", label: y === "computer" ? "GPU" : "Accelerator", value: m ? Ve(ge) : "--", percent: ge, secondary: Ct, history: ne.gpu }, { key: "memory", label: "Memory", value: m ? Ve(be) : "--", percent: be, secondary: Rt, history: ne.ram }], [m, ne.cpu, ne.gpu, ne.ram, pe, jt, ge, Ct, be, je, Oe, Rt, y]);
  o.useEffect(() => {
    a != null && a.setWindowLayout && a.setWindowLayout({ mode: "collapsed" }).catch(() => {
    });
  }, [a]);
  const Et = (e) => {
    var t, d;
    (d = (t = window.horizonsDesktop) == null ? void 0 : t.windowManager) == null || d.openDev();
  }, Ar = o.useCallback(async (e, t) => {
    var ae, K;
    const d = e.processName || e.name || "Task", v = e.groupId || null, k = Array.isArray(e.pids) ? e.pids.map((f) => Number(f)).filter((f) => Number.isFinite(f) && f > 0) : e.pid && Number.isFinite(Number(e.pid)) ? [Number(e.pid)] : [];
    try {
      if (t === "go-to-details") {
        Et("runtime"), M(`Showing details for ${d}.`);
        return;
      }
      if (t === "properties") {
        Et("developer"), M(`Opened Developer Mode for ${d}.`);
        return;
      }
      if (t === "search-online") {
        const f = encodeURIComponent(String(d).trim());
        window.open(`https://www.bing.com/search?q=${f}`, "_blank", "noopener,noreferrer"), M(`Searching the web for ${d}.`);
        return;
      }
      if (t === "open-file-location") {
        if (!(a != null && a.revealPath) || !e.path) throw new Error("No file location is available for this task.");
        const f = await a.revealPath({ path: e.path });
        if (!f.ok) throw new Error(f.error || "Unable to reveal the file location.");
        M(`Revealed ${d} on disk.`);
        return;
      }
      if (t === "efficiency-mode" || t === "suspend") {
        if (!c || !v) throw new Error("That action is not available for this task.");
        const f = t === "efficiency-mode" ? "lower-priority" : "suspend", T = await c.applyAction({ ...z, groupId: v, action: f });
        if (T != null && T.error) throw new Error(T.error);
        if ((T == null ? void 0 : T.ok) === false) throw new Error(`Unable to ${t.replace(/-/g, " ")}.`);
        await G(true), M(`${d}: ${t === "efficiency-mode" ? "efficiency mode applied" : "suspended"}.`);
        return;
      }
      if (t === "end-task" || t === "end-tree") {
        if (c && v) {
          const f = await c.applyAction({ ...z, groupId: v, action: "end" });
          if (f != null && f.error) throw new Error(f.error);
          if ((f == null ? void 0 : f.ok) === false) throw new Error("Unable to end the selected task.");
          await G(true), M(`${d}: ended.`);
          return;
        }
        if (a != null && a.stopGroup && k.length) {
          const f = await a.stopGroup({ groupId: v || e.id || `pid-${k[0]}`, pids: k });
          if (!f.ok) {
            const T = ((K = (ae = f.errors) == null ? void 0 : ae[0]) == null ? void 0 : K.error) || "Unable to stop the selected task.";
            throw new Error(T);
          }
          await G(true), M(`${d}: ended.`);
          return;
        }
        throw new Error("No task stop bridge is available.");
      }
    } catch (f) {
      const T = f instanceof Error ? f.message : String(f);
      M(T);
    }
  }, [z, a, c, G]), Mr = o.useCallback(() => {
    N(), te(), Ie(true);
  }, [N, te]), Tr = o.useCallback(() => {
    Mt(), Te();
  }, [Mt, Te]);
  const aiTaskContent = n.jsxs("div", { style: { minHeight: 0, display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: 6 }, children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, padding: "0 4px 4px", flexWrap: "wrap" }, children: [n.jsx("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" }, children: [["all", aiTaskFilterLabels.all], ["enabled", aiTaskFilterLabels.enabled], ["paused", aiTaskFilterLabels.paused]].map(([e, t]) => n.jsx("button", { type: "button", onClick: () => setAiTaskFilter(e), style: { height: 20, padding: "0 7px", borderRadius: 999, border: aiTaskFilter === e ? l ? "1px solid rgba(0,120,212,0.4)" : "1px solid rgba(132,212,255,0.35)" : l ? "1px solid rgba(0,0,0,0.13)" : "1px solid rgba(214,231,255,0.12)", background: aiTaskFilter === e ? l ? "rgba(0,120,212,0.1)" : "rgba(132,212,255,0.12)" : "transparent", color: aiTaskFilter === e ? l ? "#0078d4" : "rgba(132,212,255,0.95)" : s.sidebarMuted, fontSize: 10, fontWeight: aiTaskFilter === e ? 600 : 400, letterSpacing: "0.03em", cursor: "pointer", outline: "none", whiteSpace: "nowrap" }, children: t }, e)) }), n.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }, children: [n.jsxs("select", { "data-tm-focusable": "true", value: aiTaskSort, onChange: (e) => setAiTaskSort(e.target.value), style: { height: 20, borderRadius: 999, border: l ? "1px solid rgba(0,0,0,0.13)" : "1px solid rgba(214,231,255,0.12)", background: l ? "rgba(0,0,0,0.04)" : "rgba(20,24,40,0.85)", color: s.sidebarMuted, padding: "0 6px", fontSize: 10, outline: "none", cursor: "pointer", flexShrink: 0 }, children: [n.jsx("option", { value: "nextRun", children: aiTaskSortLabels.nextRun }), n.jsx("option", { value: "name", children: aiTaskSortLabels.name }), n.jsx("option", { value: "lastRun", children: aiTaskSortLabels.lastRun })] }), n.jsx("button", { type: "button", onClick: openNewAiTaskDraft, style: { height: 20, padding: "0 9px", borderRadius: 999, border: l ? "1px solid rgba(0,120,212,0.36)" : "1px solid rgba(132,212,255,0.26)", background: l ? "rgba(0,120,212,0.12)" : "rgba(132,212,255,0.12)", color: l ? "#0078d4" : "rgba(220,237,255,0.95)", fontSize: 10.25, fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap" }, children: "New Task" })] })] }), n.jsx("div", { style: { borderRadius: 10, border: l ? "1px solid rgba(0,0,0,0.09)" : "1px solid rgba(214,231,255,0.08)", background: l ? "rgba(0,0,0,0.04)" : "rgba(6,10,20,0.82)", overflow: "hidden", minHeight: 0 }, children: n.jsxs("div", { style: { padding: "0 4px 5px", display: "grid", gap: 1, maxHeight: 400, overflowY: "auto" }, children: [n.jsxs("div", { style: { display: "grid", gridTemplateColumns: "20px minmax(0, 1.55fr) minmax(0, 0.9fr) 88px 96px", alignItems: "center", gap: g.spacing.tight, padding: "4px 2px", borderBottom: l ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(214,231,255,0.08)", background: l ? "rgba(244,247,252,0.98)" : "rgba(20,23,38,0.98)", position: "sticky", top: 0, zIndex: 1 }, children: [n.jsx("span", {}), n.jsx("span", { style: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)", minWidth: 0 }, children: "Task" }), n.jsx("span", { style: { fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)" }, children: "Schedule" }), n.jsx("span", { style: { fontSize: 10, textAlign: "right", letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)" }, children: "Next Run" }), n.jsx("span", { style: { fontSize: 10, textAlign: "right", letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)" }, children: "Status" })] }), n.jsx("div", { style: { display: "grid", gap: 1, padding: "3px 0 12px" }, children: Ce ? n.jsx(_t, { palette: s, title: Ce.title, detail: Ce.detail, tone: Ce.tone }) : aiTaskRows.length > 0 ? aiTaskRows.map((e, t) => n.jsx(AiTaskRow, { palette: s, row: e, index: t, busyKey: aiTaskBusyKey, onRunNow: runAiTask, onEdit: openEditAiTaskDraft, onToggleEnabled: toggleAiTaskEnabled, onDelete: deleteAiTaskRow }, e.id)) : null })] }) })] });
  return n.jsx(n.Fragment, { children: n.jsx("div", { style: { ...mr, height: "100vh", minHeight: "100vh", overflow: "hidden", fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif" }, children: n.jsxs("div", { style: { height: "100%", position: "relative", overflow: "hidden", padding: 8, boxSizing: "border-box" }, children: [n.jsx("div", { "aria-hidden": "true", style: { position: "absolute", inset: 8, borderRadius: g.radius.shell, border: l ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(151,209,255,0.14)", background: l ? "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))" : "linear-gradient(180deg, rgba(9,14,26,0.58), rgba(6,10,18,0.28))", boxShadow: l ? "inset 0 1px 0 rgba(255,255,255,0.65)" : "inset 0 1px 0 rgba(255,255,255,0.03)", pointerEvents: "none" } }), n.jsx("div", { "aria-hidden": "true", style: { position: "absolute", top: 32, right: 42, width: "min(54vw, 860px)", height: "min(78vh, 760px)", borderRadius: 34, background: l ? "radial-gradient(circle at 28% 18%, rgba(0,120,212,0.12), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))" : "radial-gradient(circle at 26% 16%, rgba(88,118,218,0.22), transparent 32%), radial-gradient(circle at 74% 68%, rgba(70,94,168,0.16), transparent 28%), linear-gradient(180deg, rgba(18,24,42,0.22), rgba(8,12,20,0.08))", boxShadow: l ? "none" : "inset 0 1px 0 rgba(255,255,255,0.03)", opacity: 0.9, pointerEvents: "none" } }), n.jsxs("div", { style: { height: "100%", width: `min(100%, ${Ot}px)`, maxWidth: `${Ot}px`, display: "grid", gridTemplateRows: "minmax(0, 1fr) auto", gap: 8 }, onMouseEnter: Mr, onMouseLeave: Tr, children: [n.jsxs("section", { style: { minHeight: 0, borderRadius: 16, border: l ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(151,209,255,0.18)", background: l ? "rgba(255,255,255,0.88)" : "rgba(6,11,22,0.76)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", boxShadow: l ? "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)" : "0 24px 56px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)", color: s.sidebarText, padding: "9px", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", position: "relative" }, children: [n.jsxs("div", { className: "tm-drag-region", onMouseDown: nn, style: { display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" }, children: [n.jsxs("div", { style: { display: "grid", gap: 4 }, children: [n.jsx("div", { style: { fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: s.sidebarMuted, whiteSpace: "nowrap" }, children: "Horizons" }), n.jsx("div", { style: { fontSize: 13.5, fontWeight: 650, color: s.appHeaderText, whiteSpace: "nowrap" }, children: "Task Manager" })] }), n.jsx("div", { style: { display: "flex", justifyContent: "center" }, children: n.jsx("div", { className: "tm-no-drag", style: { ...fe, display: "flex", gap: 2, padding: 2, borderRadius: g.radius.control, background: s.sidebarControlBg, border: s.sidebarBtnBorder }, children: ["computer", "ai"].map((e) => {
    const t = y === e;
    return n.jsx("button", { className: "tm-no-drag", "data-tm-button": "true", "data-tm-focusable": "true", type: "button", onClick: () => tr(e), style: { ...fe, height: g.controlHeights.compactButton, padding: "0 12px", borderRadius: g.radius.compact, border: "none", background: t ? l ? "#0078d4" : s.sidebarAccentStrongBg : "transparent", color: t ? l ? "#ffffff" : "rgba(246,249,255,0.95)" : l ? "rgba(0,0,0,0.5)" : "rgba(180,200,255,0.48)", cursor: "pointer", fontSize: 12, fontWeight: t ? 600 : 500, outline: "none" }, children: e === "computer" ? "PC" : "AI" }, e);
  }) }) }), n.jsxs("div", { style: { display: "flex", alignItems: "center", gap: g.spacing.micro }, children: [n.jsx("button", { className: "tm-no-drag", "data-tm-button": "true", "data-tm-focusable": "true", type: "button", title: l ? "Switch to dark mode" : "Switch to light mode", "aria-label": l ? "Switch to dark mode" : "Switch to light mode", onClick: () => r((e) => {
    const t = e === "dark" ? "light" : "dark";
    return Bt("theme:changed", { mode: t }), t;
  }), style: { ...fe, width: g.controlHeights.toolbar, height: g.controlHeights.toolbar, borderRadius: g.radius.pill, border: s.sidebarBtnBorder, background: s.sidebarControlBg, color: l ? "rgba(0,0,0,0.65)" : "rgba(232,239,255,0.82)", cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0, outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }, children: l ? n.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [n.jsx("circle", { cx: "8", cy: "8", r: "6", stroke: "currentColor", strokeWidth: "1.5" }), n.jsx("path", { d: "M8 2a6 6 0 0 1 0 12", fill: "currentColor" })] }) : n.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [n.jsx("circle", { cx: "8", cy: "8", r: "4", stroke: "currentColor", strokeWidth: "1.5" }), n.jsx("line", { x1: "8", y1: "0.5", x2: "8", y2: "3", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "8", y1: "13", x2: "8", y2: "15.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "0.5", y1: "8", x2: "3", y2: "8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "13", y1: "8", x2: "15.5", y2: "8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "2.93", y1: "2.93", x2: "4.7", y2: "4.7", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "11.3", y1: "11.3", x2: "13.07", y2: "13.07", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "2.93", y1: "13.07", x2: "4.7", y2: "11.3", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "11.3", y1: "4.7", x2: "13.07", y2: "2.93", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })] }) }), n.jsx("button", { className: "tm-no-drag", "data-tm-button": "true", "data-tm-focusable": "true", type: "button", title: "Minimize", "aria-label": "Minimize", onClick: () => {
    var e;
    (e = a == null ? void 0 : a.minimizeWindow) == null || e.call(a);
  }, style: { ...fe, width: g.controlHeights.toolbar, height: g.controlHeights.toolbar, borderRadius: g.radius.pill, border: s.sidebarBtnBorder, background: s.sidebarControlBg, color: l ? "rgba(0,0,0,0.65)" : "rgba(232,239,255,0.82)", cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0, outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }, children: n.jsx("svg", { width: "10", height: "2", viewBox: "0 0 10 2", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: n.jsx("line", { x1: "1", y1: "1", x2: "9", y2: "1", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) }) }), n.jsx("button", { className: "tm-no-drag", "data-tm-button": "true", "data-tm-focusable": "true", type: "button", title: "Close", "aria-label": "Close", onClick: () => {
    var e;
    (e = a == null ? void 0 : a.closeWindow) == null || e.call(a);
  }, style: { ...fe, width: g.controlHeights.toolbar, height: g.controlHeights.toolbar, borderRadius: g.radius.pill, border: l ? "1px solid rgba(180,0,0,0.18)" : "1px solid rgba(255,255,255,0.07)", background: l ? "rgba(196,43,28,0.85)" : "rgba(190,58,58,0.5)", color: "rgba(255,244,244,0.97)", cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0, outline: "none", display: "flex", alignItems: "center", justifyContent: "center" }, children: n.jsxs("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [n.jsx("line", { x1: "1", y1: "1", x2: "9", y2: "9", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), n.jsx("line", { x1: "9", y1: "1", x2: "1", y2: "9", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })] }) })] })] }), n.jsx("div", { style: { display: "flex", gap: 4, flexWrap: "nowrap", alignItems: "center", overflow: "hidden" }, children: vr.map((e, t) => n.jsx("span", { style: { display: "inline-flex", alignItems: "center", minHeight: g.controlHeights.chip, padding: "0 8px", borderRadius: g.radius.pill, border: s.sidebarBtnBorder, background: s.sidebarControlBg, color: t === 0 ? s.sidebarText : (t >= 3, s.sidebarMuted), opacity: t === 0 ? 0.85 : t >= 3 ? 0.7 : 1, fontSize: g.typography.eyebrow, lineHeight: 1.2, whiteSpace: "nowrap" }, children: e }, e)) }), n.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }, children: kr.map((e) => n.jsx(rn, { label: e.label, value: e.value, percent: e.percent, secondary: e.secondary, history: e.history, palette: s, compact: true }, e.key)) }), n.jsx("div", { style: { flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "minmax(0, 1fr)" }, children: n.jsxs("div", { style: { minHeight: 0, borderRadius: g.radius.section, border: l ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(214,231,255,0.1)", background: l ? "rgba(0,0,0,0.035)" : "rgba(4,8,16,0.62)", boxShadow: l ? "inset 0 1px 3px rgba(0,0,0,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.03)", padding: "6px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: g.spacing.tightMicro, overflow: "hidden" }, children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: g.spacing.row, padding: "2px 3px 5px", borderBottom: l ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(214,231,255,0.06)" }, children: [n.jsxs("div", { style: { minWidth: 0, display: "grid", gap: 3 }, children: [n.jsx("div", { style: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.44)" : "rgba(214,231,255,0.35)" }, children: wr }), n.jsx("div", { style: { fontSize: 10.5, lineHeight: 1.25, color: s.sidebarMuted }, children: Sr })] }), n.jsx("div", { style: { display: "flex", gap: 2, padding: 2, borderRadius: g.radius.compact, background: l ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", border: l ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)" }, children: ["processes", "services"].map((e) => {
    const t = V === e;
    return n.jsx("button", { type: "button", onClick: () => rr(e), style: { height: 22, padding: "0 10px", borderRadius: g.radius.compact - 2, border: "none", background: t ? l ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" : "transparent", color: t ? l ? "rgba(0,0,0,0.8)" : "rgba(232,239,255,0.88)" : l ? "rgba(0,0,0,0.4)" : "rgba(214,231,255,0.42)", cursor: "pointer", fontSize: 10.5, fontWeight: t ? 600 : 500, letterSpacing: "0.04em", outline: "none", textTransform: "capitalize" }, children: e === "processes" ? "Processes" : y === "computer" ? "Services" : "Tasks" }, e);
  }) })] }), V === "processes" ? n.jsxs(n.Fragment, { children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", gap: g.spacing.tight, padding: "0 4px 4px", borderBottom: l ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(214,231,255,0.06)" }, children: [n.jsx("span", { style: { flex: 1, minWidth: 0, paddingLeft: 24, fontSize: g.typography.eyebrow, letterSpacing: "0.1em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.38)" }, children: "Task" }), n.jsx("span", { style: { minWidth: 64, textAlign: "right", fontSize: g.typography.eyebrow, letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.38)" }, children: "Metric" }), n.jsx("span", { style: { width: 32, textAlign: "right", fontSize: g.typography.eyebrow, letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.38)" }, children: "Load" })] }), n.jsxs("div", { style: { position: "relative", minHeight: 0, overflow: "hidden" }, children: [n.jsx("div", { style: { height: "100%", overflowY: "auto", paddingRight: an, paddingBottom: 6 }, children: q ? n.jsx(_t, { palette: s, title: q.title, detail: q.detail, tone: q.tone }) : Y.map((e, t) => n.jsx(en, { palette: s, row: e, index: t, onContextMenu: (d) => {
    Se({ row: e, x: d.clientX, y: d.clientY });
  } }, e.id || e.name)) }), n.jsx(Lr, { open: !!S, anchor: S ? { x: S.x, y: S.y } : null, title: (S == null ? void 0 : S.row.name) || "Process", subtitle: (S == null ? void 0 : S.row.mainWindowTitle) || (S == null ? void 0 : S.row.processName) || (S == null ? void 0 : S.row.metric) || null, items: xr, palette: s, showHeader: false, onSelect: (e) => {
    S && (Ar(S.row, e.id), Se(null));
  }, onClose: () => Se(null) })] })] }) : isAiTaskSurface ? aiTaskContent : n.jsxs("div", { style: { minHeight: 0, display: "grid" }, children: [n.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, padding: "0 4px 4px" }, children: [n.jsx("div", { style: { display: "flex", gap: 3 }, children: [["all", Pe.all], ["running", Pe.running], ["stopped", Pe.stopped], ["disabled", Pe.disabled]].map(([e, t]) => n.jsx("button", { type: "button", onClick: () => nr(e), style: { height: 20, padding: "0 7px", borderRadius: 999, border: X === e ? l ? "1px solid rgba(0,120,212,0.4)" : "1px solid rgba(132,212,255,0.35)" : l ? "1px solid rgba(0,0,0,0.13)" : "1px solid rgba(214,231,255,0.12)", background: X === e ? l ? "rgba(0,120,212,0.1)" : "rgba(132,212,255,0.12)" : "transparent", color: X === e ? l ? "#0078d4" : "rgba(132,212,255,0.95)" : s.sidebarMuted, fontSize: 10, fontWeight: X === e ? 600 : 400, letterSpacing: "0.03em", cursor: "pointer", outline: "none", whiteSpace: "nowrap" }, children: t }, e)) }), n.jsxs("select", { "data-tm-focusable": "true", value: Le, onChange: (e) => ar(e.target.value), style: { height: 20, borderRadius: 999, border: l ? "1px solid rgba(0,0,0,0.13)" : "1px solid rgba(214,231,255,0.12)", background: l ? "rgba(0,0,0,0.04)" : "rgba(20,24,40,0.85)", color: s.sidebarMuted, padding: "0 6px", fontSize: 10, outline: "none", cursor: "pointer", flexShrink: 0 }, children: [n.jsx("option", { value: "status", children: Je.status }), n.jsx("option", { value: "name", children: Je.name }), n.jsx("option", { value: "startup", children: Je.startup })] })] }), n.jsx("div", { style: { borderRadius: 10, border: l ? "1px solid rgba(0,0,0,0.09)" : "1px solid rgba(214,231,255,0.08)", background: l ? "rgba(0,0,0,0.04)" : "rgba(6,10,20,0.82)", overflow: "hidden" }, children: n.jsxs("div", { style: { padding: "0 4px 5px", display: "grid", gap: 1, maxHeight: 400, overflowY: "auto" }, children: [n.jsxs("div", { style: { display: "grid", gridTemplateColumns: "20px minmax(0, 1fr) 84px 82px", alignItems: "center", gap: g.spacing.tight, padding: "4px 2px", borderBottom: l ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(214,231,255,0.08)", background: l ? "rgba(244,247,252,0.98)" : "rgba(20,23,38,0.98)", position: "sticky", top: 0, zIndex: 1 }, children: [n.jsx("span", { style: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)", paddingLeft: 21, minWidth: 0 }, children: "Service" }), n.jsx("span", { style: { fontSize: 10, textAlign: "right", letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)" }, children: "Status" }), n.jsx("span", { style: { fontSize: 10, textAlign: "right", letterSpacing: "0.08em", textTransform: "uppercase", color: l ? "rgba(0,0,0,0.42)" : "rgba(214,231,255,0.4)" }, children: "Startup" })] }), n.jsx("div", { style: { display: "grid", gap: 1, padding: "3px 0 12px" }, children: Ce ? n.jsx(_t, { palette: s, title: Ce.title, detail: Ce.detail, tone: Ce.tone }) : me.length > 0 ? me.map((e, t) => n.jsx(Qr, { palette: s, row: e, index: t }, e.id)) : null })] }) })] })] }) })] }), n.jsxs("div", { style: { position: "relative" }, onMouseEnter: At, onMouseLeave: Te, children: [n.jsx("div", { "aria-hidden": "true", style: { position: "absolute", top: -12, left: 0, right: 0, height: 14 } }), n.jsx(Ur, { palette: s, approvalCount: Be.length, chatThreadCount: ce.length, optimizerStatus: O ? String(O.sessionMode || O.performanceMode || "") : null, drawerOpen: sr, onDrawerMouseEnter: At, onDrawerMouseLeave: Te })] })] }), null] }) }) });
}
export {
  Mn as default
};
