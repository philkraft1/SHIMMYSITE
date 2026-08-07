/**
 * Shared Ranch & Village operating hours.
 * Fills [data-hours] placeholders and injects two footer hours columns.
 */
(function () {
  var LINES = [
    "Sun 12pm–6pm",
    "Mon–Thu 3pm–7pm",
    "Fri 12pm–4pm",
    "Sat Closed",
  ];

  function scheduleListHtml() {
    return (
      '<div class="hours-list">' +
      LINES.map(function (line) {
        var closed = /closed/i.test(line);
        return (
          '<div class="hours-list__line' +
          (closed ? " hours-list__closed" : "") +
          '">' +
          line +
          "</div>"
        );
      }).join("") +
      "</div>"
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

      var ranchCol = document.createElement("div");
      ranchCol.className = "footer-hours footer-hours--ranch";
      ranchCol.innerHTML = "<h4>Ranch Hours</h4>" + scheduleListHtml();

      var villageCol = document.createElement("div");
      villageCol.className = "footer-hours footer-hours--village";
      villageCol.innerHTML = "<h4>Village Hours</h4>" + scheduleListHtml();

      // Right side of footer (opposite brand mark on the left)
      grid.appendChild(ranchCol);
      grid.appendChild(villageCol);
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
