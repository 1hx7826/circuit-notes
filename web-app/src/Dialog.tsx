import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icons';
export default function Dialog({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => { el.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={'dialog' + (wide ? ' wide' : '')} aria-label={title} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="dialog-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="关闭"><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
