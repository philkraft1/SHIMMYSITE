(function () {
  var config = window.SQUARE_CONFIG;
  if (!config || !config.items) return;

  var QTY_MIN = 1;
  var QTY_MAX = 20;

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

  function formatMoney(cents) {
    return "$" + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  }

  function readQuantity(btn) {
    var root = btn.closest("[data-square-qty-root]") || btn.parentElement;
    var input = root && root.querySelector("[data-square-qty]");
    if (!input) return 1;
    var n = Number.parseInt(input.value, 10);
    if (!Number.isFinite(n) || n < QTY_MIN) return QTY_MIN;
    if (n > QTY_MAX) return QTY_MAX;
    return n;
  }

  function updateQtyDisplay(root) {
    var input = root.querySelector("[data-square-qty]");
    var totalEl = root.querySelector("[data-square-qty-total]");
    var btn = root.querySelector("[data-square-item]");
    if (!input || !btn) return;

    var item = getItem(btn.getAttribute("data-square-item"));
    var qty = readQuantity(btn);
    input.value = String(qty);

    var dec = root.querySelector("[data-qty-dec]");
    var inc = root.querySelector("[data-qty-inc]");
    if (dec) dec.disabled = qty <= QTY_MIN;
    if (inc) inc.disabled = qty >= QTY_MAX;

    if (totalEl && item && typeof item.amountCents === "number") {
      totalEl.textContent = formatMoney(item.amountCents * qty);
      totalEl.hidden = false;
    }
  }

  function mountQtyControl(btn) {
    if (btn.closest("[data-square-qty-root]")) return;
    if (btn.getAttribute("data-square-qty") === "false") return;

    var wrap = document.createElement("div");
    wrap.className = "square-qty-root";
    wrap.setAttribute("data-square-qty-root", "");

    var row = document.createElement("div");
    row.className = "square-qty";
    row.innerHTML =
      '<span class="square-qty-label">Qty</span>' +
      '<div class="square-qty-control" role="group" aria-label="Quantity">' +
      '<button type="button" class="square-qty-btn" data-qty-dec aria-label="Decrease quantity">\u2212</button>' +
      '<input class="square-qty-input" type="number" inputmode="numeric" min="' +
      QTY_MIN +
      '" max="' +
      QTY_MAX +
      '" value="1" data-square-qty aria-label="Quantity" />' +
      '<button type="button" class="square-qty-btn" data-qty-inc aria-label="Increase quantity">+</button>' +
      "</div>" +
      '<span class="square-qty-total" data-square-qty-total hidden></span>';

    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(row);
    wrap.appendChild(btn);

    var input = row.querySelector("[data-square-qty]");
    row.querySelector("[data-qty-dec]").addEventListener("click", function () {
      input.value = String(Math.max(QTY_MIN, readQuantity(btn) - 1));
      updateQtyDisplay(wrap);
    });
    row.querySelector("[data-qty-inc]").addEventListener("click", function () {
      input.value = String(Math.min(QTY_MAX, readQuantity(btn) + 1));
      updateQtyDisplay(wrap);
    });
    input.addEventListener("change", function () {
      updateQtyDisplay(wrap);
    });
    input.addEventListener("input", function () {
      updateQtyDisplay(wrap);
    });

    updateQtyDisplay(wrap);
  }

  async function createCheckoutLink(itemId, quantity) {
    var base = (config.apiBaseUrl || "").replace(/\/$/, "");
    var res = await fetch(base + "/api/checkout/" + encodeURIComponent(itemId), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: quantity }),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error(data.error || "Could not start checkout.");
    }
    return data.url;
  }

  async function startCheckout(itemId, btn, quantity) {
    var item = getItem(itemId);
    if (!item) return;

    var qty = quantity || 1;
    var url = item.paymentLinkUrl;

    if (config.checkoutMode === "api") {
      setLoading(btn, true);
      try {
        url = await createCheckoutLink(itemId, qty);
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
        if (hasApi) mountQtyControl(btn);
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          startCheckout(itemId, btn, readQuantity(btn));
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
        startCheckout("admission", link, 1);
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
