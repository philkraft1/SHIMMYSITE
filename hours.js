/**
 * Shared Ranch & Village operating hours.
 * Fills [data-hours] placeholders and injects a footer Hours column.
 */
(function () {
  var LINES = [
    "Sun 12pm–6pm",
    "Mon–Wed 3pm–7pm",
    "Thu Closed",
    "Fri 12pm–4pm",
    "Sat Closed",
  ];

  function scheduleListHtml() {
    return (
      '<ul class="hours-list">' +
      LINES.map(function (line) {
        var closed = /closed/i.test(line);
        return (
          '<li' +
          (closed ? ' class="hours-list__closed"' : "") +
          ">" +
          line +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function blockHtml(title) {
    return (
      '<div class="hours-block">' +
      (title ? '<p class="hours-block__title">' + title + "</p>" : "") +
      scheduleListHtml() +
      "</div>"
    );
  }

  function bothHtml() {
    return (
      '<div class="hours-both">' +
      blockHtml("Ranch") +
      blockHtml("The Village") +
      "</div>"
    );
  }

  function fillPlaceholders() {
    document.querySelectorAll("[data-hours]").forEach(function (el) {
      var kind = (el.getAttribute("data-hours") || "").toLowerCase();
      if (kind === "ranch") {
        el.innerHTML = blockHtml("Ranch");
      } else if (kind === "village") {
        el.innerHTML = blockHtml("The Village");
      } else if (kind === "both") {
        el.innerHTML = bothHtml();
      } else if (kind === "schedule") {
        el.innerHTML = scheduleListHtml();
      } else {
        el.innerHTML = scheduleListHtml();
      }
    });
  }

  function injectFooterHours() {
    document.querySelectorAll(".site-footer .footer-grid").forEach(function (grid) {
      if (grid.querySelector(".footer-hours")) return;
      var col = document.createElement("div");
      col.className = "footer-hours";
      col.innerHTML =
        "<h4>Hours</h4>" +
        '<div class="footer-hours__locations">' +
        blockHtml("Ranch") +
        blockHtml("The Village") +
        "</div>";
      grid.appendChild(col);
    });
  }

  function init() {
    fillPlaceholders();
    injectFooterHours();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
