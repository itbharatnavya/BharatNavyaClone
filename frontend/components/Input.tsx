"use client";

import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, className = "", containerClassName = "", id, ...rest },
  ref
) {
  const inputId = id || rest.name;
  const inputEl = (
    <input
      ref={ref}
      id={inputId}
      className={["input", error ? "input-error" : "", leftIcon ? "pl-10" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );

  return (
    <div className={containerClassName}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {leftIcon ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            {leftIcon}
          </span>
          {inputEl}
        </div>
      ) : (
        inputEl
      )}
      {error ? (
        <p className="field-error">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
