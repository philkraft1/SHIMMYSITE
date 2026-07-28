(function () {
  var listEl = document.getElementById("blog-posts");
  var emptyEl = document.getElementById("blog-empty");
  var statusEl = document.getElementById("blog-status");
  var form = document.getElementById("blog-admin-form");
  var unlockForm = document.getElementById("blog-unlock-form");
  var adminPanel = document.getElementById("blog-admin");
  var unlockPanel = document.getElementById("blog-unlock");
  var lockBtn = document.getElementById("blog-lock");

  var apiBase =
    (window.NEWSLETTER_CONFIG && window.NEWSLETTER_CONFIG.apiBaseUrl) ||
    "https://rosenfeld-ranch-api.onrender.com";
  var adminKey = sessionStorage.getItem("ranchBlogAdminKey") || "";
  var canManage = false;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.hidden = !msg;
    statusEl.classList.toggle("is-error", Boolean(isError));
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bodyToHtml(body) {
    return escapeHtml(body)
      .split(/\n{2,}/)
      .map(function (para) {
        return "<p>" + para.replace(/\n/g, "<br />") + "</p>";
      })
      .join("");
  }

  function renderPosts(posts) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!posts || !posts.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    posts.forEach(function (post) {
      var article = document.createElement("article");
      article.className = "blog-post";
      article.id = "post-" + post.id;

      var time = formatDate(post.published_at || post.publishedAt || post.created_at);
      var deleteBtn = canManage
        ? '<button type="button" class="blog-delete" data-id="' +
          escapeHtml(post.id) +
          '">Delete</button>'
        : "";

      article.innerHTML =
        '<header class="blog-post-head">' +
        (time ? '<time datetime="' + escapeHtml(post.published_at || "") + '">' + time + "</time>" : "") +
        deleteBtn +
        "</header>" +
        "<h2>" +
        escapeHtml(post.title) +
        "</h2>" +
        '<div class="blog-post-body">' +
        bodyToHtml(post.body) +
        "</div>";

      listEl.appendChild(article);
    });
  }

  async function loadFallback() {
    var res = await fetch("blog-posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load posts.");
    return res.json();
  }

  async function loadPosts() {
    try {
      var res = await fetch(apiBase.replace(/\/$/, "") + "/api/blog", {
        cache: "no-store",
      });
      if (res.ok) {
        var data = await res.json();
        if (data.posts && data.posts.length) {
          renderPosts(data.posts);
          return;
        }
      }
    } catch (_err) {
      // fall through to static JSON
    }
    try {
      renderPosts(await loadFallback());
    } catch (err) {
      renderPosts([]);
      setStatus(err.message || "Could not load blog posts.", true);
    }
  }

  function showAdmin(unlocked) {
    canManage = unlocked;
    if (adminPanel) adminPanel.hidden = !unlocked;
    if (unlockPanel) unlockPanel.hidden = unlocked;
    loadPosts();
  }

  if (unlockForm) {
    unlockForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var key = String(new FormData(unlockForm).get("adminKey") || "").trim();
      if (!key) {
        setStatus("Enter the admin key from api/.env (ADMIN_KEY).", true);
        return;
      }
      adminKey = key;
      sessionStorage.setItem("ranchBlogAdminKey", adminKey);
      setStatus("Unlocked — you can publish posts while this tab stays open.");
      showAdmin(true);
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener("click", function () {
      adminKey = "";
      sessionStorage.removeItem("ranchBlogAdminKey");
      setStatus("Admin locked.");
      showAdmin(false);
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!adminKey) {
        setStatus("Unlock with the admin key first.", true);
        return;
      }
      var fd = new FormData(form);
      var payload = {
        title: String(fd.get("title") || "").trim(),
        body: String(fd.get("body") || "").trim(),
      };
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      setStatus("Publishing…");
      try {
        var res = await fetch(apiBase.replace(/\/$/, "") + "/api/blog", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () {
          return {};
        });
        if (!res.ok) {
          throw new Error(data.error || "Could not publish.");
        }
        form.reset();
        setStatus("Published.");
        await loadPosts();
      } catch (err) {
        setStatus(
          err.message ||
            "Publish failed. Is the API running? (node server.js in api/)",
          true
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (listEl) {
    listEl.addEventListener("click", async function (e) {
      var btn = e.target.closest(".blog-delete");
      if (!btn || !adminKey) return;
      var id = btn.getAttribute("data-id");
      if (!id || !window.confirm("Delete this post?")) return;
      try {
        var res = await fetch(apiBase.replace(/\/$/, "") + "/api/blog/" + encodeURIComponent(id), {
          method: "DELETE",
          headers: { "x-admin-key": adminKey },
        });
        var data = await res.json().catch(function () {
          return {};
        });
        if (!res.ok) throw new Error(data.error || "Delete failed.");
        setStatus("Post deleted.");
        await loadPosts();
      } catch (err) {
        setStatus(err.message || "Delete failed.", true);
      }
    });
  }

  if (adminKey) showAdmin(true);
  else loadPosts();
})();
