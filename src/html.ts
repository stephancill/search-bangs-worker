const EXAMPLE_BASE = "https://search.stupidtech.net";

export function landingPageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>search.stupidtech.net</title>
  </head>
  <body>
    <h1>search.stupidtech.net</h1>
    <p>A DuckDuckGo bangs-compatible search redirector with Google as the default engine.</p>
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
  </body>
</html>`;
}
