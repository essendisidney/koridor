"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { postAuthPath } from "@/lib/journey";

export function SessionCta({
  guestHref = "/start",
  guestLabel = "Get started",
  continueLabel = "Continue",
  size = "sm",
  className,
  variant = "primary",
}: {
  guestHref?: string;
  guestLabel?: string;
  continueLabel?: string;
  size?: "sm" | "lg";
  className?: string;
  variant?: "primary" | "secondary" | "hero";
}) {
  const { user, loading, accessToken } = useAuth();

  if (loading) {
    return (
      <Button size={size} className={className} disabled>
        {guestLabel}
      </Button>
    );
  }

  if (accessToken && user) {
    return (
      <Link href={postAuthPath(user)}>
        <Button size={size} className={className}>
          {continueLabel}
        </Button>
      </Link>
    );
  }

  return (
    <Link href={guestHref}>
      <Button
        size={size}
        variant={variant === "secondary" ? "secondary" : "primary"}
        className={className}
      >
        {guestLabel}
      </Button>
    </Link>
  );
}

export function SessionTextLink({
  guestHref = "/login",
  guestLabel = "Sign in",
  className,
}: {
  guestHref?: string;
  guestLabel?: string;
  className?: string;
}) {
  const { user, loading, accessToken } = useAuth();
  if (loading) return null;
  if (accessToken && user) {
    return (
      <Link href={postAuthPath(user)} className={className}>
        Workspace
      </Link>
    );
  }
  return (
    <Link href={guestHref} className={className}>
      {guestLabel}
    </Link>
  );
}
