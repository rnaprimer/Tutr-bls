"use client";

import React from "react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  variant?: "outline" | "ghost" | "primary";
}

export function SignOutButton({
  className = "",
  variant = "outline",
}: SignOutButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 focus-visible:outline-none cursor-pointer disabled:opacity-50";

  const variantClasses = {
    outline:
      "border-2 border-ink bg-white text-ink hover:bg-gray-50 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_#18121E]",
    ghost: "text-ink/70 hover:text-ink hover:bg-canvas-lavender",
    primary: "border-2 border-ink bg-warm-coral text-white hover:bg-warm-coral/90 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_#18121E]",
  };

  return (
    <form action="/auth/signout" method="post" className="inline-block">
      <button
        type="submit"
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        aria-label="Sign out of Tutr"
      >
        <LogOut className="w-3.5 h-3.5 text-ink" />
        <span>Logout</span>
      </button>
    </form>
  );
}
