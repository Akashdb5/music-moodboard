"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const UserNav = () => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <Skeleton className="h-8 w-32 rounded-full" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/auth/login">Log in</Link>
      </Button>
    );
  }

  const initials =
    user.name?.charAt(0)?.toUpperCase() ??
    user.email?.charAt(0)?.toUpperCase() ??
    "?";

  const description = user.email ?? user.nickname;

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage
          src={user.picture ?? undefined}
          alt={user.name ?? description ?? "User avatar"}
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="hidden text-left text-sm leading-tight sm:block">
        <div className="font-medium text-foreground">
          {user.name ?? description ?? "Authenticated user"}
        </div>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/logout">Log out</Link>
      </Button>
    </div>
  );
};
