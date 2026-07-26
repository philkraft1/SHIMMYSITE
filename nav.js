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
})();
