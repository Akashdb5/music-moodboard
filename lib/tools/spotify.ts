import { Buffer } from "node:buffer";

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { TokenVaultError } from "@auth0/ai/interrupts";
import { tool, type ToolCallOptions } from "ai";
import { type FlexibleSchema } from "@ai-sdk/provider-utils";
import { z } from "zod";

import {
  withSpotify,
  withSpotifyPlaylistConfirmation,
  withSpotifyImageConfirmation,
} from "@/lib/auth0-ai";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const tokenError = () =>
  new TokenVaultError("Authorization required to access Spotify API");

const spotifyFetch = async <T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const headers = new Headers(init?.headers ?? undefined);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    throw tokenError();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Spotify API request failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  if (response.status === 204 || response.status === 202) {
    // Empty response body
    return null as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (null as T);
  }

  const text = await response.text();
  return text.length > 0 ? (text as unknown as T) : (null as T);
};

const extractSpotifyId = (value: string, type: "track" | "artist" | "playlist") => {
  const uriMatch = value.match(new RegExp(`spotify:${type}:([A-Za-z0-9]+)`));
  if (uriMatch?.[1]) {
    return uriMatch[1];
  }

  const urlMatch = value.match(
    new RegExp(`spotify\\.com/${type}/([A-Za-z0-9]+)`),
  );
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return value;
};

const toTrackUri = (trackIdentifier: string) => {
  if (trackIdentifier.startsWith("spotify:track:")) {
    return trackIdentifier;
  }

  if (trackIdentifier.includes("open.spotify.com/track/")) {
    const id = extractSpotifyId(trackIdentifier, "track");
    return `spotify:track:${id}`;
  }

  return `spotify:track:${trackIdentifier}`;
};

const defineTool = <Schema extends z.ZodTypeAny, Output>(config: {
  description: string;
  schema: Schema;
  execute: (
    input: z.output<Schema>,
    options: ToolCallOptions,
  ) => Promise<Output> | Output;
}) => {
  // Create the configuration object
  const cfg = {
    description: config.description,
    inputSchema:
      config.schema as unknown as FlexibleSchema<z.output<Schema>>,
    execute: config.execute,
    outputSchema: z.any() as unknown as FlexibleSchema<Output>,
  };

  // Cast through unknown to satisfy all current overloads of ai@5.x
  return tool(cfg as unknown as Parameters<typeof tool>[0]) as ReturnType<
    typeof tool<z.output<Schema>, Output>
  >;
};


type PlaylistSummary = {
  id: string;
  name: string;
  url: string;
  totalTracks: number;
};

type TrackSummary = {
  id: string;
  name: string;
  url: string;
  artists: string[];
};

type SpotifyTrackApi = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  external_urls?: { spotify?: string };
};

type PlaylistImage = {
  url: string;
  width: number | null;
  height: number | null;
};

type ListPlaylistsResult = {
  message: string;
  playlists: PlaylistSummary[];
  totalPlaylists: number;
};

type SearchSpotifyResults = {
  tracks?: {
    items: Array<SpotifyTrackApi>;
  };
  artists?: {
    items: Array<{
      id: string;
      name: string;
      genres?: string[];
      external_urls?: { spotify?: string };
    }>;
  };
  albums?: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      release_date?: string;
      external_urls?: { spotify?: string };
    }>;
  };
  playlists?: {
    items: Array<{
      id: string;
      name: string;
      owner?: { display_name?: string };
      external_urls?: { spotify?: string };
    }>;
  };
};

type SearchSpotifyResult = {
  message: string;
  results: SearchSpotifyResults;
};

type TrackDetails = {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  artists: Array<{ name: string }>;
  album: { name: string; release_date?: string };
  external_urls?: { spotify?: string };
};

type TrackDetailsResult = {
  message: string;
  track: TrackDetails;
};

type AudioFeaturesResult = {
  message: string;
  features: {
    tempo: number;
    energy: number;
    valence: number;
    danceability: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    speechiness: number;
  };
};

type SpotifyUserProfile = {
  id: string;
  display_name?: string;
};

type UserProfileResult = {
  message: string;
  profile: SpotifyUserProfile;
};

type CreatePlaylistResult = {
  message: string;
  playlist: {
    id: string;
    name: string;
    external_urls?: { spotify?: string };
  };
};

type AddTracksResult = {
  message: string;
  playlistId: string;
  addedTrackUris: string[];
};

type PlaylistDetailsResult = {
  message: string;
  playlist: {
    id: string;
    name: string;
    description?: string;
    tracks: {
      total: number;
      items: Array<{
        track: SpotifyTrackApi;
      }>;
    };
    owner?: { display_name?: string };
    external_urls?: { spotify?: string };
  };
  sampleTracks: TrackSummary[];
};

type RecommendationsResult = {
  message: string;
  recommendations: TrackSummary[];
};

type PlaybackState = {
  device?: { id: string | null; name?: string } | null;
  is_playing?: boolean;
  progress_ms?: number | null;
  item?: SpotifyTrackApi | null;
};

type RecentlyPlayedItem = {
  played_at: string;
  track: SpotifyTrackApi;
};

const formatArtists = (artists: Array<{ name: string }>) =>
  artists.map((artist) => artist.name);

const toTrackSummary = (track: SpotifyTrackApi): TrackSummary => ({
  id: track.id,
  name: track.name,
  url: track.external_urls?.spotify ?? "",
  artists: formatArtists(track.artists ?? []),
});

const summarizeTracks = (tracks: TrackSummary[]) =>
  tracks
    .map(
      (track) =>
        `• ${track.name} — ${track.artists.join(", ")}${
          track.url ? ` (${track.url})` : ""
        }`,
    )
    .join("\n");

const buildQueryString = (
  params: Record<string, string | number | boolean | undefined>,
) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
};

/**
 * Get current user's profile (used internally by multiple tools).
 */
const getCurrentUser = async (accessToken: string) =>
  spotifyFetch<SpotifyUserProfile>(accessToken, "/me");

/**
 * Get the user's playlists.
 */
const listPlaylistsParameters = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

const rawListPlaylists = defineTool({
  description: "List Spotify playlists for the current user",
  schema: listPlaylistsParameters,
  execute: async (
    { limit }: z.infer<typeof listPlaylistsParameters>,
    options,
  ): Promise<ListPlaylistsResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();

    const data = await spotifyFetch<{
      items: Array<{
        id: string;
        name: string;
        tracks: { total: number };
        external_urls?: { spotify?: string };
      }>;
      total: number;
    }>(accessToken, `/me/playlists?limit=${limit}`);

    const playlists: PlaylistSummary[] = (data.items ?? []).map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      totalTracks: playlist.tracks?.total ?? 0,
      url: playlist.external_urls?.spotify ?? "",
    }));

    if (playlists.length === 0) {
      return {
        message:
          "I couldn’t find any Spotify playlists on your account yet. You can create one in Spotify and try again.",
        playlists: [],
        totalPlaylists: data.total ?? 0,
      };
    }

    const formattedList = playlists
      .slice(0, limit)
      .map(
        (playlist) =>
          `• ${playlist.name} (${playlist.totalTracks} tracks)${
            playlist.url ? ` — ${playlist.url}` : ""
          }`,
      )
      .join("\n");

    return {
      message: `Here are ${playlists.length} of your playlists:\n${formattedList}`,
      playlists,
      totalPlaylists: data.total ?? playlists.length,
    };
  },
});

/**
 * Search songs, artists, or albums.
 */
const searchSpotifyParameters = z.object({
  query: z.string().min(1, "Search query is required."),
  types: z
    .array(z.enum(["track", "artist", "album", "playlist"]))
    .min(1)
    .max(4)
    .default(["track", "artist"]),
  limit: z.number().int().min(1).max(20).default(5),
});

const rawSearchSpotify = defineTool({
  description: "Search Spotify for tracks, artists, albums, or playlists",
  schema: searchSpotifyParameters,
  execute: async ({
    query,
    types,
    limit,
  }: z.infer<typeof searchSpotifyParameters>,
  options,
  ): Promise<SearchSpotifyResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const searchParams = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: limit.toString(),
    });

    const data = await spotifyFetch<SearchSpotifyResults>(
      accessToken,
      `/search?${searchParams.toString()}`,
    );

    const sections: string[] = [];

    if (data.tracks?.items?.length) {
      const topTracks = data.tracks.items.slice(0, limit).map((track) => ({
        id: track.id,
        name: track.name,
        artists: formatArtists(track.artists),
        url: track.external_urls?.spotify ?? "",
      }));

      const list = topTracks
        .map(
          (track) =>
            `• ${track.name} — ${track.artists.join(", ")}${
              track.url ? ` (${track.url})` : ""
            }`,
        )
        .join("\n");

      sections.push(`Top tracks:\n${list}`);
    }

    if (data.artists?.items?.length) {
      const topArtists = data.artists.items.slice(0, limit).map((artist) => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres ?? [],
        url: artist.external_urls?.spotify ?? "",
      }));

      const list = topArtists
        .map(
          (artist) =>
            `• ${artist.name}${
              artist.genres.length ? ` (${artist.genres.slice(0, 3).join(", ")})` : ""
            }${artist.url ? ` — ${artist.url}` : ""}`,
        )
        .join("\n");

      sections.push(`Artists:\n${list}`);
    }

    if (data.albums?.items?.length) {
      const topAlbums = data.albums.items.slice(0, limit).map((album) => ({
        id: album.id,
        name: album.name,
        releaseDate: album.release_date ?? "n/a",
        artists: formatArtists(album.artists),
        url: album.external_urls?.spotify ?? "",
      }));

      const list = topAlbums
        .map(
          (album) =>
            `• ${album.name} — ${album.artists.join(", ")}${
              album.releaseDate !== "n/a" ? ` (${album.releaseDate})` : ""
            }${album.url ? ` — ${album.url}` : ""}`,
        )
        .join("\n");

      sections.push(`Albums:\n${list}`);
    }

    if (data.playlists?.items?.length) {
      const playlistItems = data.playlists.items.filter(
        (playlist): playlist is NonNullable<
          (typeof data.playlists.items)[number]
        > => playlist != null,
      );

      const topPlaylists = playlistItems.slice(0, limit).map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner?.display_name ?? "Unknown owner",
        url: playlist.external_urls?.spotify ?? "",
      }));

      const list = topPlaylists
        .map(
          (playlist) =>
            `• ${playlist.name} by ${playlist.owner}${
              playlist.url ? ` — ${playlist.url}` : ""
            }`,
        )
        .join("\n");

      sections.push(`Playlists:\n${list}`);
    }

    return {
      message:
        sections.length > 0
          ? sections.join("\n\n")
          : "No Spotify results found for that search.",
      results: data,
    };
  },
});

/**
 * Get track details.
 */
const getTrackDetailsParameters = z.object({
  trackId: z.string().min(1, "Track ID or URL is required."),
});

const rawGetTrackDetails = defineTool({
  description: "Get metadata for a Spotify track by ID or URL",
  schema: getTrackDetailsParameters,
  execute: async (
    { trackId }: z.infer<typeof getTrackDetailsParameters>,
    options,
  ): Promise<TrackDetailsResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(trackId, "track");

    const track = await spotifyFetch<TrackDetails>(
      accessToken,
      `/tracks/${id}`,
    );

    const durationMinutes = Math.floor(track.duration_ms / 60000);
    const durationSeconds = Math.round((track.duration_ms % 60000) / 1000);

    return {
      message: `“${track.name}” by ${formatArtists(track.artists).join(", ")} — ${
        track.album.name
      } (${track.album.release_date ?? "unknown release date"}). ${
        track.explicit ? "Explicit version. " : ""
      }Duration: ${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}. Popularity score: ${track.popularity}/100.${
        track.external_urls?.spotify ? ` Listen: ${track.external_urls.spotify}` : ""
      }`,
      track,
    };
  },
});

/**
 * Get audio features for a track.
 */
const getAudioFeaturesParameters = z.object({
  trackId: z.string().min(1, "Track ID or URL is required."),
});

const rawGetAudioFeatures = defineTool({
  description: "Retrieve tempo and other audio features for a Spotify track",
  schema: getAudioFeaturesParameters,
  execute: async (
    { trackId }: z.infer<typeof getAudioFeaturesParameters>,
    options,
  ): Promise<AudioFeaturesResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(trackId, "track");

    const features = await spotifyFetch<AudioFeaturesResult["features"]>(
      accessToken,
      `/audio-features/${id}`,
    );

    const toPercent = (value: number) => Math.round(value * 100);

    return {
      message: `Audio profile — tempo: ${Math.round(
        features.tempo,
      )} BPM, energy: ${toPercent(features.energy)}%, valence: ${toPercent(
        features.valence,
      )}%, danceability: ${toPercent(
        features.danceability,
      )}%, acousticness: ${toPercent(
        features.acousticness,
      )}%`,
      features,
    };
  },
});

/**
 * Get current user's profile.
 */
const getUserProfileParameters = z.object({});

const rawGetUserProfile = defineTool({
  description: "Get the current Spotify user profile",
  schema: getUserProfileParameters,
  execute: async (input, options): Promise<UserProfileResult> => {
    void input;
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const user = await getCurrentUser(accessToken);

    return {
      message: `You’re logged in as ${user.display_name ?? user.id} (user id: ${user.id}).`,
      profile: user,
    };
  },
});

/**
 * Create a new playlist.
 */
const createPlaylistParameters = z.object({
  name: z.string().min(1, "Playlist name is required."),
  description: z.string().max(300).optional(),
  isPublic: z.boolean().default(false),
});

const rawCreatePlaylist = defineTool({
  description: "Create a new Spotify playlist in the user’s account",
  schema: createPlaylistParameters,
  execute: async ({
    name,
    description,
    isPublic,
  }: z.infer<typeof createPlaylistParameters>,
  options,
  ): Promise<CreatePlaylistResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const user = await getCurrentUser(accessToken);

    const playlist = await spotifyFetch<CreatePlaylistResult["playlist"]>(
      accessToken,
      `/users/${user.id}/playlists`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          public: isPublic,
        }),
      },
    );

    return {
      message: `Created playlist “${playlist.name}”${
        playlist.external_urls?.spotify ? ` — ${playlist.external_urls.spotify}` : ""
      }.`,
      playlist,
    };
  },
});

/**
 * Add tracks to a playlist.
 */
const addTracksToPlaylistParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  trackUris: z
    .array(z.string().min(1, "Track URI or ID is required."))
    .min(1, "Provide at least one track URI or ID."),
  position: z.number().int().min(0).optional(),
});

const rawAddTracksToPlaylist = defineTool({
  description: "Add tracks to an existing Spotify playlist",
  schema: addTracksToPlaylistParameters,
  execute: async ({
    playlistId,
    trackUris,
    position,
  }: z.infer<typeof addTracksToPlaylistParameters>,
  options,
  ): Promise<AddTracksResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");
    const uris = trackUris.map(toTrackUri);

    await spotifyFetch(
      accessToken,
      `/playlists/${id}/tracks`,
      {
        method: "POST",
        body: JSON.stringify({
          uris,
          position,
        }),
      },
    );

    return {
      message: `Added ${uris.length} track(s) to playlist ${id}.`,
      playlistId: id,
      addedTrackUris: uris,
    };
  },
});

const updatePlaylistDetailsParameters = z
  .object({
    playlistId: z.string().min(1, "Playlist ID or URL is required."),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(300).optional(),
    isPublic: z.boolean().optional(),
    collaborative: z.boolean().optional(),
  })
  .refine(
    (payload) =>
      Boolean(
        payload.name ??
          payload.description ??
          payload.isPublic ??
          payload.collaborative,
      ),
    {
      message:
        "Provide at least one field to update (name, description, public, collaborative).",
    },
  );

const rawUpdatePlaylistDetails = defineTool({
  description: "Update a Spotify playlist's metadata",
  schema: updatePlaylistDetailsParameters,
  execute: async ({ playlistId, name, description, isPublic, collaborative }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    const body: Record<string, unknown> = {};
    if (typeof name === "string") body.name = name;
    if (typeof description === "string") body.description = description;
    if (typeof isPublic === "boolean") body.public = isPublic;
    if (typeof collaborative === "boolean") body.collaborative = collaborative;

    await spotifyFetch(accessToken, `/playlists/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return {
      message: `Updated playlist ${id}.`,
      playlistId: id,
      changes: body,
    };
  },
});

const removeTracksFromPlaylistParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  trackUris: z
    .array(z.string().min(1, "Track ID or URI is required."))
    .min(1, "Provide at least one track to remove."),
});

const rawRemoveTracksFromPlaylist = defineTool({
  description: "Remove tracks from a Spotify playlist",
  schema: removeTracksFromPlaylistParameters,
  execute: async ({ playlistId, trackUris }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");
    const tracks = trackUris.map((uri) => ({ uri: toTrackUri(uri) }));

    await spotifyFetch(accessToken, `/playlists/${id}/tracks`, {
      method: "DELETE",
      body: JSON.stringify({ tracks }),
    });

    return {
      message: `Removed ${tracks.length} track(s) from playlist ${id}.`,
      playlistId: id,
      removedTrackUris: tracks.map((item) => item.uri),
    };
  },
});

const reorderPlaylistTracksParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  rangeStart: z.number().int().min(0),
  insertBefore: z.number().int().min(0),
  rangeLength: z.number().int().min(1).optional(),
});

const rawReorderPlaylistTracks = defineTool({
  description: "Reorder tracks within a Spotify playlist",
  schema: reorderPlaylistTracksParameters,
  execute: async ({ playlistId, rangeStart, insertBefore, rangeLength }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    const body: Record<string, number> = {
      range_start: rangeStart,
      insert_before: insertBefore,
    };
    if (typeof rangeLength === "number") {
      body.range_length = rangeLength;
    }

    await spotifyFetch(accessToken, `/playlists/${id}/tracks`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return {
      message: `Moved track range starting at ${rangeStart} to position ${insertBefore}.`,
      playlistId: id,
      details: body,
    };
  },
});

const getPlaylistImageParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
});

const rawGetPlaylistImage = defineTool({
  description: "List the available cover images for a playlist",
  schema: getPlaylistImageParameters,
  execute: async ({ playlistId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    const images = await spotifyFetch<PlaylistImage[] | null>(
      accessToken,
      `/playlists/${id}/images`,
    );

    return {
      message:
        images && images.length > 0
          ? `Found ${images.length} cover image(s) for playlist ${id}.`
          : `No cover images found for playlist ${id}.`,
      images: images ?? [],
      playlistId: id,
    };
  },
});

const uploadPlaylistImageParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  imageBase64: z.string().min(1, "Base64-encoded image data is required."),
});

const rawUploadPlaylistImage = defineTool({
  description: "Upload a new cover image for a playlist",
  schema: uploadPlaylistImageParameters,
  execute: async ({ playlistId, imageBase64 }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    await spotifyFetch(accessToken, `/playlists/${id}/images`, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
      },
      body: Buffer.from(imageBase64, "base64"),
    });

    return {
      message: `Uploaded a new cover image for playlist ${id}.`,
      playlistId: id,
    };
  },
});

const uploadPlaylistCoverImageParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  imageBase64: z.string().min(1, "Base64-encoded image data is required."),
  mimeType: z.enum(["image/jpeg", "image/png"]).default("image/jpeg"),
});

const rawUploadPlaylistCoverImage = defineTool({
  description: "Upload a custom image for a playlist cover",
  schema: uploadPlaylistCoverImageParameters,
  execute: async ({ playlistId, imageBase64, mimeType }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    await spotifyFetch(accessToken, `/playlists/${id}/images`, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: Buffer.from(imageBase64, "base64"),
    });

    return {
      message: `Uploaded a custom cover image for playlist ${id}.`,
      playlistId: id,
      mimeType,
    };
  },
});

/**
 * Get playlist details.
 */
const getPlaylistDetailsParameters = z.object({
  playlistId: z.string().min(1, "Playlist ID or URL is required."),
  limit: z.number().int().min(1).max(50).default(10),
});

const rawGetPlaylistDetails = defineTool({
  description: "Get details for a Spotify playlist including sample tracks",
  schema: getPlaylistDetailsParameters,
  execute: async ({
    playlistId,
    limit,
  }: z.infer<typeof getPlaylistDetailsParameters>,
  options,
  ): Promise<PlaylistDetailsResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();
    const id = extractSpotifyId(playlistId, "playlist");

    const playlist = await spotifyFetch<PlaylistDetailsResult["playlist"]>(
      accessToken,
      `/playlists/${id}?limit=${limit}`,
    );

    const sampleTracks = (playlist.tracks?.items ?? [])
      .slice(0, limit)
      .map((item) => item.track)
      .filter(Boolean)
      .map((track) => ({
        id: track.id,
        name: track.name,
        artists: formatArtists(track.artists),
        url: track.external_urls?.spotify ?? "",
      }));

    const trackList =
      sampleTracks.length > 0
        ? sampleTracks
            .map(
              (track) =>
                `• ${track.name} — ${track.artists.join(", ")}${
                  track.url ? ` (${track.url})` : ""
                }`,
            )
            .join("\n")
        : "No tracks yet.";

    return {
      message: `Playlist “${playlist.name}” by ${
        playlist.owner?.display_name ?? "unknown owner"
      } (${playlist.tracks?.total ?? 0} total tracks).\n${
        playlist.description ? `${playlist.description}\n` : ""
      }Sample tracks:\n${trackList}`,
      playlist,
      sampleTracks,
    };
  },
});

/**
 * Get recommendations based on seeds and optional audio targets.
 */
const recommendationParameters = z
  .object({
    seedArtists: z.array(z.string()).optional(),
    seedTracks: z.array(z.string()).optional(),
    seedGenres: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(100).default(10),
    targetEnergy: z.number().min(0).max(1).optional(),
    targetValence: z.number().min(0).max(1).optional(),
    targetDanceability: z.number().min(0).max(1).optional(),
    targetTempo: z.number().min(0).max(250).optional(),
  })
  .refine(
    (data) =>
      (data.seedArtists?.length ?? 0) +
        (data.seedTracks?.length ?? 0) +
        (data.seedGenres?.length ?? 0) >
      0,
    { message: "Provide at least one seed artist, track, or genre." },
  );

const rawGetRecommendations = defineTool({
  description:
    "Get Spotify track recommendations based on seed artists, tracks, genres, or target audio features",
  schema: recommendationParameters,
  execute: async ({
    seedArtists,
    seedTracks,
    seedGenres,
    limit,
    targetEnergy,
    targetValence,
    targetDanceability,
    targetTempo,
  }: z.infer<typeof recommendationParameters>,
  options,
  ): Promise<RecommendationsResult> => {
    void options;
    const accessToken = getAccessTokenFromTokenVault();

    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (seedArtists?.length) {
      params.set(
        "seed_artists",
        seedArtists.map((id) => extractSpotifyId(id, "artist")).join(","),
      );
    }

    if (seedTracks?.length) {
      params.set(
        "seed_tracks",
        seedTracks.map((id) => extractSpotifyId(id, "track")).join(","),
      );
    }

    if (seedGenres?.length) {
      params.set("seed_genres", seedGenres.join(","));
    }

    if (typeof targetEnergy === "number") {
      params.set("target_energy", targetEnergy.toString());
    }
    if (typeof targetValence === "number") {
      params.set("target_valence", targetValence.toString());
    }
    if (typeof targetDanceability === "number") {
      params.set("target_danceability", targetDanceability.toString());
    }
    if (typeof targetTempo === "number") {
      params.set("target_tempo", targetTempo.toString());
    }

    const data = await spotifyFetch<{
      tracks: Array<SpotifyTrackApi>;
    }>(accessToken, `/recommendations?${params.toString()}`);

    const recommendations: TrackSummary[] = (data.tracks ?? []).map((track) => ({
      id: track.id,
      name: track.name,
      artists: formatArtists(track.artists),
      url: track.external_urls?.spotify ?? "",
    }));

    if (recommendations.length === 0) {
      return {
        message: "Spotify did not return any recommendations for those seeds.",
        recommendations: [],
      };
    }

    const list = recommendations
      .map(
        (track) =>
          `• ${track.name} — ${track.artists.join(", ")}${
            track.url ? ` (${track.url})` : ""
          }`,
      )
      .join("\n");

    return {
      message: `Here are ${recommendations.length} recommended track(s):\n${list}`,
      recommendations,
    };
  },
});

const getCurrentPlaybackParameters = z.object({
  market: z.string().optional(),
  additionalTypes: z.array(z.enum(["track", "episode"])).optional(),
});

const rawGetCurrentPlayback = defineTool({
  description: "Get the current playback state for the user",
  schema: getCurrentPlaybackParameters,
  execute: async ({ market, additionalTypes }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const types = additionalTypes?.length ? additionalTypes : ["track"];
    const query = buildQueryString({
      market,
      additional_types: types.join(","),
    });

    const playback = await spotifyFetch<PlaybackState | null>(
      accessToken,
      `/me/player${query}`,
    );

    if (!playback) {
      return {
        message: "Spotify isn’t currently playing anything for this user.",
        playback: null,
      };
    }

    const summary = playback.item
      ? `Now playing: ${playback.item.name} by ${formatArtists(playback.item.artists).join(", ")}`
      : "Playback is paused.";

    return {
      message: summary,
      playback,
    };
  },
});

const getCurrentlyPlayingTrackParameters = z.object({
  market: z.string().optional(),
});

const rawGetCurrentlyPlayingTrack = defineTool({
  description: "Get the track currently playing on the user’s Spotify account",
  schema: getCurrentlyPlayingTrackParameters,
  execute: async ({ market }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ market });

    const result = await spotifyFetch<{ item?: SpotifyTrackApi } | null>(
      accessToken,
      `/me/player/currently-playing${query}`,
    );

    const track = result?.item;
    if (!track) {
      return {
        message: "Nothing is currently playing.",
        track: null,
      };
    }

    return {
      message: `Currently playing “${track.name}” by ${formatArtists(track.artists).join(", ")}.`,
      track,
    };
  },
});

const playTrackParameters = z
  .object({
    deviceId: z.string().optional(),
    trackUris: z.array(z.string()).optional(),
    contextUri: z.string().optional(),
    offset: z.number().int().min(0).optional(),
    positionMs: z.number().int().min(0).optional(),
  })
  .refine(
    ({ trackUris, contextUri }) =>
      (trackUris && trackUris.length > 0) || Boolean(contextUri),
    {
      message: "Provide track URIs or a context URI to start playback.",
    },
  );

const rawPlayTrack = defineTool({
  description: "Start or resume Spotify playback",
  schema: playTrackParameters,
  execute: async ({ deviceId, trackUris, contextUri, offset, positionMs }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ device_id: deviceId });

    const body: Record<string, unknown> = {};
    if (trackUris?.length) {
      body.uris = trackUris.map(toTrackUri);
    }
    if (contextUri) {
      body.context_uri = contextUri;
    }
    if (typeof offset === "number") {
      body.offset = { position: offset };
    }
    if (typeof positionMs === "number") {
      body.position_ms = positionMs;
    }

    await spotifyFetch(accessToken, `/me/player/play${query}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return {
      message: "Playback started.",
      request: body,
    };
  },
});

const optionalDeviceParameters = z.object({
  deviceId: z.string().optional(),
});

const rawPausePlayback = defineTool({
  description: "Pause Spotify playback",
  schema: optionalDeviceParameters,
  execute: async ({ deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ device_id: deviceId });
    await spotifyFetch(accessToken, `/me/player/pause${query}`, {
      method: "PUT",
    });
    return { message: "Playback paused." };
  },
});

const rawNextTrack = defineTool({
  description: "Skip to the next track",
  schema: optionalDeviceParameters,
  execute: async ({ deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ device_id: deviceId });
    await spotifyFetch(accessToken, `/me/player/next${query}`, {
      method: "POST",
    });
    return { message: "Skipped to the next track." };
  },
});

const rawPreviousTrack = defineTool({
  description: "Return to the previous track",
  schema: optionalDeviceParameters,
  execute: async ({ deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ device_id: deviceId });
    await spotifyFetch(accessToken, `/me/player/previous${query}`, {
      method: "POST",
    });
    return { message: "Went back to the previous track." };
  },
});

const seekPlaybackPositionParameters = z.object({
  positionMs: z.number().int().min(0),
  deviceId: z.string().optional(),
});

const rawSeekPlaybackPosition = defineTool({
  description: "Seek to a specific playback position",
  schema: seekPlaybackPositionParameters,
  execute: async ({ positionMs, deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({
      position_ms: positionMs,
      device_id: deviceId,
    });
    await spotifyFetch(accessToken, `/me/player/seek${query}`, {
      method: "PUT",
    });
    return { message: `Set playback position to ${positionMs}ms.` };
  },
});

const toggleShuffleParameters = z.object({
  state: z.boolean(),
  deviceId: z.string().optional(),
});

const rawToggleShuffle = defineTool({
  description: "Toggle Spotify shuffle mode",
  schema: toggleShuffleParameters,
  execute: async ({ state, deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ state, device_id: deviceId });
    await spotifyFetch(accessToken, `/me/player/shuffle${query}`, {
      method: "PUT",
    });
    return { message: `Shuffle ${state ? "enabled" : "disabled"}.` };
  },
});

const setRepeatModeParameters = z.object({
  state: z.enum(["track", "context", "off"]),
  deviceId: z.string().optional(),
});

const rawSetRepeatMode = defineTool({
  description: "Set Spotify repeat mode",
  schema: setRepeatModeParameters,
  execute: async ({ state, deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ state, device_id: deviceId });
    await spotifyFetch(accessToken, `/me/player/repeat${query}`, {
      method: "PUT",
    });
    return { message: `Repeat mode set to ${state}.` };
  },
});

const setVolumeParameters = z.object({
  volumePercent: z.number().int().min(0).max(100),
  deviceId: z.string().optional(),
});

const rawSetVolume = defineTool({
  description: "Set the Spotify playback volume",
  schema: setVolumeParameters,
  execute: async ({ volumePercent, deviceId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({
      volume_percent: volumePercent,
      device_id: deviceId,
    });
    await spotifyFetch(accessToken, `/me/player/volume${query}`, {
      method: "PUT",
    });
    return { message: `Set volume to ${volumePercent}%.` };
  },
});

const listSavedTracksParameters = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

const rawListSavedTracks = defineTool({
  description: "List the user’s saved tracks",
  schema: listSavedTracksParameters,
  execute: async ({ limit, offset }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ limit, offset });

    const data = await spotifyFetch<{
      items: Array<{ added_at: string; track: SpotifyTrackApi }>;
      total: number;
    }>(accessToken, `/me/tracks${query}`);

    const tracks = (data.items ?? []).map((item) => toTrackSummary(item.track));
    const list = tracks.length > 0 ? summarizeTracks(tracks) : "No saved tracks.";

    return {
      message: `You have ${data.total ?? tracks.length} saved track(s). Showing ${tracks.length}:
${list}`,
      tracks,
      total: data.total ?? tracks.length,
    };
  },
});

const listSavedAlbumsParameters = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

const rawListSavedAlbums = defineTool({
  description: "List the user’s saved albums",
  schema: listSavedAlbumsParameters,
  execute: async ({ limit, offset }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ limit, offset });

    const data = await spotifyFetch<{
      items: Array<{
        added_at: string;
        album: {
          id: string;
          name: string;
          artists: Array<{ name: string }>;
          release_date?: string;
          external_urls?: { spotify?: string };
        };
      }>;
      total: number;
    }>(accessToken, `/me/albums${query}`);

    const albums = (data.items ?? []).map((item) => ({
      id: item.album.id,
      name: item.album.name,
      artists: formatArtists(item.album.artists),
      releaseDate: item.album.release_date,
      url: item.album.external_urls?.spotify ?? "",
    }));

    const list = albums.length
      ? albums
          .map((album) => {
            const release = album.releaseDate ? ` (${album.releaseDate})` : "";
            const link = album.url ? ` (${album.url})` : "";
            return `• ${album.name} — ${album.artists.join(", ")}${release}${link}`;
          })
          .join("\n")
      : "No saved albums.";

    return {
      message: `You have ${data.total ?? albums.length} saved album(s). Showing ${albums.length}:
${list}`,
      albums,
      total: data.total ?? albums.length,
    };
  },
});

const modifyLibraryParameters = z.object({
  trackIds: z
    .array(z.string().min(1, "Track ID or URI is required."))
    .min(1, "Provide at least one track."),
});

const rawSaveTracksToLibrary = defineTool({
  description: "Save tracks to the user’s Spotify library",
  schema: modifyLibraryParameters,
  execute: async ({ trackIds }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = trackIds.map((id) => extractSpotifyId(id, "track"));

    await spotifyFetch(accessToken, `/me/tracks`, {
      method: "PUT",
      body: JSON.stringify(ids),
    });

    return {
      message: `Saved ${ids.length} track(s) to your library.`,
      trackIds: ids,
    };
  },
});

const rawRemoveTracksFromLibrary = defineTool({
  description: "Remove tracks from the user’s Spotify library",
  schema: modifyLibraryParameters,
  execute: async ({ trackIds }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = trackIds.map((id) => extractSpotifyId(id, "track"));

    await spotifyFetch(accessToken, `/me/tracks`, {
      method: "DELETE",
      body: JSON.stringify(ids),
    });

    return {
      message: `Removed ${ids.length} track(s) from your library.`,
      trackIds: ids,
    };
  },
});

const isTrackSavedParameters = z.object({
  trackIds: z
    .array(z.string().min(1, "Track ID or URI is required."))
    .min(1, "Provide at least one track."),
});

const rawIsTrackSaved = defineTool({
  description: "Check if tracks are saved in the user’s library",
  schema: isTrackSavedParameters,
  execute: async ({ trackIds }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = trackIds.map((id) => extractSpotifyId(id, "track"));
    const query = buildQueryString({ ids: ids.join(",") });

    const result = await spotifyFetch<boolean[]>(
      accessToken,
      `/me/tracks/contains${query}`,
    );

    return {
      message: "Checked saved status for requested tracks.",
      tracks: ids.map((id, index) => ({ id, saved: result?.[index] ?? false })),
    };
  },
});

const getFollowedArtistsParameters = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  after: z.string().optional(),
});

const rawGetFollowedArtists = defineTool({
  description: "List artists the user currently follows",
  schema: getFollowedArtistsParameters,
  execute: async ({ limit, after }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ type: "artist", limit, after });

    const data = await spotifyFetch<{
      artists: {
        items: Array<{ id: string; name: string; genres?: string[]; external_urls?: { spotify?: string } }>;
        cursors?: { after?: string };
        total?: number;
      };
    }>(accessToken, `/me/following${query}`);

    const artists = data.artists?.items ?? [];
    const list = artists.length
      ? artists
          .map((artist) => {
            const genres = artist.genres && artist.genres.length ? ` (${artist.genres.slice(0, 3).join(", ")})` : "";
            const link = artist.external_urls?.spotify ? ` (${artist.external_urls.spotify})` : "";
            return `• ${artist.name}${genres}${link}`;
          })
          .join("\n")
      : "No followed artists found.";

    return {
      message: `Showing ${artists.length} followed artist(s).${
        data.artists?.cursors?.after ? " Use the cursor to paginate." : ""
      }\n${list}`,
      artists,
      nextCursor: data.artists?.cursors?.after ?? null,
    };
  },
});

const manageArtistsParameters = z
  .object({
    artistIds: z
      .array(z.string().min(1, "Artist ID or URI is required."))
      .optional(),
    artistQueries: z
      .array(z.string().min(1, "Artist search query is required."))
      .optional(),
  })
  .refine(
    ({ artistIds, artistQueries }) =>
      Boolean((artistIds?.length ?? 0) + (artistQueries?.length ?? 0)),
    {
      message: "Provide artist IDs or search queries.",
    },
  );

const resolveArtistIds = async (
  accessToken: string,
  ids: string[] | undefined,
  queries: string[] | undefined,
) => {
  const resolved = ids?.map((id) => extractSpotifyId(id, "artist")) ?? [];

  if (queries?.length) {
    for (const query of queries) {
      const searchParams = new URLSearchParams({ q: query, type: "artist", limit: "1" });
      const searchResult = await spotifyFetch<{
        artists?: { items: Array<{ id: string }> };
      }>(accessToken, `/search?${searchParams.toString()}`);

      const match = searchResult.artists?.items?.[0];
      if (match?.id) {
        resolved.push(match.id);
      }
    }
  }

  return Array.from(new Set(resolved));
};

const rawFollowArtist = defineTool({
  description:
    "Follow Spotify artists by providing their Spotify IDs or search queries",
  schema: manageArtistsParameters,
  execute: async ({ artistIds, artistQueries }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = await resolveArtistIds(accessToken, artistIds, artistQueries);
    if (ids.length === 0) {
      return {
        message: "No matching artists found to follow.",
        artistIds: [],
      };
    }

    await spotifyFetch(accessToken, `/me/following?type=artist`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });

    return {
      message: `Followed ${ids.length} artist(s).`,
      artistIds: ids,
    };
  },
});

const rawUnfollowArtist = defineTool({
  description:
    "Unfollow Spotify artists by providing their Spotify IDs or search queries",
  schema: manageArtistsParameters,
  execute: async ({ artistIds, artistQueries }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = await resolveArtistIds(accessToken, artistIds, artistQueries);
    if (ids.length === 0) {
      return {
        message: "No matching artists found to unfollow.",
        artistIds: [],
      };
    }

    await spotifyFetch(accessToken, `/me/following?type=artist`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });

    return {
      message: `Unfollowed ${ids.length} artist(s).`,
      artistIds: ids,
    };
  },
});

const checkIfFollowingParameters = z.object({
  artistIds: z
    .array(z.string().min(1, "Artist ID or URI is required."))
    .min(1, "Provide at least one artist."),
});

const rawCheckIfFollowing = defineTool({
  description: "Check whether the user follows specific artists",
  schema: checkIfFollowingParameters,
  execute: async ({ artistIds }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const ids = artistIds.map((id) => extractSpotifyId(id, "artist"));
    const query = buildQueryString({ type: "artist", ids: ids.join(",") });

    const result = await spotifyFetch<boolean[]>(
      accessToken,
      `/me/following/contains${query}`,
    );

    return {
      message: "Checked follow status for requested artists.",
      artists: ids.map((id, index) => ({ id, following: result?.[index] ?? false })),
    };
  },
});

const timeRangeEnum = z.enum(["short_term", "medium_term", "long_term"]);

const personalizationParameters = z.object({
  timeRange: timeRangeEnum.default("medium_term"),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

const rawGetTopArtists = defineTool({
  description: "Get the user’s top Spotify artists",
  schema: personalizationParameters,
  execute: async ({ timeRange, limit, offset }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({
      time_range: timeRange,
      limit,
      offset,
    });

    const data = await spotifyFetch<{
      items: Array<{ id: string; name: string; genres?: string[]; popularity?: number; external_urls?: { spotify?: string } }>;
      total: number;
    }>(accessToken, `/me/top/artists${query}`);

    const artists = data.items ?? [];
    const list = artists.length
      ? artists
          .map((artist, index) => {
            const genres = artist.genres && artist.genres.length ? ` (${artist.genres.slice(0, 3).join(", ")})` : "";
            const link = artist.external_urls?.spotify ? ` (${artist.external_urls.spotify})` : "";
            return `${index + 1 + offset}. ${artist.name}${genres}${link}`;
          })
          .join("\n")
      : "No top artists available.";

    return {
      message: `Your top artists (${timeRange.replace("_", " ")}):\n${list}`,
      artists,
      total: data.total ?? artists.length,
    };
  },
});

const rawGetTopTracks = defineTool({
  description: "Get the user’s top Spotify tracks",
  schema: personalizationParameters,
  execute: async ({ timeRange, limit, offset }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({
      time_range: timeRange,
      limit,
      offset,
    });

    const data = await spotifyFetch<{
      items: Array<SpotifyTrackApi>;
      total: number;
    }>(accessToken, `/me/top/tracks${query}`);

    const tracks = (data.items ?? []).map(toTrackSummary);
    const list = tracks.length ? summarizeTracks(tracks.map((track, index) => ({ ...track, name: `${index + 1 + offset}. ${track.name}` }))) : "No top tracks available.";

    return {
      message: `Your top tracks (${timeRange.replace("_", " ")}):\n${list}`,
      tracks,
      total: data.total ?? tracks.length,
    };
  },
});

const getRecentlyPlayedParameters = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

const rawGetRecentlyPlayed = defineTool({
  description: "Get the user’s recently played Spotify tracks",
  schema: getRecentlyPlayedParameters,
  execute: async ({ limit }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const query = buildQueryString({ limit });

    const data = await spotifyFetch<{
      items: RecentlyPlayedItem[];
    }>(accessToken, `/me/player/recently-played${query}`);

    const items = data.items ?? [];
    const tracks = items.map((item) => ({
      playedAt: item.played_at,
      track: toTrackSummary(item.track),
    }));

    const list = tracks.length
      ? tracks
          .map(
            ({ playedAt, track }) =>
              `${playedAt}: ${track.name} — ${track.artists.join(", ")}${track.url ? ` (${track.url})` : ""}`,
          )
          .join("\n")
      : "No recent plays.";

    return {
      message: `Most recent plays:\n${list}`,
      items: tracks,
    };
  },
});

const getUserByIdParameters = z.object({
  userId: z.string().min(1, "Spotify user ID is required."),
});

const rawGetUserById = defineTool({
  description: "Get any Spotify user profile by ID",
  schema: getUserByIdParameters,
  execute: async ({ userId }) => {
    const accessToken = getAccessTokenFromTokenVault();
    const profile = await spotifyFetch<SpotifyUserProfile>(
      accessToken,
      `/users/${userId}`,
    );

    return {
      message: `User ${profile.display_name ?? profile.id} (${profile.id}).`,
      profile,
    };
  },
});

export const listPlaylists = withSpotify(rawListPlaylists);
export const searchSpotify = withSpotify(rawSearchSpotify);
export const getTrackDetails = withSpotify(rawGetTrackDetails);
export const getAudioFeatures = withSpotify(rawGetAudioFeatures);
export const getUserProfile = withSpotify(rawGetUserProfile);
export const createPlaylist =
  withSpotifyPlaylistConfirmation(rawCreatePlaylist);
export const addTracksToPlaylist = withSpotify(rawAddTracksToPlaylist);
export const updatePlaylistDetails = withSpotify(rawUpdatePlaylistDetails);
export const removeTracksFromPlaylist = withSpotify(rawRemoveTracksFromPlaylist);
export const reorderPlaylistTracks = withSpotify(rawReorderPlaylistTracks);
export const getPlaylistImage = withSpotify(rawGetPlaylistImage);
export const uploadPlaylistImage =
  withSpotifyImageConfirmation(rawUploadPlaylistImage);
export const uploadPlaylistCoverImage =
  withSpotifyImageConfirmation(rawUploadPlaylistCoverImage);
export const getPlaylistDetails = withSpotify(rawGetPlaylistDetails);
export const getRecommendations = withSpotify(rawGetRecommendations);
export const getCurrentPlayback = withSpotify(rawGetCurrentPlayback);
export const getCurrentlyPlayingTrack = withSpotify(rawGetCurrentlyPlayingTrack);
export const playTrack = withSpotify(rawPlayTrack);
export const pausePlayback = withSpotify(rawPausePlayback);
export const nextTrack = withSpotify(rawNextTrack);
export const previousTrack = withSpotify(rawPreviousTrack);
export const seekPlaybackPosition = withSpotify(rawSeekPlaybackPosition);
export const toggleShuffle = withSpotify(rawToggleShuffle);
export const setRepeatMode = withSpotify(rawSetRepeatMode);
export const setVolume = withSpotify(rawSetVolume);
export const listSavedTracks = withSpotify(rawListSavedTracks);
export const listSavedAlbums = withSpotify(rawListSavedAlbums);
export const saveTracksToLibrary = withSpotify(rawSaveTracksToLibrary);
export const removeTracksFromLibrary = withSpotify(rawRemoveTracksFromLibrary);
export const isTrackSaved = withSpotify(rawIsTrackSaved);
export const getFollowedArtists = withSpotify(rawGetFollowedArtists);
export const followArtist = withSpotify(rawFollowArtist);
export const unfollowArtist = withSpotify(rawUnfollowArtist);
export const checkIfFollowing = withSpotify(rawCheckIfFollowing);
export const getTopArtists = withSpotify(rawGetTopArtists);
export const getTopTracks = withSpotify(rawGetTopTracks);
export const getRecentlyPlayed = withSpotify(rawGetRecentlyPlayed);
export const getUserById = withSpotify(rawGetUserById);

export const spotifyTools = {
  listPlaylists,
  searchSpotify,
  getTrackDetails,
  getAudioFeatures,
  getUserProfile,
  createPlaylist,
  addTracksToPlaylist,
  updatePlaylistDetails,
  removeTracksFromPlaylist,
  reorderPlaylistTracks,
  getPlaylistImage,
  uploadPlaylistImage,
  uploadPlaylistCoverImage,
  getPlaylistDetails,
  getRecommendations,
  getCurrentPlayback,
  getCurrentlyPlayingTrack,
  playTrack,
  pausePlayback,
  nextTrack,
  previousTrack,
  seekPlaybackPosition,
  toggleShuffle,
  setRepeatMode,
  setVolume,
  listSavedTracks,
  listSavedAlbums,
  saveTracksToLibrary,
  removeTracksFromLibrary,
  isTrackSaved,
  getFollowedArtists,
  followArtist,
  unfollowArtist,
  checkIfFollowing,
  getTopArtists,
  getTopTracks,
  getRecentlyPlayed,
  getUserById,
};
