// Lógica pura del menú fijo: sin DOM, sin desplazamiento real y sin almacenamiento.

// Decide qué enlace del menú debe resaltarse.
//   sections: [{ navId, top }] en el orden de la página. `navId` es el apartado del menú al que
//             pertenece la sección (null en la presentación y en «Sobre mí»); `top` es su
//             distancia al inicio de la página.
//   line:     posición de lectura: desplazamiento + altura de la barra + un margen.
//   atBottom: true si ya se ha llegado al final de la página.
// Devuelve el `navId` a resaltar, o null si no hay que resaltar ninguno.
function getActiveNavId(sections, line, atBottom) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  // Al final de la página el último apartado (Contacto) puede no llegar a la línea de lectura.
  if (atBottom) return sections[sections.length - 1].navId;

  let active = null;
  let found = false;
  for (const section of sections) {
    if (section.top <= line) {
      active = section.navId;
      found = true;
    }
  }
  return found ? active : null;
}

// Permite cargar el archivo en Node (tests) sin romper el navegador con file://.
if (typeof module !== "undefined") {
  module.exports = { getActiveNavId };
}
