import type { CSSProperties } from 'react';
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.5 4.5"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    book: <><path d="M12 5C8 2 4 4 3 5v15c3-2 6-2 9 0 3-2 6-2 9 0V5c-3-2-6-2-9 0Z"/><path d="M12 5v15"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    home: <><path d="m3 11 9-8 9 8M5 9v12h14V9"/><path d="M9 21v-8h6v8"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    moon: <path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>,
    tool: <><path d="M14 4a6 6 0 0 0-7 7L3 15v5h5l4-4a6 6 0 0 0 8-8l-4 4-4-4 4-4Z"/></>,
    settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/></>,
    external: <><path d="M14 3h7v7m-1-6L10 14M10 4H4v16h16v-6"/></>,
    circuit: <><path d="M3 5h7v14h11M3 19h3M16 2v7h5M16 15v7"/><path d="M10 9h6v6h-6"/><circle cx="3" cy="5" r="1.5"/><circle cx="21" cy="9" r="1.5"/><circle cx="21" cy="19" r="1.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">{paths[name] || paths.book}</svg>;
}
