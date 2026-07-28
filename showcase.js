(function () {
  var filters = document.querySelectorAll(".showcase-filter");
  var items = Array.prototype.slice.call(document.querySelectorAll(".showcase-item"));
  var empty = document.getElementById("showcase-empty");
  var lightbox = document.getElementById("showcase-lightbox");
  var lightboxImg = lightbox ? lightbox.querySelector("img") : null;
  var closeBtn = lightbox ? lightbox.querySelector(".showcase-lightbox-close") : null;
  var prevBtn = lightbox ? lightbox.querySelector(".showcase-lightbox-prev") : null;
  var nextBtn = lightbox ? lightbox.querySelector(".showcase-lightbox-next") : null;
  var activeFilter = "all";
  var visibleThumbs = [];
  var currentIndex = 0;

  function getVisibleItems() {
    return items.filter(function (item) {
      return !item.hidden;
    });
  }

  function applyFilter(filter) {
    activeFilter = filter;
    var shown = 0;
    items.forEach(function (item) {
      var cats = (item.getAttribute("data-cats") || "").split(/\s+/);
      var match = filter === "all" || cats.indexOf(filter) !== -1;
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (empty) empty.hidden = shown > 0;
    filters.forEach(function (btn) {
      var on = btn.getAttribute("data-filter") === filter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFilter(btn.getAttribute("data-filter") || "all");
    });
  });

  function openLightbox(index) {
    visibleThumbs = getVisibleItems().map(function (item) {
      return item.querySelector(".showcase-thumb");
    }).filter(Boolean);
    if (!visibleThumbs.length || !lightbox || !lightboxImg) return;
    currentIndex = Math.max(0, Math.min(index, visibleThumbs.length - 1));
    var thumb = visibleThumbs[currentIndex];
    lightboxImg.src = thumb.getAttribute("data-src") || "";
    lightboxImg.alt = thumb.getAttribute("data-alt") || "";
    lightbox.hidden = false;
    document.body.classList.add("showcase-lightbox-open");
    closeBtn && closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.classList.remove("showcase-lightbox-open");
  }

  function stepLightbox(delta) {
    if (!visibleThumbs.length) return;
    currentIndex = (currentIndex + delta + visibleThumbs.length) % visibleThumbs.length;
    var thumb = visibleThumbs[currentIndex];
    lightboxImg.src = thumb.getAttribute("data-src") || "";
    lightboxImg.alt = thumb.getAttribute("data-alt") || "";
  }

  items.forEach(function (item) {
    var thumb = item.querySelector(".showcase-thumb");
    if (!thumb) return;
    thumb.addEventListener("click", function () {
      var visible = getVisibleItems();
      var idx = visible.indexOf(item);
      openLightbox(idx === -1 ? 0 : idx);
    });
  });

  closeBtn && closeBtn.addEventListener("click", closeLightbox);
  prevBtn && prevBtn.addEventListener("click", function () { stepLightbox(-1); });
  nextBtn && nextBtn.addEventListener("click", function () { stepLightbox(1); });

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
})();
