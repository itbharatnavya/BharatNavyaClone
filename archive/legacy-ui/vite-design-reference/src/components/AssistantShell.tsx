import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, BriefcaseBusiness, Building2, MessageSquareText, Sparkles, X } from 'lucide-react';

export function AssistantShell({ onNotice }: { onNotice: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function submit(value = draft) {
    if (!value.trim()) return;
    setDraft('');
    onNotice('Assistant integration is coming next. Your question was not sent or stored.');
  }

  return <>
    {open && <aside id="assistant-panel" className="assistant-drawer" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header><span><Bot size={20} /></span><div><small>Bharat Navya assistant</small><h2 id="assistant-title">Where should we begin?</h2></div><button ref={closeRef} onClick={close} aria-label="Close assistant"><X size={19} /></button></header>
      <p>Ask about finding a company, comparing options, a job search, or using the platform.</p>
      <div className="assistant-suggestions">
        <button onClick={() => setDraft('Help me find a packaging supplier for a pilot run')}><Building2 size={16} />Find a supplier</button>
        <button onClick={() => setDraft('Show me fresh operations jobs near Ahmedabad')}><BriefcaseBusiness size={16} />Find a role</button>
        <button onClick={() => setDraft('How does Bharat Navya verify companies?')}><Sparkles size={16} />Explain verification</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}><label className="sr-only" htmlFor="assistant-draft">Ask Bharat Navya</label><textarea id="assistant-draft" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder="Ask a business, company, job, or platform question" /><button type="submit" disabled={!draft.trim()} aria-label="Submit assistant question"><ArrowUp size={18} /></button></form>
      <small className="assistant-disclaimer">Prototype shell only · no AI response or external API call</small>
    </aside>}
    <button ref={triggerRef} className="assistant-trigger" onClick={() => setOpen(true)} aria-label="Open Bharat Navya assistant" aria-expanded={open} aria-controls="assistant-panel"><MessageSquareText size={22} /><span>Ask Bharat Navya</span></button>
  </>;
}
