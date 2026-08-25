# BOATLY — SUPABASE SETUP

**Version:** 1.0  
**Environment:** Development  
**Status:** Configured

## Project

Supabase development project:

`boatly-dev`

## Region

Primary development database region:

`Central EU (Frankfurt)`

The development environment intentionally uses a specific EU region.

## Application Integration

The Next.js application connects to Supabase using:

- `@supabase/supabase-js`
- `@supabase/ssr`

## Environment Variables

Required local environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Real values are stored only in `.env.local`.

`.env.local` must never be committed to Git.

`.env.example` documents the required variable names without containing real credentials.

## API Key Policy

Client-accessible integration uses the Supabase Publishable key.

Elevated Supabase Secret keys must never:

- be exposed to the browser;
- use the `NEXT_PUBLIC_` prefix;
- be committed to Git;
- be placed in public source code.

Elevated server credentials will only be introduced when a specific trusted server-side use case requires them.

## Client Structure

Browser client:

`src/lib/supabase/client.ts`

Server client:

`src/lib/supabase/server.ts`

## Authentication

Authentication session refresh/proxy configuration is intentionally deferred to:

`C5 — Authentication`

## Database

Application database tables, migrations, Row Level Security policies and PostGIS configuration are intentionally deferred to:

`C4 — Database`

## Connection Verification

Development connectivity is verified through:

`GET /api/health/supabase`

The health route verifies that the Next.js application can reach the Supabase project using the configured Project URL and Publishable key.

The health endpoint must not return credentials.

## Security

No database password, secret API key, service-role credential or other sensitive credential may be committed to the repository.