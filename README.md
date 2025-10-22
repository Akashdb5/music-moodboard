# Music Moodboard Assistant

Music Moodboard is a Next.js 15 application that showcases Auth0, OpenFGA-protected retrieval augmented generation (RAG), and deep Spotify tooling. Authenticated users can hold multi-turn conversations that blend large language models, organization-aware knowledge base answers, and live Spotify actions such as playlist curation, playback control, audio analysis, and artwork uploads.

## Highlights
- Streaming chat UI powered by `@assistant-ui/react` with persistent threads and attachments.
- Auth0 authentication plus Token Vault flows so the assistant only performs Spotify actions after the user grants scopes.
- Spotify tool suite covering search, recommendations, playlists, playback, personalization, and library management.
- Authorized RAG pipeline that filters document snippets through OpenFGA before the model can see them.
- Flexible model selection through OpenRouter or OpenAI, with system prompts tuned for “Music Moodboard” curation.
- Production-ready Dockerfile and standalone Next.js build for container deployments.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript.
- **UI**: assistant-ui primitives, Tailwind utilities, Radix UI.
- **Auth**: Auth0 Next.js SDK with Auth0 AI Token Vault + interruptions.
- **LLM tooling**: Vercel AI SDK (`ai`), OpenRouter/OpenAI providers.
- **Authorization**: OpenFGA via `@auth0/ai` filtering.
- **Styling & animation**: Tailwind CSS, `motion/react`, `lucide-react`.

## Prerequisites
- Node.js 20.x and npm 10.x (ships with the repository’s `package-lock.json`).
- Auth0 tenant with a regular web application and a Token Vault connection (for Spotify).
- Spotify developer application (client id/secret) configured as an Auth0 social connection.
- OpenRouter and/or OpenAI API keys.
- OpenFGA store (hosted or self-managed) to enforce document authorization.
- (Optional) Docker with BuildKit for container builds.

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create environment config**
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` (never commit real secrets) with the variables listed below.
3. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`. You will be prompted to sign in with Auth0 before using the assistant.

## Environment Variables
Keep secrets out of source control. The assistant reads the following values:

### Core LLM access
| Variable | Description |
| --- | --- |
| `OPENROUTER_API_KEY` | API key for OpenRouter requests (required if using OpenRouter models). |
| `OPENROUTER_MODEL` | Default model id (e.g. `openai/gpt-4o-mini`). |
| `OPENROUTER_REFERRER`, `OPENROUTER_TITLE` | Optional HTTP headers sent to OpenRouter. |
| `OPENAI_API_KEY` | API key for OpenAI (used when overriding models to pure OpenAI ids). |

### Auth0 web application
| Variable | Description |
| --- | --- |
| `AUTH0_DOMAIN` | Auth0 tenant domain (e.g. `example.us.auth0.com`). |
| `AUTH0_CLIENT_ID` | Client id of the Auth0 web application. |
| `AUTH0_CLIENT_SECRET` | Client secret used by Next.js server routes. |
| `AUTH0_SECRET` | Random string for cookie/session encryption. |
| `APP_BASE_URL` | External URL of the app (used by Auth0 callbacks). |

### Auth0 Token Vault + Spotify
| Variable | Description |
| --- | --- |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Spotify app credentials registered with Auth0. |
| `SPOTIFY_TOKEN_VAULT_SECRET_ID` | Secret id configured in Auth0 Token Vault for Spotify refresh tokens. |
| `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` | Auth0 M2M credentials allowed to call the Token Vault. |

### Authorized RAG (OpenFGA + documents)
| Variable | Description |
| --- | --- |
| `RAG_DOCS_PATH` | Folder that stores Markdown knowledge base documents (defaults to `./assets/docs`). |
| `RAG_TEXT_MODEL` | Model used to synthesize answers (defaults to `gpt-4o-mini`). |
| `RAG_TOP_K` | Number of snippets to consider per query (defaults to `6`). |
| `RAG_EMBEDDING_MODEL`, `RAG_EMBEDDING_PROVIDER` | Embedding model/provider for vector store creation. |
| `FGA_API_URL` | OpenFGA API endpoint. |
| `FGA_STORE_ID` | Id of the OpenFGA store that holds your authorization model. |
| `FGA_CLIENT_ID`, `FGA_CLIENT_SECRET` | Client credentials with access to the store. |
| `FGA_API_AUDIENCE`, `FGA_API_TOKEN_ISSUER` | Overrides when connecting to custom OpenFGA deployments. |

### Optional
| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_ASSISTANT_BASE_URL` | Enable hosted thread persistence via assistant-ui Cloud. |

## Local Development
- `npm run dev` – Next.js dev server with Turbopack.
- `npm run build` – Production build (generates `.next/standalone` for Docker).
- `npm run start` – Start the production server.
- `npm run lint` – ESLint validation.
- `npm run fga:init` – Seeds the OpenFGA authorization model and public tuple using the env vars above.

## Knowledge Base & OpenFGA
1. Place Markdown documents in `assets/docs` (or update `RAG_DOCS_PATH`).
2. Configure OpenFGA credentials in `.env.local`.
3. Run `npm run fga:init` once to create the authorization model and initial tuples.
4. Use the assistant and ask it to “Use the knowledge base …”; only authorized snippets will be surfaced. When no documents match or the user lacks permission, the model explicitly reports that the information is unavailable.

## Spotify Integration
- The assistant ships with an extensive set of Spotify tools (search, recommendations, playlist CRUD, playback, personalization, follows, uploads, etc.).
- When a tool requires access, Auth0 AI interruptions trigger the **Connect Spotify** popup. Users must consent via Auth0 Token Vault before the tool resumes.
- Ensure your Auth0 tenant has:
  1. A “Spotify” social connection wired to your Spotify client id/secret.
  2. A Token Vault secret (`SPOTIFY_TOKEN_VAULT_SECRET_ID`) bound to that connection and scopes listed in `lib/spotify-config.ts`.
  3. A refresh-token capable Auth0 web app callback at `${APP_BASE_URL}/api/auth/callback`.

## Deployment
### Vercel
The repository follows Vercel’s standard Next.js conventions—no Dockerfile required. Connect the repo, add the environment variables in the Vercel dashboard, and Vercel will run `npm install` and `npm run build`.

### Docker
For environments that prefer containers, a production-ready multi-stage build is included.
```bash
DOCKER_BUILDKIT=1 docker build -t assistant-ui .
docker run --env-file path/to/production.env -p 3000:3000 assistant-ui
```
The Dockerfile compiles the app with Node 20, emits the standalone Next.js output, and runs it in a distroless Node.js 20 image. Supply an env file mirroring your `.env.local` (without quotes or comments).

## Project Structure
```
app/                      # Next.js routes and assistant shell
├─ assistant.tsx          # Assistant Runtime provider + sidebar layout
├─ api/chat/route.ts      # Streaming chat endpoint, tool registration
├─ auth-provider.tsx      # Auth0 provider wrapper
components/               # UI primitives and assistant-ui customizations
hooks/                    # useAuth0ChatRuntime hook (assistant runtime + interruptions)
lib/                      # Integration code (Auth0, OpenRouter, Spotify tools, RAG)
assets/docs/              # Knowledge base Markdown documents
scripts/fga-init.js       # OpenFGA seeding helper
Dockerfile                # Production image definition
.dockerignore             # Build context exclusions
```

## Troubleshooting
- **Docker pull fails with `docker-credential-osxkeychain`**: Install the helper (`brew install docker-credential-helper`) or remove the `credsStore` entry from `~/.docker/config.json`.
- **Spotify tool interruptions persist**: confirm the Token Vault secret id, scopes, and Auth0 connection names match `lib/spotify-config.ts`.
- **Knowledge base requests always empty**: ensure `npm run fga:init` succeeded and your user has tuples granting `doc#viewer` access.
