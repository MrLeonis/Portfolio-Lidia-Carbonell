// Interfaz del portfolio: buscador de filmografía, vídeo bajo demanda y menú fijo.
// Se carga con <script defer> después de filmography.js y video.js, así que sus
// funciones (`filterCredits`, `getYouTubeVideoId`…) ya existen. Todo va dentro de una función para no crear variables globales.
(function () {
  setupCreditSearch();
  setupVideobook();
  setupStickyMenu();

  // --- Buscador de la filmografía -------------------------------------------

  function setupCreditSearch() {
    const section = document.getElementById("filmografia");
    if (!section) return;

    const groups = Array.from(section.querySelectorAll(".film-group"));

    // Un objeto por fila de tabla, con los tres textos donde se busca.
    const entries = [];
    groups.forEach(function (group) {
      group.querySelectorAll("tbody tr").forEach(function (row) {
        const channelLink = row.querySelector("a.channel");
        entries.push({
          group: group,
          row: row,
          credit: {
            title: row.querySelector("th").textContent,
            role: row.querySelector("td").textContent,
            channel: channelLink ? channelLink.textContent : "",
          },
        });
      });
    });

    // Estado inicial de cada grupo, para restaurarlo al vaciar el buscador.
    const groupInfo = groups.map(function (group) {
      return {
        group: group,
        wasOpen: group.open,
        count: group.querySelector(".group-count"),
        originalCount: group.querySelector(".group-count").textContent,
      };
    });

    // El buscador se crea aquí: sin JavaScript no aparece y la tabla se ve entera.
    const search = document.createElement("div");
    search.className = "film-search";
    search.innerHTML =
      '<label for="credit-search">Buscar por título, papel o canal</label>' +
      '<input id="credit-search" type="search" autocomplete="off">' +
      '<p id="search-status" role="status"></p>';
    section.querySelector("p").after(search);

    const input = document.getElementById("credit-search");
    const status = document.getElementById("search-status");
    status.textContent = entries.length + " créditos.";

    input.addEventListener("input", function () {
      const query = input.value;
      const isSearching = query.trim() !== "";
      const matches = new Set(
        filterCredits(
          entries.map(function (entry) {
            return entry.credit;
          }),
          query
        )
      );

      entries.forEach(function (entry) {
        entry.row.hidden = !matches.has(entry.credit);
      });

      groupInfo.forEach(function (info) {
        const total = info.group.querySelectorAll("tbody tr").length;
        const found = info.group.querySelectorAll("tbody tr:not([hidden])").length;
        if (isSearching) {
          info.group.hidden = found === 0;
          info.group.open = found > 0;
          info.count.textContent = found + " de " + total + " créditos";
        } else {
          info.group.hidden = false;
          info.group.open = info.wasOpen;
          info.count.textContent = info.originalCount;
        }
      });

      status.textContent = describeResults(matches.size, entries.length, query.trim());
    });
  }

  function describeResults(found, total, query) {
    if (query === "") return total + " créditos.";
    if (found === 0) return "Sin resultados para «" + query + "».";
    if (found === 1) return "1 resultado.";
    return found + " resultados.";
  }

  // --- Videobook bajo demanda ------------------------------------------------

  // No se pide nada a YouTube hasta que la persona pulsa la miniatura. Entonces se
  // comprueba si el vídeo admite incrustación: si sí, se reproduce aquí; si no, se
  // avisa con un enlace, en lugar de enseñar el error de YouTube.
  function setupVideobook() {
    const link = document.getElementById("videobook");
    if (!link || !getYouTubeVideoId(link.href)) return;

    const status = document.createElement("p");
    status.className = "video-status";
    status.setAttribute("role", "status");
    link.after(status);

    let checking = false;
    let unavailable = false;

    link.addEventListener("click", function (event) {
      // Con Ctrl, Mayús, Cmd o botón central, o si ya sabemos que no se puede
      // incrustar, se deja actuar al enlace normal (abre YouTube en otra pestaña).
      if (unavailable || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      if (checking) return;

      const videoId = getYouTubeVideoId(link.href);
      checking = true;
      status.textContent = "Cargando el vídeo…";

      canEmbed(videoId).then(function (embeddable) {
        checking = false;
        if (embeddable) {
          showPlayer(link, status, videoId);
        } else {
          unavailable = true;
          showUnavailable(link, status);
        }
      });
    });
  }

  // Pregunta a YouTube (oEmbed) si el vídeo se puede incrustar. Responde false si no
  // se puede, si falla la red o si tarda demasiado.
  function canEmbed(videoId) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, 8000);

    return fetch(buildOEmbedUrl(videoId), { signal: controller.signal })
      .then(function (response) {
        return response.ok;
      })
      .catch(function () {
        return false;
      })
      .then(function (result) {
        clearTimeout(timer);
        return result;
      });
  }

  function showPlayer(link, status, videoId) {
    const frame = document.createElement("iframe");
    frame.src = buildEmbedUrl(videoId);
    frame.title = "Videobook de doblaje de Lidia Carbonell";
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";

    const box = document.createElement("div");
    box.className = "video-frame";
    box.appendChild(frame);

    link.replaceWith(box);
    status.textContent = "";
    frame.focus();
  }

  function showUnavailable(link, status) {
    status.textContent = "Este vídeo no se puede reproducir aquí. ";
    const open = document.createElement("a");
    open.href = link.href;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "Abrir en YouTube";
    const hint = document.createElement("span");
    hint.className = "visually-hidden";
    hint.textContent = " (se abre en una pestaña nueva)";
    open.appendChild(hint);
    status.appendChild(open);
  }

  // --- Menú fijo -------------------------------------------------------------

  // La barra queda fija arriba. Para que los títulos no queden tapados al ir a un apartado
  // (enlaces, teclado y «Saltar al contenido»), el CSS usa la altura de la barra como margen
  // de ancla (`scroll-padding-top: var(--header-h)`). Aquí se mide esa altura real.
  function setupStickyMenu() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    function updateHeaderHeight() {
      document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    }

    updateHeaderHeight();
    if ("ResizeObserver" in window) {
      new ResizeObserver(updateHeaderHeight).observe(header);
    } else {
      window.addEventListener("resize", updateHeaderHeight);
    }

    setupActiveLink(header);
    setupMenuSlider(header);
  }

  // Resalta en el menú el apartado que se está leyendo y lo marca como «ubicación actual»
  // (`aria-current`). La decisión la toma `getActiveNavId` (menu.js); aquí solo se mide la página.
  function setupActiveLink(header) {
    const links = Array.from(header.querySelectorAll("nav a[data-nav]"));
    const list = header.querySelector("nav ul");
    const sections = Array.from(document.querySelectorAll("main > section[id]"));
    const prefersLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentNavId = null;
    let updatePending = false;

    function updateActiveLink() {
      updatePending = false;
      const scrollTop = window.scrollY;
      const items = sections.map(function (section) {
        return { navId: section.dataset.nav || null, top: section.getBoundingClientRect().top + scrollTop };
      });
      const readingLine = scrollTop + header.offsetHeight + 24;
      const atBottom = scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const activeId = getActiveNavId(items, readingLine, atBottom);
      if (activeId === currentNavId) return;

      currentNavId = activeId;
      links.forEach(function (link) {
        if (link.dataset.nav === activeId) {
          link.setAttribute("aria-current", "location");
          centerLinkInRow(link);
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    // En pantallas estrechas la fila del menú se desliza: se centra el enlace resaltado
    // moviendo solo esa fila, sin tocar el desplazamiento de la página.
    function centerLinkInRow(link) {
      if (!list || list.scrollWidth <= list.clientWidth) return;
      const linkBox = link.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      const offset = linkBox.left - listBox.left - (list.clientWidth - linkBox.width) / 2;
      list.scrollBy({ left: offset, behavior: prefersLessMotion.matches ? "auto" : "smooth" });
    }

    function requestUpdate() {
      if (updatePending) return;
      updatePending = true;
      window.requestAnimationFrame(updateActiveLink);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    updateActiveLink();
  }

  // En pantallas estrechas la fila del menú es un deslizador: con el dedo se desliza sola (es el
  // comportamiento normal del navegador); aquí se añade el arrastre con el ratón y el aviso de
  // que hay más enlaces (`data-scroll` en el <nav>, que el CSS usa para difuminar los bordes).
  function setupMenuSlider(header) {
    const nav = header.querySelector("nav");
    const list = header.querySelector("nav ul");
    if (!nav || !list) return;

    function updateEdges() {
      const maxScroll = list.scrollWidth - list.clientWidth;
      let state = "none";
      if (maxScroll > 1) {
        state = list.scrollLeft <= 1 ? "start" : list.scrollLeft >= maxScroll - 1 ? "end" : "middle";
      }
      nav.dataset.scroll = state;
      list.classList.toggle("is-scrollable", state !== "none");
    }

    list.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    updateEdges();

    // Arrastre con el ratón (los gestos táctiles no necesitan nada más)
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;

    list.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse" || event.button !== 0 || !list.classList.contains("is-scrollable")) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = list.scrollLeft;
    });

    window.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      const distance = event.clientX - startX;
      if (!moved && Math.abs(distance) > 5) {
        moved = true;
        list.classList.add("is-dragging");
      }
      if (moved) list.scrollLeft = startScroll - distance;
    });

    function stopDragging() {
      if (!dragging) return;
      dragging = false;
      list.classList.remove("is-dragging");
    }
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    // Sin esto, arrastrar sobre un enlace inicia el arrastre nativo del enlace y se cancela el nuestro
    list.addEventListener("dragstart", function (event) {
      event.preventDefault();
    });

    // Tras un arrastre, el clic de soltar no debe abrir el enlace sobre el que termina
    list.addEventListener(
      "click",
      function (event) {
        if (!moved) return;
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      },
      true
    );
  }
})();
