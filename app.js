// Interfaz del portfolio: buscador de filmografía.
// Se carga con <script defer> después de filmography.js, así que `filterCredits`
// ya existe. Todo va dentro de una función para no crear variables globales.
(function () {
  setupCreditSearch();

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
})();
