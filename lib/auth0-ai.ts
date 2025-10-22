import { Auth0AI } from "@auth0/ai-vercel";
import type { Tool } from "ai";

import { auth0 } from "@/lib/auth0";
import { SPOTIFY_CONNECTION, SPOTIFY_SCOPES } from "@/lib/spotify-config";

const auth0AI = new Auth0AI();

const withSpotifyToken = auth0AI.withTokenVault({
  connection: SPOTIFY_CONNECTION,
  scopes: [...SPOTIFY_SCOPES],
  refreshToken: async () => {
    const session = await auth0.getSession();
    const refreshToken = session?.tokenSet.refreshToken as string;
    return refreshToken;
  },
});

const sanitizeBindingMessage = (value: string) =>
  value.replace(/[^A-Za-z0-9\s+\-_.:,#]/g, "").trim();

const imageAsyncAuthorization = auth0AI.withAsyncAuthorization({
  scopes: ["openid"],
  userID: async () => {
    const session = await auth0.getSession();
    const userID = session?.user?.sub;
    if (!userID) {
      throw new Error("Spotify actions require an authenticated user.");
    }
    return userID;
  },
  bindingMessage: async () =>
    sanitizeBindingMessage("Approve uploading playlist artwork"),
});

export const withSpotify = withSpotifyToken;

export const withSpotifyPlaylistConfirmation = <T extends Tool<any, any>>(
  tool: T,
) =>
  withSpotifyToken(tool) as T;

export const withSpotifyImageConfirmation = <T extends Tool<any, any>>(
  tool: T,
) =>
  withSpotifyToken(imageAsyncAuthorization(tool)) as T;
