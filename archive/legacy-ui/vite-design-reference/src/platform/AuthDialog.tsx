import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { RadioGroup } from '../design-system/components';
import { useModalBehavior } from '../design-system/useModalBehavior';

interface AuthDialogProps {
  mode: 'join' | 'signin';
  reason: string;
  onClose: () => void;
  onComplete: (role: 'applicant' | 'company') => void;
  onModeChange: (mode: 'join' | 'signin') => void;
}

export function AuthDialog({ mode, reason, onClose, onComplete, onModeChange }: AuthDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const completionTimerRef = useRef<number | null>(null);
  const [role, setRole] = useState<'applicant' | 'company'>('applicant');
  const [loading, setLoading] = useState(false);
  const { dialogRef } = useModalBehavior<HTMLElement>({ open: true, onClose, initialFocusRef: closeRef });

  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    };
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    completionTimerRef.current = window.setTimeout(() => onComplete(role), 350);
  }

  return <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-reason" tabIndex={-1}>
      <button ref={closeRef} type="button" className="bn-icon-button auth-close" aria-label="Close account dialog" onClick={onClose}><X size={19} /></button>
      <div className="auth-intro"><span className="brand-mark" aria-hidden="true"><span /><span /><i /></span><span className="platform-eyebrow">One account, both sides</span><h2 id="auth-title">{mode === 'join' ? 'Join Bharat Navya' : 'Welcome back'}</h2><p id="auth-reason">{reason || (mode === 'join' ? 'Save useful work, follow companies, and switch between personal and company workspaces.' : 'Sign in to continue with your saved workspaces.')}</p></div>
      <form onSubmit={submit} aria-busy={loading}>
        {mode === 'join' && <><RadioGroup className="auth-role-choice" legend="How will you start?" name="role" value={role} onChange={(value) => setRole(value as 'applicant' | 'company')} options={[{ value: 'applicant', label: 'Personal / applicant', description: 'Save companies and roles, apply, and track progress.' }, { value: 'company', label: 'Company member', description: 'Claim a company, publish updates, and manage hiring.' }]} /><label><span>Full name</span><input name="name" autoComplete="name" defaultValue="Amit Kumar" required /></label></>}
        <label><span>Email address</span><input name="email" type="email" autoComplete="email" defaultValue="amit@example.com" required /></label>
        <label><span>Password</span><input name="password" type="password" autoComplete={mode === 'join' ? 'new-password' : 'current-password'} defaultValue="prototype123" minLength={8} required /></label>
        {mode === 'join' && <label className="terms-check"><input type="checkbox" required /><span>I agree to the prototype terms and understand that all data and verification shown here are fictional.</span></label>}
        <button className="bn-button primary full" type="submit" disabled={loading} aria-busy={loading}><span aria-live="polite">{loading ? 'Opening workspace…' : mode === 'join' ? 'Create account' : 'Sign in'}</span>{!loading && <ArrowRight size={16} />}</button>
      </form>
      <div className="auth-trust"><ShieldCheck size={17} /><span><strong>No phone or OTP required</strong><small>This prototype stores the session only in this browser.</small></span></div>
      <button type="button" className="bn-text-button auth-switch" onClick={() => onModeChange(mode === 'join' ? 'signin' : 'join')}>{mode === 'join' ? 'Already have an account? Sign in' : 'New to Bharat Navya? Join us'}</button>
      <div className="auth-benefits"><span><Check size={14} />Browsing remains free</span><span><Check size={14} />Contact details stay private</span><span><Check size={14} />Switch roles later</span></div>
    </section>
  </div>;
}
