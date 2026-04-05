// TasksPage-tasks.js
// Standalone Task Scheduler companion window for Horizons AI.
// Imported dynamically by index-O1AJ09Lc.js when ?window=tasks.
// Uses React from the shared bundle; zero additional dependencies.

import { j as _jsr, r as React } from "./index-O1AJ09Lc.js";

const { useState, useEffect, useCallback, useMemo, useRef } = React;
const ce = React.createElement; // createElement used throughout for clarity

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:            '#060b12',
  panelBg:       'rgba(9,12,22,0.97)',
  surface:       'rgba(14,18,30,0.95)',
  border:        'rgba(140,154,212,0.14)',
  text:          'rgba(244,248,255,0.97)',
  muted:         'rgba(188,197,230,0.60)',
  faint:         'rgba(140,160,220,0.28)',
  accent:        '#7b8eff',
  accentBg:      'rgba(93,104,181,0.18)',
  accentBorder:  'rgba(131,148,232,0.26)',
  red:           'rgba(255,180,190,0.92)',
  green:         'rgba(140,255,196,0.88)',
  amber:         'rgba(255,220,140,0.88)',
  inputBg:       'rgba(8,12,24,0.84)',
};

const HEADER_H  = 44;
const TOOLBAR_H = 46;

// ── API helpers ────────────────────────────────────────────────────────────────
function apiBase() {
  return (window.horizonsDesktop?.apiBaseUrl || 'http://127.0.0.1:8787').replace(/\/$/, '');
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  if (!res.ok) throw new Error(body?.error || `API error ${res.status}`);
  return body;
}

// ── Schedule / recurrence helpers ─────────────────────────────────────────────
function localParts(dateStr, timeStr) {
  const [y, mo, d] = (dateStr || '1970-01-01').split('-').map(Number);
  const [hh, mm]   = (timeStr || '09:00').split(':').map(Number);
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  return isNaN(dt.getTime()) ? new Date() : dt;
}

function expandOccurrences(task, rangeStart, rangeEnd) {
  const results = [];
  const end = new Date(rangeEnd);

  switch (task.scheduleType) {
    case 'once': {
      const dt = localParts(task.scheduleConfig?.date, task.scheduleConfig?.time);
      if (dt >= rangeStart && dt <= end) results.push({ date: dt, task });
      break;
    }
    case 'hourly': {
      const mo  = Math.max(0, Math.min(59, Number(task.scheduleConfig?.minuteOffset) || 0));
      const cur = new Date(rangeStart);
      cur.setMinutes(mo, 0, 0);
      if (cur < rangeStart) cur.setHours(cur.getHours() + 1);
      while (cur <= end && results.length < 300) {
        results.push({ date: new Date(cur), task });
        cur.setHours(cur.getHours() + 1);
      }
      break;
    }
    case 'daily': {
      const [hh, mm] = (task.scheduleConfig?.time || '09:00').split(':').map(Number);
      const cur = new Date(rangeStart);
      cur.setHours(hh, mm, 0, 0);
      if (cur < rangeStart) cur.setDate(cur.getDate() + 1);
      while (cur <= end && results.length < 400) {
        results.push({ date: new Date(cur), task });
        cur.setDate(cur.getDate() + 1);
      }
      break;
    }
    case 'weekly': {
      const dow  = Math.max(0, Math.min(6, Number(task.scheduleConfig?.dayOfWeek) || 1));
      const [hh, mm] = (task.scheduleConfig?.time || '09:00').split(':').map(Number);
      const cur  = new Date(rangeStart);
      let off    = dow - cur.getDay();
      if (off < 0) off += 7;
      cur.setDate(cur.getDate() + off);
      cur.setHours(hh, mm, 0, 0);
      if (cur < rangeStart) cur.setDate(cur.getDate() + 7);
      while (cur <= end && results.length < 100) {
        results.push({ date: new Date(cur), task });
        cur.setDate(cur.getDate() + 7);
      }
      break;
    }
    default: break;
  }
  return results;
}

function scheduleLabel(task) {
  if (!task) return '';
  switch (task.scheduleType) {
    case 'once':   return `Once · ${localParts(task.scheduleConfig?.date, task.scheduleConfig?.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    case 'hourly': return `Hourly · :${String(Number(task.scheduleConfig?.minuteOffset) || 0).padStart(2, '0')}`;
    case 'daily':  return `Daily · ${task.scheduleConfig?.time || '09:00'}`;
    case 'weekly': {
      const d = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(task.scheduleConfig?.dayOfWeek) || 1] || 'Mon';
      return `Weekly · ${d} ${task.scheduleConfig?.time || '09:00'}`;
    }
    default: return task.scheduleType || '';
  }
}

function relLabel(isoStr) {
  if (!isoStr) return 'Never';
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return isoStr;
  const delta = dt.getTime() - Date.now();
  const abs   = Math.abs(delta);
  if (abs < 60000)  return delta >= 0 ? 'In under a minute' : 'Just now';
  const mins = Math.round(abs / 60000);
  if (mins < 60) return delta >= 0 ? `In ${mins} min` : `${mins} min ago`;
  const hrs  = Math.round(mins / 60);
  if (hrs < 24)  return delta >= 0 ? `In ${hrs} hr` : `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return delta >= 0 ? `In ${days} d` : `${days} d ago`;
}

// ── Date utilities ─────────────────────────────────────────────────────────────
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate()  === b.getDate();
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getWeekDays(date) {
  const s = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return d;
  });
}

// ── Draft helpers ──────────────────────────────────────────────────────────────
function freshDraft() {
  return {
    mode: 'create',
    name: '', prompt: '',
    scheduleType: 'daily',
    scheduleConfig: { time: '09:00', date: new Date().toISOString().slice(0, 10), minuteOffset: 0, dayOfWeek: 1 },
    enabled: true,
  };
}

function taskToDraft(task) {
  return {
    mode: 'edit',
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    scheduleType: task.scheduleType,
    scheduleConfig: { time: '09:00', date: new Date().toISOString().slice(0, 10), minuteOffset: 0, dayOfWeek: 1, ...(task.scheduleConfig || {}) },
    enabled: task.enabled,
  };
}

// ── Common style helpers ───────────────────────────────────────────────────────
const BTN = (extra = {}) => ({
  height: 28, padding: '0 12px', borderRadius: 7,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.muted, fontSize: 11, cursor: 'pointer', outline: 'none',
  whiteSpace: 'nowrap',
  ...extra,
});

const BTN_ACCENT = (extra = {}) => BTN({
  border: `1px solid ${C.accentBorder}`, background: C.accentBg,
  color: C.accent, fontWeight: 700,
  ...extra,
});

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  borderRadius: 8, border: `1px solid ${C.border}`,
  background: C.inputBg, color: C.text,
  padding: '7px 9px', fontSize: 11.25, outline: 'none',
};

const LABEL_STYLE = {
  fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
  color: C.muted, fontWeight: 600,
};

// ── StatusBadge ────────────────────────────────────────────────────────────────
function StatusBadge({ task }) {
  const label = !task.enabled
    ? 'Paused'
    : task.lastStatus === 'error'   ? 'Error'
    : task.lastStatus === 'running' ? 'Running'
    : task.lastStatus === 'success' ? 'Ready'
    : 'Scheduled';
  const color = !task.enabled
    ? C.amber
    : task.lastStatus === 'error'   ? C.red
    : task.lastStatus === 'running' ? C.accent
    : task.lastStatus === 'success' ? C.green
    : C.muted;
  return ce('span', {
    style: {
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 7px', borderRadius: 999,
      border: `1px solid ${color}`, color,
      whiteSpace: 'nowrap', flexShrink: 0,
    },
  }, label);
}

// ── TitleBar ───────────────────────────────────────────────────────────────────
function TitleBar({ onMinimize, onClose }) {
  const winBtn = (label, title, onClick) => ce('button', {
    type: 'button', title, onClick,
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      border: `1px solid ${C.border}`, background: 'transparent',
      color: C.muted, cursor: 'pointer', outline: 'none',
      fontSize: 12, WebkitAppRegion: 'no-drag',
    },
  }, label);

  return ce('div', {
    style: {
      height: HEADER_H, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 8,
      borderBottom: `1px solid ${C.border}`,
      WebkitAppRegion: 'drag',
      userSelect: 'none',
    },
  },
    ce('span', { style: { fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: '0.02em', flex: 1 } }, 'Task Scheduler'),
    winBtn('—', 'Minimize', onMinimize),
    winBtn('✕', 'Close',    onClose),
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function Toolbar({ view, onViewChange, currentDate, onPrev, onNext, onToday, onNewTask }) {
  const viewLabel = useMemo(() => {
    if (view === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      const s = days[0], e = days[6];
      return s.getMonth() === e.getMonth()
        ? `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
        : `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }, [view, currentDate]);

  const vBtn = (v, label) => ce('button', {
    type: 'button', onClick: () => onViewChange(v),
    style: {
      height: 28, padding: '0 12px', borderRadius: 7,
      border: `1px solid ${view === v ? C.accentBorder : C.border}`,
      background: view === v ? C.accentBg : 'transparent',
      color: view === v ? C.accent : C.muted,
      fontSize: 11.5, fontWeight: view === v ? 700 : 400,
      cursor: 'pointer', outline: 'none',
    },
  }, label);

  const navBtn = (label, title, onClick) => ce('button', {
    type: 'button', title, onClick,
    style: BTN({ fontSize: 11.5, height: 28, padding: '0 10px' }),
  }, label);

  return ce('div', {
    style: {
      height: TOOLBAR_H, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 6,
      borderBottom: `1px solid ${C.border}`,
    },
  },
    vBtn('month', 'Month'),
    vBtn('week',  'Week'),
    vBtn('day',   'Day'),
    ce('div', { style: { width: 1, height: 20, background: C.border, margin: '0 4px', flexShrink: 0 } }),
    navBtn('‹', 'Previous', onPrev),
    navBtn('Today', 'Go to today', onToday),
    navBtn('›', 'Next', onNext),
    ce('span', { style: { fontSize: 13, fontWeight: 600, color: C.text, flex: 1, paddingLeft: 8, whiteSpace: 'nowrap' } }, viewLabel),
    ce('button', {
      type: 'button', onClick: onNewTask,
      style: BTN_ACCENT({ height: 28, padding: '0 14px', fontSize: 11.5 }),
    }, '+ New Task'),
  );
}

// ── MonthView ──────────────────────────────────────────────────────────────────
function MonthView({ currentDate, occurrences, onDayClick, onOccurrenceClick }) {
  const today    = useMemo(() => new Date(), []);
  const days     = useMemo(() => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const curMonth = currentDate.getMonth();

  const occByDay = useMemo(() => {
    const map = {};
    for (const occ of occurrences) {
      const key = occ.date.toDateString();
      (map[key] = map[key] || []).push(occ);
    }
    return map;
  }, [occurrences]);

  return ce('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
    // Day name header row
    ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${C.border}`, flexShrink: 0 } },
      ...DAY_NAMES.map(d => ce('div', { key: d, style: { padding: '5px 8px', fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' } }, d)),
    ),
    // 6-week grid
    ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', flex: 1, overflow: 'hidden' } },
      ...days.map((day, i) => {
        const isToday       = isSameDay(day, today);
        const isCurrentMo   = day.getMonth() === curMonth;
        const dayKey        = day.toDateString();
        const dayOccs       = occByDay[dayKey] || [];
        const visible       = dayOccs.slice(0, 3);
        const overflow      = dayOccs.length - 3;

        return ce('div', {
          key: i,
          onClick: () => onDayClick(day),
          style: {
            borderRight: (i + 1) % 7 === 0 ? 'none' : `1px solid ${C.border}`,
            borderBottom: i < 35 ? `1px solid ${C.border}` : 'none',
            padding: '4px 5px',
            background: isToday ? 'rgba(93,104,181,0.07)' : 'transparent',
            overflow: 'hidden', cursor: 'pointer', minHeight: 0,
          },
        },
          // Date number + count badge
          ce('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 } },
            ce('span', {
              style: {
                fontSize: 12, fontWeight: isToday ? 700 : 400,
                color: isToday ? C.accent : isCurrentMo ? C.text : C.faint,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22,
                borderRadius: isToday ? 999 : 0,
                background: isToday ? C.accentBg : 'transparent',
              },
            }, day.getDate()),
            dayOccs.length > 0 && ce('span', {
              style: {
                fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 999,
                background: C.accentBg, color: C.accent,
              },
            }, dayOccs.length),
          ),
          // Occurrence chips
          ...visible.map((occ, j) => ce('div', {
            key: j,
            onClick: (e) => { e.stopPropagation(); onOccurrenceClick(occ); },
            style: {
              fontSize: 10, padding: '1px 5px', borderRadius: 4, marginBottom: 2,
              background: occ.task.enabled ? C.accentBg : 'rgba(255,220,140,0.10)',
              color:      occ.task.enabled ? C.accent   : C.amber,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: 'pointer',
            },
          }, `${occ.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ${occ.task.name}`)),
          overflow > 0 && ce('div', { style: { fontSize: 9.5, color: C.muted } }, `+${overflow} more`),
        );
      }),
    ),
  );
}

// ── WeekView ───────────────────────────────────────────────────────────────────
function WeekView({ currentDate, occurrences, onOccurrenceClick }) {
  const today = useMemo(() => new Date(), []);
  const days  = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const occByDay = useMemo(() => {
    const map = {};
    for (const occ of occurrences) {
      const key = occ.date.toDateString();
      (map[key] = map[key] || []).push(occ);
    }
    return map;
  }, [occurrences]);

  return ce('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
    // Day headers
    ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${C.border}`, flexShrink: 0 } },
      ...days.map((d, i) => {
        const isT = isSameDay(d, today);
        return ce('div', { key: i, style: { padding: '7px 8px', textAlign: 'center', borderLeft: i > 0 ? `1px solid ${C.border}` : 'none' } },
          ce('div', { style: { fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' } }, DAY_NAMES[d.getDay()]),
          ce('div', { style: { fontSize: 22, fontWeight: isT ? 700 : 300, color: isT ? C.accent : C.text, marginTop: 1 } }, d.getDate()),
        );
      }),
    ),
    // Body columns
    ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflow: 'auto' } },
      ...days.map((d, i) => {
        const isT    = isSameDay(d, today);
        const dayOccs = (occByDay[d.toDateString()] || []).slice().sort((a, b) => a.date - b.date);
        return ce('div', {
          key: i,
          style: {
            borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
            padding: '6px 5px',
            background: isT ? 'rgba(93,104,181,0.04)' : 'transparent',
            overflowY: 'auto',
          },
        },
          ...dayOccs.map((occ, j) => ce('div', {
            key: j,
            onClick: () => onOccurrenceClick(occ),
            style: {
              marginBottom: 5, padding: '5px 7px', borderRadius: 7,
              background: occ.task.enabled ? C.accentBg : 'rgba(255,220,140,0.09)',
              border: `1px solid ${occ.task.enabled ? C.accentBorder : 'rgba(255,220,140,0.20)'}`,
              cursor: 'pointer',
            },
          },
            ce('div', { style: { fontSize: 10.5, fontWeight: 700, color: occ.task.enabled ? C.accent : C.amber } },
              occ.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })),
            ce('div', { style: { fontSize: 10, color: C.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              occ.task.name),
          )),
        );
      }),
    ),
  );
}

// ── DayView ────────────────────────────────────────────────────────────────────
function DayView({ currentDate, occurrences, onOccurrenceClick }) {
  const today   = useMemo(() => new Date(), []);
  const isToday = isSameDay(currentDate, today);

  const dayOccs = useMemo(() =>
    occurrences
      .filter(o => isSameDay(o.date, currentDate))
      .sort((a, b) => a.date - b.date),
    [occurrences, currentDate],
  );

  return ce('div', { style: { flex: 1, overflowY: 'auto', padding: '16px 20px' } },
    ce('div', { style: { fontSize: 14, fontWeight: 700, color: isToday ? C.accent : C.text, marginBottom: 16 } },
      currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    ),
    dayOccs.length === 0
      ? ce('div', { style: { color: C.muted, fontSize: 11.5, paddingTop: 20 } }, 'No scheduled occurrences for this day.')
      : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
          ...dayOccs.map((occ, i) => ce('div', {
            key: i,
            onClick: () => onOccurrenceClick(occ),
            style: {
              padding: '10px 14px', borderRadius: 9,
              border: `1px solid ${occ.task.enabled ? C.accentBorder : 'rgba(255,220,140,0.22)'}`,
              background: occ.task.enabled ? C.accentBg : 'rgba(255,220,140,0.07)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
            },
          },
            ce('span', { style: { fontSize: 12.5, fontWeight: 700, color: occ.task.enabled ? C.accent : C.amber, minWidth: 68, flexShrink: 0 } },
              occ.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })),
            ce('div', { style: { flex: 1, minWidth: 0 } },
              ce('div', { style: { fontSize: 12.5, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, occ.task.name),
              ce('div', { style: { fontSize: 10.5, color: C.muted, marginTop: 2 } }, scheduleLabel(occ.task)),
            ),
            ce(StatusBadge, { task: occ.task }),
          )),
        ),
  );
}

// ── TaskForm ───────────────────────────────────────────────────────────────────
const DAY_OPTS = [['0','Sunday'],['1','Monday'],['2','Tuesday'],['3','Wednesday'],['4','Thursday'],['5','Friday'],['6','Saturday']];

function TaskForm({ draft, onDraftChange, onScheduleConfigChange, onScheduleTypeChange, onEnabledChange, onSave, onCancel, onDelete, busy, error }) {
  const isEdit = draft.mode === 'edit';

  const field = (label, children) => ce('label', { style: { display: 'grid', gap: 5 } },
    ce('span', { style: LABEL_STYLE }, label),
    children,
  );

  const scheduleFields = () => {
    switch (draft.scheduleType) {
      case 'once':
        return ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 } },
          field('Date', ce('input', { type: 'date', value: draft.scheduleConfig?.date || '', onChange: e => onScheduleConfigChange('date', e.target.value), style: INPUT_STYLE })),
          field('Time', ce('input', { type: 'time', value: draft.scheduleConfig?.time || '09:00', onChange: e => onScheduleConfigChange('time', e.target.value), style: INPUT_STYLE })),
        );
      case 'hourly':
        return field('Minute offset (0–59)',
          ce('input', { type: 'number', min: 0, max: 59, value: draft.scheduleConfig?.minuteOffset ?? 0, onChange: e => onScheduleConfigChange('minuteOffset', Math.max(0, Math.min(59, Number(e.target.value) || 0))), style: INPUT_STYLE }),
        );
      case 'weekly':
        return ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 } },
          field('Day', ce('select', { value: String(draft.scheduleConfig?.dayOfWeek ?? 1), onChange: e => onScheduleConfigChange('dayOfWeek', Number(e.target.value)), style: INPUT_STYLE },
            ...DAY_OPTS.map(([v, l]) => ce('option', { key: v, value: v }, l)),
          )),
          field('Time', ce('input', { type: 'time', value: draft.scheduleConfig?.time || '09:00', onChange: e => onScheduleConfigChange('time', e.target.value), style: INPUT_STYLE })),
        );
      default: // daily
        return field('Time',
          ce('input', { type: 'time', value: draft.scheduleConfig?.time || '09:00', onChange: e => onScheduleConfigChange('time', e.target.value), style: INPUT_STYLE }),
        );
    }
  };

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, overflowY: 'auto' } },
    // Header
    ce('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 } },
      ce('div', {},
        ce('div', { style: { fontSize: 13, fontWeight: 700, color: C.text } }, isEdit ? 'Edit Task' : 'New Task'),
        ce('div', { style: { fontSize: 10.5, color: C.muted, marginTop: 2 } }, 'Schedule a saved AI prompt'),
      ),
      ce('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted, cursor: 'pointer', flexShrink: 0 } },
        ce('input', { type: 'checkbox', checked: !!draft.enabled, onChange: e => onEnabledChange(e.target.checked) }),
        'Enabled',
      ),
    ),
    // Name + Schedule type
    ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8 } },
      field('Name', ce('input', { type: 'text', value: draft.name, onChange: e => onDraftChange('name', e.target.value), placeholder: 'Daily memory report', style: INPUT_STYLE })),
      field('Schedule', ce('select', { value: draft.scheduleType, onChange: e => onScheduleTypeChange(e.target.value), style: INPUT_STYLE },
        ce('option', { value: 'once'   }, 'Once'),
        ce('option', { value: 'hourly' }, 'Hourly'),
        ce('option', { value: 'daily'  }, 'Daily'),
        ce('option', { value: 'weekly' }, 'Weekly'),
      )),
    ),
    // Prompt
    field('Prompt', ce('textarea', {
      value: draft.prompt,
      onChange: e => onDraftChange('prompt', e.target.value),
      placeholder: 'Summarize active AI runtime pressure and tell me what should be cleaned up.',
      style: { ...INPUT_STYLE, minHeight: 84, resize: 'vertical', lineHeight: 1.45, fontFamily: 'inherit' },
    })),
    // Schedule-specific fields
    scheduleFields(),
    // Error
    error && ce('div', { style: { fontSize: 10.5, color: C.red, lineHeight: 1.45 } }, error),
    // Action buttons
    ce('div', { style: { display: 'flex', gap: 6, justifyContent: 'space-between', paddingTop: 4 } },
      isEdit ? ce('button', {
        type: 'button', onClick: onDelete, disabled: busy,
        style: BTN({ border: '1px solid rgba(255,100,100,0.24)', background: 'rgba(255,60,60,0.08)', color: C.red, opacity: busy ? 0.5 : 1 }),
      }, 'Delete') : ce('div'),
      ce('div', { style: { display: 'flex', gap: 6 } },
        ce('button', { type: 'button', onClick: onCancel, disabled: busy, style: BTN({ opacity: busy ? 0.5 : 1 }) }, 'Cancel'),
        ce('button', {
          type: 'button', onClick: onSave, disabled: busy,
          style: BTN_ACCENT({ opacity: busy ? 0.5 : 1 }),
        }, busy ? 'Saving…' : isEdit ? 'Save Task' : 'Create Task'),
      ),
    ),
  );
}

// ── TaskDetail ─────────────────────────────────────────────────────────────────
function TaskDetail({ task, onEdit, onRunNow, onToggleEnabled, busy }) {
  const row = (label, value, valueStyle = {}) => ce('div', {
    style: { padding: '8px 0', borderBottom: `1px solid ${C.border}` },
  },
    ce('div', { style: { ...LABEL_STYLE, marginBottom: 3 } }, label),
    ce('div', { style: { fontSize: 11.5, color: C.text, lineHeight: 1.45, ...valueStyle } }, value || '—'),
  );

  return ce('div', { style: { display: 'flex', flexDirection: 'column', padding: 16, gap: 0, overflowY: 'auto' } },
    // Title row
    ce('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 } },
      ce('div', { style: { flex: 1, minWidth: 0 } },
        ce('div', { style: { fontSize: 14, fontWeight: 700, color: C.text, wordBreak: 'break-word' } }, task.name),
        ce('div', { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, scheduleLabel(task)),
      ),
      ce(StatusBadge, { task }),
    ),
    row('Prompt', (task.promptPreview || task.prompt || '').slice(0, 240)),
    row('Next run', task.nextRunLabel || relLabel(task.nextRunAt)),
    row('Last run', task.lastRunLabel || relLabel(task.lastRunAt)),
    task.lastResultPreview && row('Last result', task.lastResultPreview),
    task.lastError && row('Last error', task.lastError, { color: C.red }),
    // Actions
    ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 } },
      ce('button', {
        type: 'button', disabled: busy, onClick: () => onToggleEnabled(!task.enabled),
        style: BTN({ opacity: busy ? 0.5 : 1 }),
      }, task.enabled ? 'Pause' : 'Resume'),
      ce('button', {
        type: 'button', disabled: busy, onClick: onRunNow,
        style: BTN({ opacity: busy ? 0.5 : 1 }),
      }, busy ? 'Running…' : 'Run Now'),
      ce('button', {
        type: 'button', onClick: onEdit,
        style: BTN_ACCENT({ marginLeft: 'auto' }),
      }, 'Edit'),
    ),
  );
}

// ── TasksPage (main export) ────────────────────────────────────────────────────
export function TasksPage() {
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState(null);
  const [view,      setView]      = useState('month');
  const [curDate,   setCurDate]   = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [panel,     setPanel]     = useState(null); // null | {type:'form',draft} | {type:'detail',task}
  const [busy,      setBusy]      = useState(false);
  const [formErr,   setFormErr]   = useState(null);

  const desk = window.horizonsDesktop;
  const tm   = desk?.taskManager;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/api/runtime-manager/ai-tasks');
      setTasks(Array.isArray(data?.rows) ? data.rows : []);
      setFetchErr(null);
    } catch (e) {
      setFetchErr(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (!desk?.broadcast) return;
    const listener = (channel, payload) => {
      if (channel === 'ai-tasks:compose-open') {
        setPanel({ type: 'form', draft: freshDraft() });
        setFormErr(null);
      } else if (channel === 'ai-tasks:select-task' && payload?.taskId) {
        const t = tasksRef.current.find(x => x.id === payload.taskId);
        if (t) {
          if (payload?.mode === 'edit') {
            setPanel({ type: 'form', draft: taskToDraft(t) });
            setFormErr(null);
          } else {
            setPanel({ type: 'detail', task: t });
          }
        }
      } else if (channel === 'ai-tasks:changed') {
        loadTasks(true);
      }
    };
    desk.broadcast.on(listener);
    return () => desk.broadcast.off(listener);
  }, [desk, loadTasks]);

  // ── Calendar range ─────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === 'month') {
      const s = new Date(curDate.getFullYear(), curDate.getMonth(), 1);
      s.setDate(s.getDate() - s.getDay());
      const e = new Date(s);
      e.setDate(s.getDate() + 41);
      e.setHours(23, 59, 59, 999);
      return { rangeStart: s, rangeEnd: e };
    }
    if (view === 'week') {
      const s = startOfWeek(curDate);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return { rangeStart: s, rangeEnd: e };
    }
    const s = new Date(curDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setHours(23, 59, 59, 999);
    return { rangeStart: s, rangeEnd: e };
  }, [view, curDate]);

  const occurrences = useMemo(() => {
    const all = [];
    for (const task of tasks) all.push(...expandOccurrences(task, rangeStart, rangeEnd));
    return all;
  }, [tasks, rangeStart, rangeEnd]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const nav = useCallback((dir) => {
    setCurDate(prev => {
      const d = new Date(prev);
      if      (view === 'month') d.setMonth(d.getMonth() + dir);
      else if (view === 'week')  d.setDate(d.getDate() + dir * 7);
      else                       d.setDate(d.getDate() + dir);
      return d;
    });
  }, [view]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setPanel({ type: 'form', draft: freshDraft() });
    setFormErr(null);
  }, []);

  const handleOccurrenceClick = useCallback((occ) => {
    setPanel({ type: 'detail', task: occ.task });
  }, []);

  const handleDayClick = useCallback((day) => {
    setCurDate(day);
    setView('day');
  }, []);

  const handleSave = useCallback(async () => {
    if (!panel || panel.type !== 'form') return;
    const { draft } = panel;
    setBusy(true);
    setFormErr(null);
    try {
      const body = {
        name:           draft.name,
        prompt:         draft.prompt,
        scheduleType:   draft.scheduleType,
        scheduleConfig: draft.scheduleConfig,
        enabled:        draft.enabled,
      };
      if (draft.mode === 'edit') {
        await apiFetch(`/api/runtime-manager/ai-tasks/${draft.id}`, { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/runtime-manager/ai-tasks', { method: 'POST', body: JSON.stringify(body) });
      }
      await loadTasks(true);
      setPanel(null);
      desk?.broadcast?.send('ai-tasks:changed', {});
    } catch (e) {
      setFormErr(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }, [panel, loadTasks, desk]);

  const handleDelete = useCallback(async () => {
    if (!panel || panel.type !== 'form' || panel.draft?.mode !== 'edit') return;
    if (!window.confirm(`Delete "${panel.draft.name}"?`)) return;
    setBusy(true);
    setFormErr(null);
    try {
      await apiFetch(`/api/runtime-manager/ai-tasks/${panel.draft.id}/delete`, { method: 'POST', body: '{}' });
      await loadTasks(true);
      setPanel(null);
      desk?.broadcast?.send('ai-tasks:changed', {});
    } catch (e) {
      setFormErr(e.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }, [panel, loadTasks, desk]);

  const handleRunNow = useCallback(async (taskId) => {
    setBusy(true);
    try {
      await apiFetch(`/api/runtime-manager/ai-tasks/${taskId}/run`, { method: 'POST', body: '{}' });
      await loadTasks(true);
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }, [loadTasks]);

  const handleToggleEnabled = useCallback(async (taskId, enabled) => {
    setBusy(true);
    try {
      const task = tasksRef.current.find(t => t.id === taskId);
      if (!task) return;
      await apiFetch(`/api/runtime-manager/ai-tasks/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({ name: task.name, prompt: task.prompt, scheduleType: task.scheduleType, scheduleConfig: task.scheduleConfig, enabled }),
      });
      await loadTasks(true);
      setPanel(p => p?.type === 'detail' && p.task.id === taskId ? { ...p, task: { ...p.task, enabled } } : p);
      desk?.broadcast?.send('ai-tasks:changed', {});
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }, [loadTasks, desk]);

  // ── Draft update helpers ───────────────────────────────────────────────────
  const setDraft      = useCallback((k, v) => setPanel(p => p?.type === 'form' ? { ...p, draft: { ...p.draft, [k]: v } } : p), []);
  const setSchedCfg   = useCallback((k, v) => setPanel(p => p?.type === 'form' ? { ...p, draft: { ...p.draft, scheduleConfig: { ...p.draft.scheduleConfig, [k]: v } } } : p), []);
  const setSchedType  = useCallback((v) => setPanel(p => {
    if (!p || p.type !== 'form') return p;
    const base = { time: '09:00', date: new Date().toISOString().slice(0, 10), minuteOffset: 0, dayOfWeek: 1 };
    return { ...p, draft: { ...p.draft, scheduleType: v, scheduleConfig: { ...base, ...(p.draft.scheduleConfig || {}) } } };
  }), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const PANEL_W = 320;

  return ce('div', {
    style: {
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: C.bg, color: C.text,
      fontFamily: "'Segoe UI Variable', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      overflow: 'hidden', fontSize: 12,
    },
  },
    ce(TitleBar, { onMinimize: () => tm?.minimizeWindow(), onClose: () => tm?.closeWindow() }),
    ce(Toolbar, {
      view, onViewChange: v => setView(v),
      currentDate: curDate,
      onPrev:    () => nav(-1),
      onNext:    () => nav(1),
      onToday:   () => setCurDate(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }),
      onNewTask: openCreate,
    }),
    // Body: calendar + right panel
    ce('div', { style: { flex: 1, display: 'flex', overflow: 'hidden' } },
      // Calendar area
      ce('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: panel ? `1px solid ${C.border}` : 'none' } },
        loading
          ? ce('div', { style: { padding: 24, color: C.muted, fontSize: 11.5 } }, 'Loading tasks…')
          : fetchErr
            ? ce('div', { style: { padding: 20, color: C.red, fontSize: 11.5, lineHeight: 1.5 } }, fetchErr,
                ce('button', { style: { ...BTN(), display: 'block', marginTop: 10 }, onClick: () => loadTasks() }, 'Retry'),
              )
            : view === 'month'
              ? ce(MonthView, { currentDate: curDate, occurrences, onDayClick: handleDayClick, onOccurrenceClick: handleOccurrenceClick })
              : view === 'week'
                ? ce(WeekView, { currentDate: curDate, occurrences, onOccurrenceClick: handleOccurrenceClick })
                : ce(DayView,  { currentDate: curDate, occurrences, onOccurrenceClick: handleOccurrenceClick }),
      ),
      // Right panel
      panel && ce('div', {
        style: {
          width: PANEL_W, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: C.panelBg, overflowY: 'auto',
        },
      },
        panel.type === 'form'
          ? ce(TaskForm, {
              draft:                   panel.draft,
              error:                   formErr,
              busy,
              onDraftChange:           setDraft,
              onScheduleConfigChange:  setSchedCfg,
              onScheduleTypeChange:    setSchedType,
              onEnabledChange:         v => setDraft('enabled', v),
              onSave:                  handleSave,
              onCancel:                () => setPanel(null),
              onDelete:                handleDelete,
            })
          : ce(TaskDetail, {
              task:              panel.task,
              busy,
              onEdit:            () => setPanel(p => p ? { type: 'form', draft: taskToDraft(p.task) } : p),
              onRunNow:          () => handleRunNow(panel.task.id),
              onToggleEnabled:   (enabled) => handleToggleEnabled(panel.task.id, enabled),
            }),
      ),
    ),
  );
}
