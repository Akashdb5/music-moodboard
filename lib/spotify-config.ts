export const SPOTIFY_CONNECTION = "spotify";

export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "ugc-image-upload",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
  "user-library-read",
  "user-library-modify",
  "user-follow-read",
  "user-follow-modify",
  "user-top-read",
  "user-read-recently-played",
] as const;

