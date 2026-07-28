(function () {
  var root = document.getElementById("experiences-root");
  if (!root) return;

  var kind = (root.getAttribute("data-kind") || "").trim().toLowerCase();
  if (kind !== "review" && kind !== "testimonial") return;

  var listEl = document.getElementById("experiences-list");
  var emptyEl = document.getElementById("experiences-empty");
  var form = document.getElementById("experience-form");
  var statusEl = document.getElementById("experience-status");
  var openBtn = document.getElementById("experience-open");
  var panel = document.getElementById("experience-panel");
  var ratingField = document.getElementById("experience-rating");

  var apiBase = (
    (window.NEWSLETTER_CONFIG && window.NEWSLETTER_CONFIG.apiBaseUrl) ||
    (window.SITE_CONFIG && window.SITE_CONFIG.apiBaseUrl) ||
    "https://rosenfeld-ranch-api.onrender.com"
  ).replace(/\/$/, "");

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.hidden = !msg;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function bodyToHtml(body) {
    return escapeHtml(body)
      .split(/\n{2,}/)
      .map(function (para) {
        return "<p>" + para.replace(/\n/g, "<br />") + "</p>";
      })
      .join("");
  }

  function starsHtml(rating) {
    var n = Number(rating);
    if (!Number.isFinite(n) || n < 1) return "";
    n = Math.max(1, Math.min(5, Math.round(n)));
    var filled = "";
    var i;
    for (i = 1; i <= 5; i++) {
      filled +=
        '<span class="xp-star' +
        (i <= n ? " is-on" : "") +
        '" aria-hidden="true">★</span>';
    }
    return (
      '<p class="xp-rating" aria-label="' +
      n +
      ' out of 5 stars">' +
      filled +
      "</p>"
    );
  }

  function renderItems(items) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items || !items.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    items.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "xp-item";
      article.id = "xp-" + item.id;

      var time = formatDate(item.created_at);
      var title = item.title ? "<h2>" + escapeHtml(item.title) + "</h2>" : "";
      var rating =
        kind === "review" && item.rating != null ? starsHtml(item.rating) : "";

      article.innerHTML =
        '<header class="xp-item-head">' +
        (time
          ? '<time datetime="' +
            escapeHtml(item.created_at || "") +
            '">' +
            escapeHtml(time) +
            "</time>"
          : "") +
        rating +
        "</header>" +
        title +
        '<div class="xp-item-body">' +
        bodyToHtml(item.body) +
        "</div>" +
        '<p class="xp-item-by">— ' +
        escapeHtml(item.name) +
        "</p>";

      listEl.appendChild(article);
    });
  }

  async function loadItems() {
    try {
      var res = await fetch(
        apiBase + "/api/experiences?kind=" + encodeURIComponent(kind),
        { cache: "no-store" }
      );
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || "Could not load posts.");
      renderItems(data.items || []);
    } catch (err) {
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent =
          "Guest posts will appear here once the connection is ready.";
      }
      console.warn(err);
    }
  }

  function selectedRating() {
    if (!ratingField) return null;
    var checked = ratingField.querySelector('input[name="rating"]:checked');
    return checked ? Number(checked.value) : null;
  }

  if (openBtn && panel) {
    openBtn.addEventListener("click", function () {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      var nameInput = form && form.querySelector('[name="name"]');
      if (nameInput) nameInput.focus();
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setStatus("");

      var fd = new FormData(form);
      var payload = {
        kind: kind,
        name: String(fd.get("name") || "").trim(),
        title: String(fd.get("title") || "").trim(),
        body: String(fd.get("body") || "").trim(),
      };

      if (kind === "review") {
        payload.rating = selectedRating();
        if (!payload.rating) {
          setStatus("Please choose a star rating.", true);
          return;
        }
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        var res = await fetch(apiBase + "/api/experiences", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () {
          return {};
        });
        if (!res.ok) {
          throw new Error(data.error || "Could not publish your post.");
        }
        form.reset();
        if (ratingField) {
          var radios = ratingField.querySelectorAll('input[name="rating"]');
          radios.forEach(function (r) {
            r.checked = false;
          });
        }
        setStatus("Thank you — your experience is live.", false);
        await loadItems();
      } catch (err) {
        setStatus(err.message || "Could not publish your post.", true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  loadItems();
})();
