(function () {
  var config = window.NEWSLETTER_CONFIG || window.SITE_CONFIG || {};
  var apiBase = (config.apiBaseUrl || "http://127.0.0.1:3001").replace(/\/$/, "");

  var monthLabel = document.getElementById("cal-month-label");
  var grid = document.getElementById("cal-grid");
  var prevBtn = document.getElementById("cal-prev");
  var nextBtn = document.getElementById("cal-next");
  var selectedLabel = document.getElementById("cal-selected");
  var dateInput = document.getElementById("booking-date");
  var form = document.getElementById("booking-form");
  var statusEl = document.getElementById("booking-status");
  if (!grid || !form || !dateInput) return;

  var view = new Date();
  view.setDate(1);
  view.setHours(12, 0, 0, 0);
  var selected = null;
  var bookedCounts = {};

  function ymd(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 12);
  }

  function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
  }

  async function loadBookedDates() {
    var from = ymd(startOfMonth(view));
    var to = ymd(endOfMonth(view));
    try {
      var res = await fetch(
        apiBase + "/api/bookings/dates?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
      );
      var data = await res.json();
      bookedCounts = {};
      (data.dates || []).forEach(function (row) {
        bookedCounts[row.booking_date] = Number(row.count) || 0;
      });
    } catch {
      bookedCounts = {};
    }
  }

  function render() {
    var year = view.getFullYear();
    var month = view.getMonth();
    monthLabel.textContent = view.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    grid.innerHTML = "";
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (d) {
      var el = document.createElement("div");
      el.className = "cal-dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    var first = startOfMonth(view);
    var startPad = first.getDay();
    var daysInMonth = endOfMonth(view).getDate();
    var today = new Date();
    today.setHours(12, 0, 0, 0);

    for (var i = 0; i < startPad; i++) {
      var empty = document.createElement("button");
      empty.type = "button";
      empty.className = "cal-day is-empty";
      empty.disabled = true;
      grid.appendChild(empty);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day, 12);
      var key = ymd(date);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = String(day);
      btn.dataset.date = key;

      if (date < today) {
        btn.classList.add("is-past");
        btn.disabled = true;
      }
      if (bookedCounts[key]) {
        btn.classList.add("has-bookings");
        btn.title = bookedCounts[key] + " request(s) this day";
      }
      if (selected === key) btn.classList.add("is-selected");

      btn.addEventListener("click", function () {
        selected = this.dataset.date;
        dateInput.value = selected;
        selectedLabel.textContent = "Selected: " + selected;
        render();
      });

      grid.appendChild(btn);
    }
  }

  async function refresh() {
    await loadBookedDates();
    render();
  }

  prevBtn.addEventListener("click", function () {
    view.setMonth(view.getMonth() - 1);
    refresh();
  });
  nextBtn.addEventListener("click", function () {
    view.setMonth(view.getMonth() + 1);
    refresh();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!dateInput.value) {
      window.alert("Pick a date on the calendar first.");
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var original = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending request…";
    }
    statusEl.hidden = true;

    try {
      var res = await fetch(apiBase + "/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          bookingDate: dateInput.value,
          bookingTime: form.time.value,
          service: form.service.value,
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          guests: form.guests.value,
          notes: form.notes.value.trim(),
        }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || "Could not send booking.");

      form.reset();
      dateInput.value = selected || "";
      statusEl.hidden = false;
      statusEl.textContent =
        "Request sent for " +
        (data.booking && data.booking.date) +
        ". The ranch will confirm by phone or email.";
      refresh();
    } catch (err) {
      window.alert(
        (err && err.message) ||
          "Could not send booking. Make sure the ranch API is running."
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    }
  });

  refresh();
})();
