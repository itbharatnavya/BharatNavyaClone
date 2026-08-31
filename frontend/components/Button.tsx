"use client";

import React from "react";
import Link from "next/link";

export type ButtonVariant =
  | "primary" // action orange
  | "brand" // trust blue
  | "green" // tricolor-green — Recruitment's module color
  | "secondary" // white + border
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function classes(
  variant: ButtonVariant,
  size: ButtonSize,
  block: boolean,
  className: string
): string {
  return [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    block ? "btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    block = false,
    className = "",
    children,
    leftIcon,
    rightIcon,
  } = props;

  const cls = classes(variant, size, block, className);
  const content = (
    <>
      {leftIcon}
      {children}
      {rightIcon}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    const {
      variant: _v,
      size: _s,
      block: _b,
      className: _c,
      children: _ch,
      leftIcon: _li,
      rightIcon: _ri,
      href,
      ...rest
    } = props;
    return (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    block: _b,
    className: _c,
    children: _ch,
    leftIcon: _li,
    rightIcon: _ri,
    type,
    ...rest
  } = props as ButtonAsButton;

  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {content}
    </button>
  );
}
