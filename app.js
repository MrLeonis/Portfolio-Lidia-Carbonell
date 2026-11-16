// Interfaz del portfolio: buscador de filmografía y vídeo bajo demanda.
// Se carga con <script defer> después de filmography.js y video.js, así que sus
// funciones (`filterCredits`, `getYouTubeVideoId`…) ya existen. Todo va dentro de una función para no crear variables globales.
(function () {
  setupCreditSearch();
  setupVideobook();

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
})();
