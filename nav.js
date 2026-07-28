(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        nav.querySelectorAll(".nav-dropdown.is-open").forEach(function (dd) {
          dd.classList.remove("is-open");
          var btn = dd.querySelector(".nav-dropdown-toggle");
          if (btn) btn.setAttribute("aria-expanded", "false");
        });
      }
    });
  }

  document.querySelectorAll(".nav-dropdown").forEach(function (dropdown) {
    var button = dropdown.querySelector(".nav-dropdown-toggle");
    if (!button) return;

    button.addEventListener("click", function (e) {
      e.stopPropagation();
      var willOpen = !dropdown.classList.contains("is-open");
      document.querySelectorAll(".nav-dropdown.is-open").forEach(function (other) {
        if (other !== dropdown) {
          other.classList.remove("is-open");
          var otherBtn = other.querySelector(".nav-dropdown-toggle");
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        }
      });
      dropdown.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  document.addEventListener("click", function () {
    document.querySelectorAll(".nav-dropdown.is-open").forEach(function (dd) {
      dd.classList.remove("is-open");
      var btn = dd.querySelector(".nav-dropdown-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".nav-dropdown.is-open").forEach(function (dd) {
      dd.classList.remove("is-open");
      var btn = dd.querySelector(".nav-dropdown-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  });

  // Square appends orderId/transactionId after a successful payment redirect.
  // Show a dismissible note and strip the query so revisits show normal UI.
  // When square-checkout.js is on the page it owns this flow instead.
  (function handleSquareCheckoutReturn() {
    if (window.SQUARE_CONFIG) return;
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get("orderId") || params.get("order_id");
    var transactionId =
      params.get("transactionId") || params.get("transaction_id");
    if (!orderId && !transactionId) return;

    var banner = document.createElement("div");
    banner.id = "checkout-success";
    banner.className = "checkout-success";
    banner.setAttribute("role", "status");
    banner.innerHTML =
      '<div class="wrap checkout-success-inner">' +
      "<p><strong>Payment received.</strong> Thanks — you’re all set.</p>" +
      '<button type="button" class="btn btn-ghost checkout-success-dismiss">Continue</button>' +
      "</div>";
    var main = document.querySelector("main");
    if (main && main.firstChild) {
      main.insertBefore(banner, main.firstChild);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
    var dismiss = banner.querySelector(".checkout-success-dismiss");
    if (dismiss) {
      dismiss.addEventListener("click", function () {
        banner.hidden = true;
      });
    }
    params.delete("orderId");
    params.delete("order_id");
    params.delete("transactionId");
    params.delete("transaction_id");
    params.delete("referenceId");
    params.delete("reference_id");
    var clean =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "") +
      window.location.hash;
    window.history.replaceState({}, "", clean);
  })();
})();