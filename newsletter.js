(function () {
  var STORAGE_KEY = "rr-newsletter-dismissed";
  var DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 1200;
  var config = window.NEWSLETTER_CONFIG || {};

  function ensureDialog() {
    var existing = document.getElementById("newsletter-dialog");
    if (existing) return existing;

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div id="newsletter-dialog" class="newsletter" hidden role="dialog" aria-modal="true" aria-labelledby="newsletter-title">' +
      '<button class="newsletter-backdrop" type="button" data-newsletter-close aria-label="Close newsletter signup"></button>' +
      '<div class="newsletter-panel">' +
      '<button class="newsletter-close" type="button" data-newsletter-close aria-label="Close">×</button>' +
      '<div class="newsletter-visual">' +
      '<img src="images/open-year-round.png" alt="" width="640" height="360" />' +
      "</div>" +
      '<div class="newsletter-body">' +
      '<img class="newsletter-mark" src="images/logo-r.png" alt="" width="48" height="48" />' +
      '<p class="eyebrow">The ranch list</p>' +
      '<h2 id="newsletter-title">Don’t miss a day on the ranch</h2>' +
      '<p class="newsletter-lead">Get Village hours, event dates, photo-shoot openings, and farm updates — a few notes a month, nothing noisy.</p>' +
      '<form id="newsletter-form" class="newsletter-form" novalidate>' +
      '<label class="visually-hidden" for="newsletter-email">Email</label>' +
      '<input class="newsletter-honey" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
      '<div class="newsletter-row">' +
      '<input id="newsletter-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com" />' +
      '<button class="btn btn-primary" type="submit">Join the list</button>' +
      "</div>" +
      '<p class="newsletter-fine">Free to join. We’ll only email ranch updates.</p>' +
      "</form>" +
      '<p id="newsletter-success" class="newsletter-success" hidden>You’re on the list — see you at the ranch.</p>' +
      "</div></div></div>";
    document.body.appendChild(wrap.firstElementChild);
    return document.getElementById("newsletter-dialog");
  }

  var dialog = ensureDialog();
  var form = document.getElementById("newsletter-form");
  var success = document.getElementById("newsletter-success");
  if (!dialog || !form) return;

  function isDismissed() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    // Legacy permanent flag from earlier builds
    if (raw === "1") return true;
    var ts = parseInt(raw, 10);
    if (!isFinite(ts)) return true;
    return Date.now() - ts < DISMISS_TTL_MS;
  }

  function markDismissed() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  function openDialog() {
    var force = /(?:\?|&)newsletter=1(?:&|$)/.test(location.search);
    if (!force && isDismissed()) return;
    dialog.hidden = false;
    requestAnimationFrame(function () {
      dialog.classList.add("is-open");
    });
    var input = dialog.querySelector('input[type="email"]');
    if (input) setTimeout(function () { input.focus(); }, 350);
  }

  function closeDialog(persist) {
    dialog.classList.remove("is-open");
    setTimeout(function () {
      dialog.hidden = true;
    }, 280);
    if (persist) markDismissed();
  }

  dialog.querySelectorAll("[data-newsletter-close]").forEach(function (el) {
    el.addEventListener("click", function () {
      closeDialog(true);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && dialog.classList.contains("is-open")) {
      closeDialog(true);
    }
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = (form.email.value || "").trim();
    if (!email) return;

    if (form._honey && form._honey.value) {
      closeDialog(true);
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Joining…";
    }

    var base = (config.apiBaseUrl || "https://rosenfeld-ranch-api.onrender.com").replace(/\/$/, "");

    try {
      var res = await fetch(base + "/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email,
          source: "homepage-newsletter",
        }),
      });

      var data = await res.json().catch(function () {
        return {};
      });

      if (!res.ok) {
        throw new Error(data.error || "Could not join the list. Try again.");
      }

      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.textContent = data.recurring
          ? "Welcome back — you’re already on the ranch list."
          : "You’re on the list — see you at the ranch.";
      }
      markDismissed();
      setTimeout(function () {
        closeDialog(true);
      }, 2200);
    } catch (err) {
      window.alert(
        (err && err.message) ||
          "Could not join the list. Make sure the ranch API is running."
      );
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });

  // Splash visitors usually tap Ranch/Village before 1.2s — also show on destination pages.
  setTimeout(openDialog, SHOW_DELAY_MS);
})();
