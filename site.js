/* ============================================================
   RAZORBOTZ — Site Component Injector
   ============================================================ */

const NAV_ITEMS = [
  { href: "index.html", label: "Home" },
  { href: "index.html#history", label: "History" },
  { href: "index.html#competition", label: "Competition" },
  { href: "index.html#robot", label: "Robot" },
  { href: "team.html", label: "Team" },
  { href: "index.html#sponsors", label: "Sponsors" },
  { href: "index.html#faq", label: "FAQ" }
];

// The two buttons on the right side of the nav bar
const NAV_ACTIONS = [
  { href: "index.html#join", label: "Join Us", style: "btn-primary" },
  { href: "mailto:razorbotz@uark.edu", label: "Contact Us", style: "btn-outline" }
];

// Replace "#" with your real profile URLs
const SOCIAL_LINKS = [
  { href: "#", label: "Instagram" },
  { href: "#", label: "LinkedIn" },
  { href: "#", label: "GitHub" },
  { href: "#", label: "YouTube" }
];

const LOGO_SRC = "assets/img/Logo380x300.png";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Header ---------- */
function buildHeader() {
  const container = document.getElementById("site-header");
  if (!container) return;

  const currentPath = location.pathname.split("/").pop() || "index.html";

  const links = NAV_ITEMS.map(item => {
    const active = item.href === currentPath ? ' class="active" aria-current="page"' : "";
    return `<li><a href="${item.href}"${active}>${item.label}</a></li>`;
  }).join("");

  const actions = NAV_ACTIONS.map(a =>
    `<a href="${a.href}" class="btn btn-sm ${a.style}">${a.label}</a>`
  ).join("");

  container.innerHTML = `
    <header class="navbar">
      <div class="container nav-container">
        <a href="index.html" class="nav-brand">
          <img src="${LOGO_SRC}" alt="" class="nav-logo" data-no-fallback>
          Razor<span>botz</span>
        </a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <div class="nav-menu" id="nav-menu">
          <ul class="nav-links">${links}</ul>
          <div class="nav-actions">${actions}</div>
        </div>
      </div>
    </header>
  `;

  const header = container.querySelector(".navbar");
  const toggle = container.querySelector(".nav-toggle");

  const setOpen = open => {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
  // Close the mobile menu after picking a link
  container.querySelectorAll(".nav-menu a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
}

/* ---------- Footer ---------- */
function buildFooter() {
  const container = document.getElementById("site-footer");
  if (!container) return;

  const year = new Date().getFullYear();
  const nav = NAV_ITEMS.map(i => `<li><a href="${i.href}">${i.label}</a></li>`).join("");
  const socials = SOCIAL_LINKS.map(l =>
    `<li><a href="${l.href}" target="_blank" rel="noopener">${l.label}</a></li>`
  ).join("");

  container.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <h3>Razorbotz</h3>
            <p>University of Arkansas NASA Lunabotics Team</p>
          </div>
          <ul class="footer-nav">${nav}</ul>
          <ul class="footer-social">${socials}</ul>
        </div>
        <div class="footer-disclaimer">
          <p>The views, opinions, and conclusions expressed on this website are those of the Razorbotz student team and not necessarily those of the University of Arkansas or its officers and trustees. This website has not been reviewed or approved by the University, and the team is solely responsible for its content.</p>
          <p class="mt-2">&copy; ${year} Arkansas Razorbotz.</p>
        </div>
      </div>
    </footer>
  `;
}

/* ---------- Carousels ---------- */
// Slides can hold an <img>, a <video>, or a YouTube <iframe>.
// Auto-advance pauses while a video is playing, and a video pauses
// when you slide away from it.
// Options: autoplay (default true), onChange(index) called whenever the slide changes.
function initCarousel(root, { autoplay = true, onChange } = {}) {
  const track = root.querySelector(".carousel-track");
  const slides = Array.from(root.querySelectorAll(".carousel-slide"));
  if (!track || slides.length < 2) return null;

  let index = 0;
  let timer = null;
  let videoPlaying = false;

  const mediaIn = slide => slide.querySelector("video, iframe");

  // YouTube only accepts pause commands from the page if enablejsapi=1 is in the URL
  root.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(frame => {
    if (!frame.src.includes("enablejsapi=1")) {
      frame.src += (frame.src.includes("?") ? "&" : "?") + "enablejsapi=1";
    }
  });

  function pauseMedia(slide) {
    const media = mediaIn(slide);
    if (!media) return;
    if (media.tagName === "VIDEO") media.pause();
    else media.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: "" }), "*"
    );
  }

  // Controls
  const prev = document.createElement("button");
  prev.className = "carousel-btn carousel-prev";
  prev.setAttribute("aria-label", "Previous slide");
  prev.innerHTML = "&#8249;";

  const next = document.createElement("button");
  next.className = "carousel-btn carousel-next";
  next.setAttribute("aria-label", "Next slide");
  next.innerHTML = "&#8250;";

  const dots = document.createElement("div");
  dots.className = "carousel-dots";
  const dotButtons = slides.map((_, i) => {
    const d = document.createElement("button");
    d.setAttribute("aria-label", `Show slide ${i + 1} of ${slides.length}`);
    d.addEventListener("click", () => { go(i); restart(); });
    dots.appendChild(d);
    return d;
  });

  root.append(prev, next, dots);

  function go(i) {
    const nextIndex = (i + slides.length) % slides.length;
    if (nextIndex !== index) {
      pauseMedia(slides[index]);
      videoPlaying = false;
    }
    index = nextIndex;
    // Load this slide and the two on each side, and decode them in the
    // background so sliding to them doesn't stall the page
    for (let n = index - 2; n <= index + 2; n++) {
      const slide = slides[(n + slides.length) % slides.length];
      slide.querySelectorAll("img").forEach(img => {
        if (img.dataset.src) {
          slide.classList.add("loading");
          const done = () => slide.classList.remove("loading");
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
        img.decode?.().catch(() => {});
      });
    }
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((s, n) => s.setAttribute("aria-hidden", String(n !== index)));
    dotButtons.forEach((d, n) => d.classList.toggle("active", n === index));
    // Moves the dots out of the way of the video's controls
    root.classList.toggle("on-video", Boolean(mediaIn(slides[index])));
    onChange?.(index);
  }

  function start() {
    if (!autoplay || prefersReducedMotion || videoPlaying) return;
    stop();
    timer = setInterval(() => go(index + 1), 6000);
  }
  function stop() { clearInterval(timer); timer = null; }
  function restart() { stop(); start(); }

  // Local <video> files report play/pause directly
  root.querySelectorAll("video").forEach(v => {
    v.addEventListener("play", () => { videoPlaying = true; stop(); });
    v.addEventListener("pause", () => { videoPlaying = false; });
    v.addEventListener("ended", () => { videoPlaying = false; start(); });
  });

  // YouTube iframes don't report playback, but clicking into one moves
  // focus into the iframe, which we can detect
  window.addEventListener("blur", () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active?.tagName === "IFRAME" && root.contains(active)) {
        videoPlaying = true;
        stop();
      }
    });
  });

  prev.addEventListener("click", () => { go(index - 1); restart(); });
  next.addEventListener("click", () => { go(index + 1); restart(); });

  root.tabIndex = 0;
  root.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { go(index - 1); restart(); }
    if (e.key === "ArrowRight") { go(index + 1); restart(); }
  });

  // Pause while someone is looking at or interacting with it
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);

  go(0);
  start();

  return { go: i => { go(i); restart(); } };
}

/* ---------- Gallery (large viewer + thumbnails) ---------- */
// Builds the viewer from the <img> tags in .gallery-grid, so each photo
// only needs to be listed once in the HTML. Captions come from alt text.
function initGallery(root) {
  const grid = root.querySelector(".gallery-grid");
  const photos = Array.from(grid?.querySelectorAll("img") || []);
  if (photos.length === 0) return;

  // Large viewer
  const viewer = document.createElement("div");
  viewer.className = "carousel gallery-viewer";
  viewer.setAttribute("aria-roledescription", "carousel");
  viewer.setAttribute("aria-label", "Photo gallery");

  const track = document.createElement("div");
  track.className = "carousel-track";
  photos.forEach(photo => {
    const slide = document.createElement("figure");
    slide.className = "carousel-slide";
    const img = document.createElement("img");
    img.dataset.src = photo.getAttribute("src");
    img.alt = photo.alt;
    img.decoding = "async";
    slide.appendChild(img);
    track.appendChild(slide);
  });
  viewer.appendChild(track);

  // Caption + counter under the viewer
  const caption = document.createElement("p");
  caption.className = "gallery-caption";
  caption.setAttribute("aria-live", "polite");
  const captionText = document.createElement("span");
  const counter = document.createElement("span");
  counter.className = "gallery-count";
  caption.append(captionText, counter);

  root.insertBefore(viewer, grid);
  root.insertBefore(caption, grid);

  // If data-thumbs is set, thumbnails load small copies from that folder,
  // falling back to the full photo if a thumbnail is missing
  const thumbDir = root.dataset.thumbs;
  if (thumbDir) {
    photos.forEach(photo => {
      const full = photo.getAttribute("src");
      photo.dataset.full = full;
      photo.addEventListener("error", () => {
        if (photo.getAttribute("src") !== full) photo.src = full;
      }, { once: true });
      photo.src = thumbDir.replace(/\/?$/, "/") + full.split("/").pop();
    });
  }

  // Turn each grid image into a clickable thumbnail
  const thumbs = photos.map((photo, i) => {
    const btn = document.createElement("button");
    btn.className = "gallery-thumb";
    btn.setAttribute("aria-label", `View photo ${i + 1}: ${photo.alt}`);
    photo.replaceWith(btn);
    btn.appendChild(photo);
    return btn;
  });

  const update = i => {
    captionText.textContent = photos[i].alt;
    counter.textContent = `${i + 1} / ${photos.length}`;
    thumbs.forEach((t, n) => {
      t.classList.toggle("active", n === i);
      t.setAttribute("aria-current", n === i ? "true" : "false");
    });
  };

  const carousel = initCarousel(viewer, { autoplay: false, onChange: update });
  if (!carousel) {
    // Only one photo: just show it
    const only = viewer.querySelector("img[data-src]");
    if (only) only.src = only.dataset.src;
    update(0);
  }

  thumbs.forEach((btn, i) => btn.addEventListener("click", () => {
    carousel?.go(i);
    // Bring the viewer into view if the thumbnail was far down the page
    const rect = viewer.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      viewer.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    }
  }));
}

/* ---------- Missing-image placeholders ---------- */
// Any image that fails to load is swapped for a labeled box, so the layout
// still looks intentional while you're gathering photos.
function handleMissingImages() {
  document.querySelectorAll("img").forEach(img => {
    img.decoding = "async";
    const fail = () => {
      if (img.dataset.full && img.getAttribute("src") !== img.dataset.full) return; // retrying full photo
      if (img.hasAttribute("data-no-fallback")) { img.style.display = "none"; return; }
      const box = document.createElement("div");
      box.className = "img-fallback";
      box.textContent = img.alt || "Photo coming soon";
      img.replaceWith(box);
    };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
    else img.addEventListener("error", fail);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  buildHeader();
  buildFooter();
  document.querySelectorAll("[data-carousel]").forEach(el => initCarousel(el));
  document.querySelectorAll("[data-gallery]").forEach(initGallery);
  handleMissingImages();
});