"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";
import type { User } from "@auth0/nextjs-auth0/types";

type AuthProviderProps = {
  user?: User;
  children: React.ReactNode;
};

export const AuthProvider = ({ user, children }: AuthProviderProps) => {
  return <Auth0Provider user={user}>{children}</Auth0Provider>;
};
