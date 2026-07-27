/**
 * Instagram feed for @the_rosenfeld_ranch
 * Loads posts from the API when available, else instagram-posts.json.
 * Images are proxied (API or wsrv.nl) because Instagram CDN blocks hotlinks.
 */
(function () {
  var USERNAME = "the_rosenfeld_ranch";
  var PROFILE = "https://www.instagram.com/" + USERNAME + "/";
  var feedEl = document.getElementById("instagram-feed");
  var fallbackEl = document.getElementById("instagram-fallback");
  if (!feedEl) return;

  var apiBase =
    (window.NEWSLETTER_CONFIG && window.NEWSLETTER_CONFIG.apiBaseUrl) ||
    "http://127.0.0.1:3001";
  var useApiProxy = false;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function proxyImage(url) {
    if (!url) return "";
    if (useApiProxy) {
      return apiBase + "/api/instagram/media?url=" + encodeURIComponent(url);
    }
    return (
      "https://wsrv.nl/?url=" +
      encodeURIComponent(url) +
      "&w=720&h=720&fit=cover&output=jpg&q=80"
    );
  }

  function showFallback(message) {
    if (fallbackEl) {
      fallbackEl.hidden = false;
      fallbackEl.innerHTML =
        "<p>" +
        escapeHtml(message || "The feed could not be loaded.") +
        '</p><p><a class="btn btn-secondary" href="' +
        PROFILE +
        '" target="_blank" rel="noopener">View on Instagram</a></p>';
    }
    feedEl.hidden = true;
  }

  function render(data) {
    var posts = (data && data.posts) || [];
    if (!posts.length) {
      showFallback("No posts available right now. Open Instagram for the latest.");
      return;
    }

    var items = posts
      .slice(0, 12)
      .map(function (post) {
        var href = escapeHtml(post.permalink || PROFILE);
        var src = escapeHtml(proxyImage(post.image || ""));
        var caption = escapeHtml(
          (post.caption || "").trim() || "View on Instagram"
        );
        return (
          '<a class="ig-tile" href="' +
          href +
          '" target="_blank" rel="noopener" title="' +
          caption +
          '">' +
          '<img src="' +
          src +
          '" alt="' +
          caption +
          '" loading="lazy" decoding="async" />' +
          "</a>"
        );
      })
      .join("");

    feedEl.innerHTML = '<div class="ig-grid" role="list">' + items + "</div>";
    feedEl.hidden = false;
    if (fallbackEl) fallbackEl.hidden = true;
  }

  function loadStatic() {
    return fetch("instagram-posts.json", { cache: "no-store" }).then(function (
      res
    ) {
      if (!res.ok) throw new Error("static missing");
      return res.json();
    });
  }

  function loadLive() {
    return fetch(apiBase + "/api/instagram/feed", { cache: "no-store" }).then(
      function (res) {
        if (!res.ok) throw new Error("api " + res.status);
        useApiProxy = true;
        return res.json();
      }
    );
  }

  // Probe API health quickly so static hosting still works offline
  fetch(apiBase + "/api/health", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("no api");
      return loadLive();
    })
    .catch(function () {
      useApiProxy = false;
      return loadStatic();
    })
    .then(render)
    .catch(function () {
      showFallback(
        "Could not load the Instagram feed. Open @the_rosenfeld_ranch for ranch updates."
      );
    });
})();
