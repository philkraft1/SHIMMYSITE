(function () {
  var STORAGE_KEY = "rr-newsletter-dismissed";
  var dialog = document.getElementById("newsletter-dialog");
  var form = document.getElementById("newsletter-form");
  var success = document.getElementById("newsletter-success");
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = (form.email.value || "").trim();
    if (!email) return;

    // Ready to wire to Mailchimp / Formspree / Square later.
    form.hidden = true;
    if (success) {
      success.hidden = false;
    }
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(function () {
      closeDialog(true);
    }, 2200);
  });

  setTimeout(openDialog, 1200);
})();
