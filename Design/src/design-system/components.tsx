import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, LoaderCircle, LockKeyhole, X } from 'lucide-react';
import { useModalBehavior } from './useModalBehavior';
import './system.css';

function classes(...items: Array<string | false | undefined>) {
  return items.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'small' | 'default' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: ButtonSize;
}

export function IconButton({ label, size = 'default', className, children, ...props }: IconButtonProps) {
  return <button {...props} className={classes('ds-icon-button', `ds-icon-button--${size}`, className)} aria-label={label}>{children}</button>;
}

export function Button({ variant = 'primary', size = 'default', loading = false, leadingIcon, trailingIcon, className, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={classes('ds-button', `ds-button--${variant}`, `ds-button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <LoaderCircle className="ds-spin" size={17} aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}

export type BadgeTone = 'neutral' | 'action' | 'trust' | 'warning' | 'danger' | 'sponsored';

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={classes('ds-badge', `ds-badge--${tone}`, className)}>{children}</span>;
}

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export function Field({ label, hint, error, leadingIcon, id, className, ...props }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  return (
    <label className={classes('ds-field', className)} htmlFor={fieldId}>
      <span className="ds-field__label">{label}</span>
      <span className={classes('ds-field__control', error && 'is-error')}>
        {leadingIcon}
        <input {...props} id={fieldId} aria-invalid={error ? 'true' : undefined} aria-describedby={hint || error ? messageId : undefined} />
      </span>
      {(error || hint) && <small id={messageId} className={error ? 'ds-field__error' : undefined}>{error ?? hint}</small>}
    </label>
  );
}

interface SharedFieldProps {
  label: string;
  hint?: string;
  error?: string;
}

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, SharedFieldProps {}

export function TextareaField({ label, hint, error, id, className, ...props }: TextareaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  return (
    <label className={classes('ds-field', className)} htmlFor={fieldId}>
      <span className="ds-field__label">{label}</span>
      <span className={classes('ds-field__control', 'ds-field__control--textarea', error && 'is-error')}>
        <textarea {...props} id={fieldId} aria-invalid={error ? 'true' : undefined} aria-describedby={hint || error ? messageId : undefined} />
      </span>
      {(error || hint) && <small id={messageId} className={error ? 'ds-field__error' : undefined}>{error ?? hint}</small>}
    </label>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement>, SharedFieldProps {
  children: ReactNode;
}

export function SelectField({ label, hint, error, id, className, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  return (
    <label className={classes('ds-field', className)} htmlFor={fieldId}>
      <span className="ds-field__label">{label}</span>
      <span className={classes('ds-field__control', 'ds-field__control--select', error && 'is-error')}>
        <select {...props} id={fieldId} aria-invalid={error ? 'true' : undefined} aria-describedby={hint || error ? messageId : undefined}>{children}</select>
      </span>
      {(error || hint) && <small id={messageId} className={error ? 'ds-field__error' : undefined}>{error ?? hint}</small>}
    </label>
  );
}

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>, SharedFieldProps {}

export function CheckboxField({ label, hint, error, id, className, ...props }: CheckboxFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  return (
    <div className={classes('ds-choice-field', className)}>
      <label className="ds-choice-field__control" htmlFor={fieldId}>
        <input {...props} id={fieldId} type="checkbox" aria-invalid={error ? 'true' : undefined} aria-describedby={hint || error ? messageId : undefined} />
        <span>{label}</span>
      </label>
      {(error || hint) && <small id={messageId} className={error ? 'ds-field__error' : undefined}>{error ?? hint}</small>}
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function RadioGroup({ legend, name, value, options, onChange, hint, error, className }: { legend: string; name: string; value: string; options: RadioOption[]; onChange: (value: string) => void; hint?: string; error?: string; className?: string }) {
  const messageId = useId();
  return (
    <fieldset className={classes('ds-radio-group', className)} aria-describedby={hint || error ? messageId : undefined} aria-invalid={error ? 'true' : undefined}>
      <legend>{legend}</legend>
      <div className="ds-radio-group__options">
        {options.map((option) => (
          <label key={option.value} className={classes(value === option.value && 'selected', option.disabled && 'is-disabled')}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)} />
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          </label>
        ))}
      </div>
      {(error || hint) && <small id={messageId} className={error ? 'ds-field__error' : undefined}>{error ?? hint}</small>}
    </fieldset>
  );
}

export function ProgressBar({ label, value, max = 100, valueText, className }: { label: string; value: number; max?: number; valueText?: string; className?: string }) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(Math.max(0, value), safeMax);
  return (
    <div className={classes('ds-progress', className)}>
      <div className="ds-progress__label"><span>{label}</span><strong>{valueText ?? `${safeValue} of ${safeMax}`}</strong></div>
      <progress className="ds-progress__track" value={safeValue} max={safeMax} aria-label={label} aria-valuetext={valueText} />
    </div>
  );
}

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

const noticeIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: CircleAlert };

export function Notice({ tone = 'info', title, children, action, className }: { tone?: NoticeTone; title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = noticeIcons[tone];
  return (
    <section className={classes('ds-notice', `ds-notice--${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" />
      <div className="ds-notice__copy"><strong>{title}</strong><div>{children}</div></div>
      {action && <div className="ds-notice__action">{action}</div>}
    </section>
  );
}

export function Skeleton({ lines = 3, label = 'Loading content' }: { lines?: number; label?: string }) {
  return (
    <div className="ds-skeleton" role="status" aria-live="polite" aria-atomic="true" aria-label={label}>
      {Array.from({ length: lines }, (_, index) => <span key={index} />)}
    </div>
  );
}

export type DialogSize = 'small' | 'default' | 'large';

export function Dialog({ open, onClose, title, description, children, actions, size = 'default' }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; actions?: ReactNode; size?: DialogSize }) {
  const titleId = useId();
  const descriptionId = useId();
  const { dialogRef } = useModalBehavior<HTMLElement>({ open, onClose });

  if (!open) return null;

  return (
    <div className="ds-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={classes('ds-dialog', `ds-dialog--${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
        <header className="ds-dialog__header">
          <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
          <IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
        </header>
        {children && <div className="ds-dialog__content">{children}</div>}
        {actions && <footer className="ds-dialog__actions">{actions}</footer>}
      </section>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return (
    <header className={classes('ds-page-header', className)}>
      <div>{eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="ds-page-header__actions platform-heading-actions">{actions}</div>}
    </header>
  );
}

export type StateTone = 'empty' | 'loading' | 'error' | 'restricted' | 'success';

const stateIcons = {
  empty: CircleAlert,
  loading: LoaderCircle,
  error: AlertTriangle,
  restricted: LockKeyhole,
  success: CheckCircle2,
};

export function StatePanel({ tone, title, description, action }: { tone: StateTone; title: string; description: string; action?: ReactNode }) {
  const Icon = stateIcons[tone];
  return (
    <section className={classes('ds-state', `ds-state--${tone}`)} role={tone === 'error' ? 'alert' : tone === 'loading' ? 'status' : undefined} aria-live={tone === 'loading' ? 'polite' : undefined}>
      <Icon className={tone === 'loading' ? 'ds-spin' : undefined} size={24} aria-hidden="true" />
      <div><h2>{title}</h2><p>{description}</p>{action}</div>
    </section>
  );
}

export function Panel({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes('ds-panel', className)}>{children}</section>;
}

export function DataList({ headers, rows, label }: { headers: string[]; rows: ReactNode[][]; label: string }) {
  return (
    <div className="ds-table-wrap">
      <table className="ds-table" aria-label={label}>
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
