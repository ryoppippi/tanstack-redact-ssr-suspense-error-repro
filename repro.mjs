// Compares how React and Redact handle an error thrown during SSR inside a
// <Suspense> boundary. React renders the fallback (the client retries);
// Redact rejects the whole render.
import * as React from "react";
import * as ReactServer from "react-dom/server";
import * as Redact from "@tanstack/redact";
import * as RedactServer from "@tanstack/redact/server";

const runtimes = [
  { name: "react", React, server: ReactServer },
  { name: "redact", React: Redact, server: RedactServer },
];

/** Builds the test cases for one runtime, using that runtime's createElement. */
function cases(R) {
  const h = R.createElement;
  function Throws() {
    throw new Error("render error inside Suspense");
  }
  // Mirrors a code-split chunk whose module evaluation throws.
  const LazyThrows = R.lazy(() => Promise.reject(new Error("lazy chunk failed to evaluate")));
  const app = (child) => h("html", null, h("body", null, h(R.Suspense, { fallback: h("p", null, "loading") }, h(child))));
  return { "sync throw": app(Throws), "lazy reject": app(LazyThrows) };
}

for (const { name, React: R, server } of runtimes) {
  for (const [label, element] of Object.entries(cases(R))) {
    const errors = [];
    try {
      const stream = await server.renderToReadableStream(element, { onError: (e) => void errors.push(e.message) });
      await stream.allReady;
      const html = await new Response(stream).text();
      console.log(`${name.padEnd(6)} | ${label.padEnd(11)} | ok      | onError=${JSON.stringify(errors)} | ${html.replace(/<script[\s\S]*?<\/script>/g, "").slice(0, 120)}`);
    } catch (e) {
      console.log(`${name.padEnd(6)} | ${label.padEnd(11)} | REJECTS | onError=${JSON.stringify(errors)} | ${e.message}`);
    }
  }
}
