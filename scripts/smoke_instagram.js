/**
 * Smoke-test Instagram feed assets without a browser.
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const file = path.join(__dirname, "..", "instagram-posts.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log("static posts", data.posts.length);

  const feed = await fetch("http://127.0.0.1:3001/api/instagram/feed").then((r) =>
    r.json()
  );
  console.log("api posts", feed.posts?.length, feed.error || "ok");

  const sample = (feed.posts || data.posts)[0];
  const proxyUrl =
    "http://127.0.0.1:3001/api/instagram/media?url=" +
    encodeURIComponent(sample.image);
  const proxied = await fetch(proxyUrl);
  console.log(
    "api media",
    proxied.status,
    proxied.headers.get("content-type"),
    (await proxied.arrayBuffer()).byteLength
  );

  const wsrv =
    "https://wsrv.nl/?url=" +
    encodeURIComponent(sample.image) +
    "&w=240&output=jpg";
  const w = await fetch(wsrv);
  console.log(
    "wsrv media",
    w.status,
    w.headers.get("content-type"),
    (await w.arrayBuffer()).byteLength
  );

  // Spot-check key pages for fonts + styles
  for (const page of [
    "index.html",
    "ranch.html",
    "village.html",
    "events.html",
    "instagram.html",
  ]) {
    const html = await fetch("http://127.0.0.1:5504/" + page).then((r) =>
      r.text()
    );
    const fonts = html.includes("Playfair+Display") && html.includes("Source+Sans+3");
    const css = html.includes("styles.css");
    const mojibake = /â|Â©|Ã©|ï¿½/.test(html);
    console.log(page, { fonts, css, mojibake, statusOk: html.length > 500 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
