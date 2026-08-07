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
    "https://rosenfeld-ranch-api.onrender.com";
  var useApiProxy = false;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isLocal(url) {
    return Boolean(url) && !/^https?:/i.test(url);
  }

  function proxyImage(url) {
    if (!url) return "";
    // Bundled fallback images are served from this site — never proxy them.
    if (isLocal(url)) return url;
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

  /**
   * Instagram CDN links are signed and expire, so a tile whose image 404s would
   * otherwise render its alt text as a box of words. Drop those tiles instead,
   * and fall back entirely if nothing loads.
   */
  function watchTiles(grid) {
    var tiles = grid.querySelectorAll(".ig-tile");
    var pending = tiles.length;
    var loaded = 0;

    function settle(tile, ok) {
      if (ok) {
        loaded += 1;
        tile.classList.add("is-loaded");
      } else if (tile.parentNode) {
        tile.parentNode.removeChild(tile);
      }
      pending -= 1;
      if (pending === 0 && loaded === 0) {
        showFallback(
          "Could not load the Instagram feed. Open @the_rosenfeld_ranch for ranch updates."
        );
      }
    }

    Array.prototype.forEach.call(tiles, function (tile) {
      var img = tile.querySelector("img");
      if (!img) return settle(tile, false);
      if (img.complete) {
        return settle(tile, img.naturalWidth > 0);
      }
      img.addEventListener("load", function () {
        settle(tile, true);
      });
      img.addEventListener("error", function () {
        settle(tile, false);
      });
    });
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
        var caption = escapeHtml((post.caption || "").trim());
        var label = caption || "Instagram post from @" + USERNAME;
        return (
          '<a class="ig-tile" href="' +
          href +
          '" target="_blank" rel="noopener" title="' +
          label +
          '">' +
          '<img src="' +
          src +
          '" alt="' +
          label +
          '" loading="lazy" decoding="async" />' +
          "</a>"
        );
      })
      .join("");

    feedEl.innerHTML = '<div class="ig-grid" role="list">' + items + "</div>";
    feedEl.hidden = false;
    if (fallbackEl) fallbackEl.hidden = true;
    watchTiles(feedEl.querySelector(".ig-grid"));
  }

  /** The API sleeps on a free plan, so never let a cold start hang the feed. */
  function fetchWithTimeout(url, ms) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("timeout"));
      }, ms);
      fetch(url, { cache: "no-store" }).then(
        function (res) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res);
        },
        function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function loadStatic() {
    useApiProxy = false;
    return fetch("instagram-posts.json", { cache: "no-store" }).then(function (
      res
    ) {
      if (!res.ok) throw new Error("static missing");
      return res.json();
    });
  }

  function loadLive() {
    return fetchWithTimeout(apiBase + "/api/instagram/feed", 6000).then(
      function (res) {
        if (!res.ok) throw new Error("api " + res.status);
        useApiProxy = true;
        return res.json();
      }
    );
  }

  loadLive()
    .catch(loadStatic)
    .then(render)
    .catch(function () {
      showFallback(
        "Could not load the Instagram feed. Open @the_rosenfeld_ranch for ranch updates."
      );
    });
})();
