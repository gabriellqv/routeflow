// Configuracao de runtime do web (sobrescreva no deploy).
// O app le window.__env.API_URL, WS_URL, MAP_STYLE_URL e SIMULATOR_URL.
window.__env = {
  API_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  MAP_STYLE_URL: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  SIMULATOR_URL: 'http://localhost:8080',
};
