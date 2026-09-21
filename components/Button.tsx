import React from "react";
import Link from "next/link";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "sky"
  | "student"
  | "tutor"
  | "coral";
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
    "inline-flex items-center justify-center font-bold rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

  const variantStyles: Record<ButtonVariant, string> = {
    student:
      "bg-honey text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-honey-dark hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    tutor:
      "bg-purple-accent text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-purple-dark/80 hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    coral:
      "bg-coral text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-coral-dark hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    primary:
      "bg-ink text-white border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-[#2A2333] hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    secondary:
      "bg-purple-accent text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-purple-dark/80 hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    outline:
      "bg-white text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-canvas-subtle hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
    ghost:
      "text-ink hover:bg-purple-light active:scale-[0.98]",
    sky:
      "bg-purple-accent text-ink border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-purple-dark/80 hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[4px_4px_0px_#18121E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_#18121E]",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "text-xs px-4 py-1.5 gap-1.5 min-h-[36px]",
    md: "text-sm px-5 py-2.5 gap-2 min-h-[44px]",
    lg: "text-base px-7 py-3.5 gap-2.5 min-h-[50px]",
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
