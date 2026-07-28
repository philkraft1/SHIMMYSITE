(function () {
  var config = window.SQUARE_CONFIG;
  if (!config || !config.items) return;

  function isConfigured() {
    if (config.checkoutMode === "static") {
      return Object.keys(config.items).some(function (id) {
        return Boolean(config.items[id].paymentLinkUrl);
      });
    }
    return Boolean(config.locationId || config.apiBaseUrl);
  }

  function getItem(id) {
    return config.items[id] || null;
  }

  function enableButton(btn, label) {
    btn.classList.remove("is-disabled");
    btn.removeAttribute("disabled");
    btn.removeAttribute("aria-disabled");
    if (label) btn.textContent = label;
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.setAttribute("aria-busy", loading ? "true" : "false");
    if (loading) {
      btn.dataset.squareLabel = btn.textContent;
      btn.textContent = "Opening checkout…";
    } else if (btn.dataset.squareLabel) {
      btn.textContent = btn.dataset.squareLabel;
    }
  }

  async function createCheckoutLink(itemId) {
    var base = (config.apiBaseUrl || "").replace(/\/$/, "");
    var res = await fetch(base + "/api/checkout/" + encodeURIComponent(itemId), {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error(data.error || "Could not start checkout.");
    }
    return data.url;
  }

  async function startCheckout(itemId, btn) {
    var item = getItem(itemId);
    if (!item) return;

    var url = item.paymentLinkUrl;

    if (config.checkoutMode === "api") {
      setLoading(btn, true);
      try {
        url = await createCheckoutLink(itemId);
      } catch (err) {
        setLoading(btn, false);
        window.alert(err.message || "Checkout is not available yet.");
        return;
      }
      setLoading(btn, false);
    }

    if (!url) {
      window.alert("Online checkout is not set up for this item yet.");
      return;
    }

    // Same-tab navigation: window.open after an awaited fetch gets
    // silently blocked by pop-up blockers.
    window.location.href = url;
  }

  function wireButtons() {
    var buttons = document.querySelectorAll("[data-square-item]");
    var ready = isConfigured();

    buttons.forEach(function (btn) {
      var itemId = btn.getAttribute("data-square-item");
      var item = getItem(itemId);
      if (!item) return;

      var hasStaticLink =
        config.checkoutMode === "static" && Boolean(item.paymentLinkUrl);
      var hasApi = config.checkoutMode === "api" && Boolean(config.apiBaseUrl);

      if (hasStaticLink || hasApi) {
        enableButton(btn, btn.getAttribute("data-square-label") || "Pay online");
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          startCheckout(itemId, btn);
        });
      } else if (ready === false) {
        btn.setAttribute("aria-disabled", "true");
        btn.classList.add("is-disabled");
      }
    });

    document.querySelectorAll("[data-square-nav]").forEach(function (link) {
      if (!ready) return;
      link.classList.remove("is-disabled");
      link.textContent = link.getAttribute("data-square-label") || "Pay online";
      link.href = "#admission";
      link.addEventListener("click", function (e) {
        e.preventDefault();
        startCheckout("admission", link);
      });
    });
  }

  function updateStatusNotes() {
    var ready = isConfigured();
    var pending =
      "Online checkout is temporarily unavailable — call (929) 326-2188 to pay by phone";
    var live = "Pay online with Square — same account as the ranch register";

    document.querySelectorAll("[data-square-status]").forEach(function (el) {
      el.textContent = ready ? live : pending;
    });
  }

  /**
   * After a successful Square checkout, buyers are redirected with orderId /
   * transactionId query params. Show a dismissible banner and strip those
   * params so a revisit / refresh shows the normal purchase UI again.
   */
  function handleCheckoutReturn() {
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get("orderId") || params.get("order_id");
    var transactionId =
      params.get("transactionId") || params.get("transaction_id");
    if (!orderId && !transactionId) return;

    var banner = document.getElementById("checkout-success");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "checkout-success";
      banner.className = "checkout-success";
      banner.setAttribute("role", "status");
      var main = document.querySelector("main");
      if (main && main.firstChild) {
        main.insertBefore(banner, main.firstChild);
      } else {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }

    banner.hidden = false;
    banner.innerHTML =
      '<div class="wrap checkout-success-inner">' +
      "<p><strong>Payment received.</strong> Thanks — you’re all set. Show this confirmation at the ranch if asked.</p>" +
      '<button type="button" class="btn btn-ghost checkout-success-dismiss">Continue</button>' +
      "</div>";

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
  }

  wireButtons();
  updateStatusNotes();
  handleCheckoutReturn();
})();
