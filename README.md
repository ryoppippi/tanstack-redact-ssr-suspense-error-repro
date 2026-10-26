# Redact: SSR error inside `<Suspense>` rejects the whole stream

Minimal reproduction for [TanStack Redact](https://github.com/TanStack/redact) `0.2.0`.

This repo shows two ways Redact's `renderToReadableStream` differs from React when a component throws during server rendering inside a `<Suspense>` boundary:

- A synchronous render error rejects the whole stream.
- A rejected `lazy()` import leaves the boundary pending.

## Run

```sh
pnpm install
node repro.mjs
```

## Expected (React 19)

React reports the error through `onError`, emits the client-rendering marker (`<!--$!-->`) for that boundary, and still resolves the stream. The client then retries the boundary. That is how a broken widget or route chunk degrades without failing the whole page.

## Actual (Redact 0.2.0)

- **Synchronous throw:** `renderToReadableStream` rejects, so the whole response fails. With TanStack Start this is a 500 for the entire page.
- **Rejected `lazy()`:** the stream resolves, but the boundary is left as pending (`<!--$?0-->` with the fallback) rather than marked for client rendering.

## Output

```
react  | sync throw  | ok      | onError=["render error inside Suspense"] | <!DOCTYPE html><html><head></head><body><!--$!--><template data-msg="Switched to client rendering because the server ren
react  | lazy reject | ok      | onError=["lazy chunk failed to evaluate"] | <!DOCTYPE html><html><head></head><body><!--$!--><template data-msg="Switched to client rendering because the server ren
redact | sync throw  | REJECTS | onError=["render error inside Suspense"] | render error inside Suspense
redact | lazy reject | ok      | onError=["lazy chunk failed to evaluate"] | <!DOCTYPE html><html><head></head><body><!--$?0--><div id="B:0"><p>loading</p></div><!--/$--></body></html>
```

Node v22.22.0, react / react-dom 19.2.0, @tanstack/redact 0.2.0.
