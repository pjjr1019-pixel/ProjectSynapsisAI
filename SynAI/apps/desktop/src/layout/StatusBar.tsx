interface StatusBarProps {
  error: string | null;
}

export function StatusBar({ error }: StatusBarProps) {
  return (
    <footer className="flex h-8 items-center border-t border-slate-800 bg-slate-950/90 px-3 text-xs">
      {error ? <span className="text-rose-300">{error}</span> : <span className="text-slate-500">Ready</span>}
    </footer>
  );
}
