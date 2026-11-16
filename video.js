// Lógica pura del vídeo de YouTube: sin DOM, sin red y sin almacenamiento.

// Un identificador de YouTube tiene siempre 11 caracteres: letras, números, «-» y «_».
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function isValidYouTubeId(id) {
  return typeof id === "string" && YOUTUBE_ID_PATTERN.test(id);
}

// Devuelve el identificador de un enlace de YouTube (watch?v=, youtu.be/ o embed/),
// o null si el texto no es un enlace válido de YouTube.
function getYouTubeVideoId(url) {
  if (typeof url !== "string" || url.trim() === "") return null;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (error) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  let id = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  } else if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  ) {
    if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.slice("/embed/".length);
    } else if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    }
  }

  return isValidYouTubeId(id) ? id : null;
}

// URL del reproductor incrustado: sin cookies y sin vídeos relacionados al terminar.
function buildEmbedUrl(id) {
  if (!isValidYouTubeId(id)) return null;
  return "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
}

// URL de la consulta oEmbed: responde 200 si el vídeo se puede incrustar y 401 si no.
function buildOEmbedUrl(id) {
  if (!isValidYouTubeId(id)) return null;
  const watchUrl = "https://www.youtube.com/watch?v=" + id;
  return "https://www.youtube.com/oembed?url=" + encodeURIComponent(watchUrl) + "&format=json";
}

// Permite cargar el archivo en Node (tests) sin romper el navegador con file://.
if (typeof module !== "undefined") {
  module.exports = { getYouTubeVideoId, buildEmbedUrl, buildOEmbedUrl };
}
