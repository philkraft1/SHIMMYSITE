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
  var photoInput = document.getElementById("xp-photos");
  var photoPreview = document.getElementById("xp-photo-preview");
  var photoHint = document.getElementById("xp-photo-hint");

  var MAX_PHOTOS = 4;
  var MAX_BYTES = 5 * 1024 * 1024;
  var ALLOWED_TYPES = {
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true,
  };

  /** @type {{ file: File, url: string }[]} */
  var selectedPhotos = [];

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

  function photosHtml(item) {
    var photos = item && item.photos;
    if (!photos || !photos.length) return "";
    var html = '<div class="xp-gallery" role="group" aria-label="Photos">';
    photos.forEach(function (photo) {
      var idx = photo.index != null ? photo.index : 0;
      var src =
        apiBase +
        "/api/experiences/" +
        encodeURIComponent(item.id) +
        "/photos/" +
        encodeURIComponent(idx);
      html +=
        '<a class="xp-gallery-item" href="' +
        escapeHtml(src) +
        '" target="_blank" rel="noopener noreferrer">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="Guest photo" loading="lazy" decoding="async" />' +
        "</a>";
    });
    html += "</div>";
    return html;
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
        photosHtml(item) +
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

  function updatePhotoHint() {
    if (!photoHint) return;
    var left = MAX_PHOTOS - selectedPhotos.length;
    photoHint.textContent =
      selectedPhotos.length === 0
        ? "Optional — up to 4 photos (JPEG, PNG, or WebP, 5MB each)."
        : selectedPhotos.length +
          " of " +
          MAX_PHOTOS +
          " selected" +
          (left > 0 ? " — " + left + " more allowed." : ".");
  }

  function clearSelectedPhotos() {
    selectedPhotos.forEach(function (p) {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    selectedPhotos = [];
    if (photoInput) photoInput.value = "";
    renderPhotoPreview();
  }

  function renderPhotoPreview() {
    if (!photoPreview) return;
    photoPreview.innerHTML = "";
    selectedPhotos.forEach(function (entry, index) {
      var fig = document.createElement("figure");
      fig.className = "xp-photo-thumb";
      var img = document.createElement("img");
      img.src = entry.url;
      img.alt = "Selected photo " + (index + 1);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xp-photo-remove";
      btn.setAttribute("aria-label", "Remove photo " + (index + 1));
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        URL.revokeObjectURL(entry.url);
        selectedPhotos.splice(index, 1);
        renderPhotoPreview();
        setStatus("");
      });
      fig.appendChild(img);
      fig.appendChild(btn);
      photoPreview.appendChild(fig);
    });
    updatePhotoHint();
    if (photoInput) {
      photoInput.disabled = selectedPhotos.length >= MAX_PHOTOS;
    }
  }

  function addPhotoFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var errors = [];
    files.forEach(function (file) {
      if (selectedPhotos.length >= MAX_PHOTOS) {
        errors.push("You can upload at most " + MAX_PHOTOS + " photos.");
        return;
      }
      var type = String(file.type || "").toLowerCase();
      if (!ALLOWED_TYPES[type]) {
        errors.push(
          (file.name || "A file") + " must be JPEG, PNG, or WebP."
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        errors.push(
          (file.name || "A photo") + " is larger than 5MB."
        );
        return;
      }
      selectedPhotos.push({
        file: file,
        url: URL.createObjectURL(file),
      });
    });
    renderPhotoPreview();
    if (errors.length) {
      setStatus(errors[0], true);
    } else {
      setStatus("");
    }
    if (photoInput) photoInput.value = "";
  }

  function fileToPayload(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        var data = comma >= 0 ? result.slice(comma + 1) : result;
        resolve({
          mime: file.type,
          data: data,
        });
      };
      reader.onerror = function () {
        reject(new Error("Could not read " + (file.name || "photo") + "."));
      };
      reader.readAsDataURL(file);
    });
  }

  if (photoInput) {
    photoInput.addEventListener("change", function () {
      addPhotoFiles(photoInput.files);
    });
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
        photos: [],
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
        if (selectedPhotos.length) {
          payload.photos = await Promise.all(
            selectedPhotos.map(function (entry) {
              return fileToPayload(entry.file);
            })
          );
        }

        var res = await fetch(apiBase + "/api/experiences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
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
        clearSelectedPhotos();
        setStatus("Thank you — your experience is live.", false);
        await loadItems();
      } catch (err) {
        setStatus(err.message || "Could not publish your post.", true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  updatePhotoHint();
  loadItems();
})();
