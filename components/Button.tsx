import React from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "sky";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  ariaLabel?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  icon,
  iconPosition = "left",
  ariaLabel,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-navy text-white hover:bg-navy-dark shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary:
      "bg-teal text-white hover:bg-teal-dark shadow-sm hover:shadow-md active:scale-[0.98]",
    outline:
      "border border-navy/20 text-navy hover:bg-beige/60 hover:border-navy/40 active:scale-[0.98]",
    ghost:
      "text-navy hover:bg-beige/50 active:scale-[0.98]",
    sky:
      "bg-sky text-navy hover:bg-sky-dark/70 font-semibold shadow-sm hover:shadow active:scale-[0.98]",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5 min-h-[36px]",
    md: "text-sm px-5 py-2.5 gap-2 min-h-[44px]",
    lg: "text-base px-6 py-3.5 gap-2.5 min-h-[50px]",
  };

  const combinedClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

  const content = (
    <>
      {icon && iconPosition === "left" && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === "right" && <span className="inline-flex shrink-0">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses} aria-label={ariaLabel} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}
