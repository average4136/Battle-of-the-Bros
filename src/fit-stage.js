// Scales a fixed-size "stage" to fit the browser window.
//
// The title page is drawn on a 1280 x 890 stage with everything placed at
// exact pixel positions. Instead of rearranging it for small windows, we
// shrink (or grow) the whole stage, keeping its shape. This script works out
// the scale and stores it in the CSS variable --stage-scale; home.css does
// the actual resizing with it.
//
// Plain JavaScript on purpose: it's tiny and has nothing to type-check.

/**
 * Keep --stage-scale up to date as the window is resized.
 *
 * @param {number} width   the stage's design width in px
 * @param {number} height  the stage's design height in px
 */
export function fitStage(width, height) {
  function update() {
    // documentElement.clientWidth is the window width minus any scrollbar.
    const scale = Math.min(document.documentElement.clientWidth / width, window.innerHeight / height);
    document.documentElement.style.setProperty('--stage-scale', String(scale));
  }
  update();
  window.addEventListener('resize', update);
}
