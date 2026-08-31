"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean; // enable hover lift (default true)
  padded?: boolean; // apply default padding
  as?: "div" | "article" | "section";
}

export default function Card({
  hover = true,
  padded = false,
  as = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={[
        "card",
        hover ? "" : "card-flat",
        padded ? "card-pad" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
