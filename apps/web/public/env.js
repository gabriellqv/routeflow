// Configuracao de runtime do web (sobrescreva no deploy).
// O app le window.__env.API_URL, WS_URL e MAP_TILES_URL.
window.__env = {
  API_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  MAP_TILES_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
