

## Add Google Sign-In

### Overview
Add a "Sign in with Google" button to the Auth page using Lovable Cloud's managed Google OAuth (no API keys needed).

### Changes

1. **Configure Social Auth** — Use the Configure Social Login tool to generate the `src/integrations/lovable` module and install `@lovable.dev/cloud-auth-js`.

2. **`src/pages/Auth.tsx`**
   - Import `lovable` from `@/integrations/lovable/index`
   - Add a "Sign in with Google" button above/below the email form
   - On click, call `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
   - Add a visual divider ("or") between Google button and email form

