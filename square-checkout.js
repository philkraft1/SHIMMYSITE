(function () {
  var config = window.SQUARE_CONFIG;
  if (!config || !config.items) return;

  function isConfigured() {
    if (config.checkoutMode === "static") {
      return Object.keys(config.items).some(function (id) {
        return Boolean(config.items[id].paymentLinkUrl);
      });
    }
    return Boolean(config.locationId);
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

    window.open(url, "_blank", "noopener,noreferrer");
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
      var hasApi = config.checkoutMode === "api" && Boolean(config.locationId);

      if (hasStaticLink || hasApi) {
        enableButton(btn, btn.getAttribute("data-square-label") || "Pay online");
        btn.addEventListener("click", function () {
          startCheckout(itemId, btn);
        });
      } else if (ready === false) {
        btn.setAttribute("aria-disabled", "true");
      }
    });

    document.querySelectorAll("[data-square-nav]").forEach(function (link) {
      if (!ready) return;
      link.classList.remove("is-disabled");
      link.href = "tickets.html#admission";
      link.textContent = link.getAttribute("data-square-label") || "Pay online";
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

  wireButtons();
  updateStatusNotes();
})();
