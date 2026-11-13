// Helper shared by window-style pop-ups: fake browser-tab chrome + countdown bar.
export function createWindow(layer, title, { x, y } = {}) {
  const win = document.createElement('div');
  win.className = 'popup-window';
  win.innerHTML = `
    <div class="popup-titlebar">
      <span class="dots"><i></i><i></i><i></i></span>
      <span class="title">${title}</span>
    </div>
    <div class="popup-timer"></div>
    <div class="popup-body"></div>`;
  // Random-ish placement around the centre so pop-ups feel like they "spawn".
  const px = x ?? 50 + (Math.random() - 0.5) * 20;
  const py = y ?? 50 + (Math.random() - 0.5) * 16;
  win.style.left = `calc(${px}% - 150px)`;
  win.style.top = `calc(${py}% - 160px)`;
  layer.appendChild(win);
  return {
    win,
    body: win.querySelector('.popup-body'),
    timerBar: win.querySelector('.popup-timer'),
  };
}
