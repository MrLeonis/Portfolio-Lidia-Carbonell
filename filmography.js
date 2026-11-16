// Lógica pura del buscador de filmografía: sin DOM ni almacenamiento.

// Pasa a minúsculas, quita tildes y recorta espacios para comparar textos.
function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Devuelve los créditos cuyo título, papel o canal contienen la consulta.
// Una consulta vacía devuelve todos. No modifica la lista original.
function filterCredits(credits, query) {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery === "") return credits.slice();

  return credits.filter((credit) => {
    const text = [credit.title, credit.role, credit.channel]
      .map(normalizeText)
      .join(" ");
    return text.includes(normalizedQuery);
  });
}

// Permite cargar el archivo en Node (tests) sin romper el navegador con file://.
if (typeof module !== "undefined") {
  module.exports = { normalizeText, filterCredits };
}
