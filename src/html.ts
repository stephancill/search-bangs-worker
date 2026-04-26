const EXAMPLE_BASE = "https://search.stupidtech.net";

export function landingPageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>search.stupidtech.net</title>
    <style>
      :root {
        --bg: #f5f7fb;
        --panel: #ffffff;
        --text: #13233a;
        --muted: #4c5b73;
        --line: #d7dfec;
        --accent: #0a7f6f;
      }
      body {
        margin: 0;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #ffffff, var(--bg));
        color: var(--text);
      }
      main {
        max-width: 760px;
        margin: 40px auto;
        padding: 0 18px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 22px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 30px;
      }
      p {
        margin: 0 0 14px;
        color: var(--muted);
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      li {
        margin-bottom: 10px;
      }
      code {
        background: #eef2f8;
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 2px 6px;
      }
      a {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>search.stupidtech.net</h1>
        <p>
          A DuckDuckGo bangs-compatible search redirector with Google as the default engine.
        </p>
        <ul>
          <li><code>?q=rust async</code> -> Google search</li>
          <li><code>?q=!w rust</code> -> Wikipedia bang</li>
          <li><code>?q=rust !</code> -> Google first result</li>
          <li><code>?q=! rust</code> -> Google first result</li>
          <li><code>?q=!notreal rust</code> -> Google search for full query</li>
        </ul>
        <p>
          Example:
          <a href="${EXAMPLE_BASE}/?q=!w+Cloudflare+Workers">${EXAMPLE_BASE}/?q=!w+Cloudflare+Workers</a>
        </p>
      </section>
    </main>
  </body>
</html>`;
}
