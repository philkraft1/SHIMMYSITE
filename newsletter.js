(function () {
  var STORAGE_KEY = "rr-newsletter-dismissed";
  var dialog = document.getElementById("newsletter-dialog");
  var form = document.getElementById("newsletter-form");
  var success = document.getElementById("newsletter-success");
  var config = window.NEWSLETTER_CONFIG || {};
  if (!dialog || !form) return;

  function openDialog() {
    var force = /(?:\?|&)newsletter=1(?:&|$)/.test(location.search);
    if (!force && localStorage.getItem(STORAGE_KEY)) return;
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
    if (persist) localStorage.setItem(STORAGE_KEY, "1");
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
      localStorage.setItem(STORAGE_KEY, "1");
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

  setTimeout(openDialog, 1200);
})();
