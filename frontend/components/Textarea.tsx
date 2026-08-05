"use client";

import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, className = "", containerClassName = "", id, ...rest },
    ref
  ) {
    const areaId = id || rest.name;
    return (
      <div className={containerClassName}>
        {label && (
          <label className="field-label" htmlFor={areaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={["textarea", error ? "input-error" : "", className]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {error ? (
          <p className="field-error">{error}</p>
        ) : hint ? (
          <p className="field-hint">{hint}</p>
        ) : null}
      </div>
    );
  }
);

export default Textarea;
