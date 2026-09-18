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
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal cursor-pointer disabled:opacity-50";

  const variantClasses = {
    outline:
      "border border-navy/20 text-navy hover:bg-beige/60 active:scale-[0.98]",
    ghost: "text-navy/70 hover:text-navy hover:bg-beige/40",
    primary: "bg-navy text-white hover:bg-navy-dark shadow-xs",
  };

  return (
    <form action="/auth/signout" method="post" className="inline-block">
      <button
        type="submit"
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        aria-label="Sign out of Tutr"
      >
        <LogOut className="w-4 h-4 text-teal" />
        <span>Logout</span>
      </button>
    </form>
  );
}
