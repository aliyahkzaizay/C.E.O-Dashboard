# Notes: Checking the Supabase Connection

## What we checked

Can our computer reach the Supabase project using its URL and publishable key?

We sent a **read-only request**. It did not create users, add records, or change settings.

## Where the request came from

Supabase provides this endpoint—it is not something we built:

```text
https://YOUR-PROJECT.supabase.co/auth/v1/settings
```

- **Project URL:** which Supabase project to contact.
- **`/auth/v1`:** its authentication service.
- **`/settings`:** returns public authentication settings, such as enabled sign-in methods.

Developers look up endpoints in documentation; you do not need to guess or memorize them.

Sources:

- [Supabase documentation showing the settings request](https://supabase.com/docs/guides/self-hosting/self-hosted-oauth) — this page covers self-hosting, but illustrates the same Auth endpoint.
- [Supabase's settings endpoint implementation](https://github.com/supabase/auth/blob/master/internal/api/settings.go).

## Terms to remember

- **API:** a way for programs to communicate.
- **Endpoint:** a particular address in an API that accepts requests.
- **Request:** the message our program sends to that address.
- **Response:** what the service sends back.
- **GET:** the HTTP action used to retrieve information. JavaScript's `fetch()` uses GET unless we specify another action.
- **HTTP 200:** the server successfully handled the request.

This endpoint is read-only because its job is to return settings, not modify them. We chose it because it works without needing application tables or a signed-in user.

## Repeat the check yourself

1. Open the C.E.O. project in VS Code.
2. Choose **Terminal → New Terminal**.
3. Make sure the terminal is in the folder containing `package.json` and your configured `.env.local`.
4. On macOS, paste this entire command into the terminal and press **Enter**:

```bash
node --env-file=.env.local --input-type=module -e '
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const response = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000)
});

console.log("Status:", response.status);
console.log(response.ok ? "Connection successful!" : "Connection failed.");
'
```

This is a terminal command, not code to paste into a React component. It uses the project's Node installation; the React development server does not need to be running.

### What the code does

- `--env-file=.env.local` reads the project URL and publishable key from your local file.
- `--input-type=module` allows this JavaScript command to use `await`.
- `-e` tells Node to execute the JavaScript that follows.
- `fetch(...)` sends the request to Supabase.
- `headers: { apikey: key }` supplies the publishable key with the request.
- `AbortSignal.timeout(15000)` stops waiting after 15 seconds.
- `console.log(...)` prints the result without printing the key.

Use the **publishable key**, never a secret/service-role key or database password. Keep actual values in `.env.local`, not in these notes.

## Expected result

```text
Status: 200
Connection successful!
```

Our check returned HTTP 200 and valid JSON settings.

## What this proves—and what it does not

**It confirms:**

- The project can be reached from the computer running the command.
- Its Auth service accepts the supplied publishable key.
- The settings endpoint responds successfully.

**It does not confirm:**

- A request from the React page works in the browser.
- Member, event, attendance, or finance tables exist or can be queried.
- Login and signup flows work.
- Each club can access only its own records.

Those checks come separately as the team builds the features and database access rules.

The starter message **“Supabase client configured”** only means the app accepted the format of the local configuration. The HTTP request above goes a step further by contacting Supabase.

## If it fails

- **401/403:** check that the URL and publishable key belong to the same project and were copied correctly.
- **Network error or timeout:** check your connection, project availability, and whether your execution environment allows network requests. A failed request does not automatically mean the key is wrong.
- **Missing `.env.local`:** follow the [teammate setup guide](team-setup.md).

Do not share passwords or secret keys when asking for help.
