// Keyboard flies the plane; the mouse runs the harbour board and confirms menus. Held keys give
// continuous axes (read every physics step); a click or Space/Enter is queued as a one-shot and
// taken at most once, so a press between two frames is never lost or double-counted.
const CLIMB = new Set(['ArrowUp', 'KeyW']);
const DIVE = new Set(['ArrowDown', 'KeyS']);
const YAW_LEFT = new Set(['ArrowLeft', 'KeyA']);
const YAW_RIGHT = new Set(['ArrowRight', 'KeyD']);
const THROTTLE_UP = new Set(['KeyE']);
const THROTTLE_DOWN = new Set(['KeyQ']);
const CONFIRM = new Set(['Space', 'Enter']);
const MUTE = new Set(['KeyM']);

/** `onGesture` fires on every keydown and click: the one native-event hook that can unlock audio. */
export function createInput(canvas, renderer, onGesture) {
  const held = new Set();
  let confirmQueued = false;
  let muteQueued = false;
  let click = null;

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (CONFIRM.has(event.code) && !event.repeat) confirmQueued = true;
    if (MUTE.has(event.code) && !event.repeat) muteQueued = true;
    if (CLIMB.has(event.code) || DIVE.has(event.code) || YAW_LEFT.has(event.code) || YAW_RIGHT.has(event.code) || THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code) || CONFIRM.has(event.code)) {
      event.preventDefault();
    }
    if (onGesture) onGesture();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const clientPoint = { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
    click = renderer.toCanvasPoint(clientPoint.x, clientPoint.y);
    if (onGesture) onGesture();
  });

  function axis(negativeSet, positiveSet) {
    const negative = [...negativeSet].some((code) => held.has(code));
    const positive = [...positiveSet].some((code) => held.has(code));
    return (positive ? 1 : 0) - (negative ? 1 : 0);
  }

  return {
    /** The flight stick: pitch (climb +1 / dive -1), yaw and throttle, each -1, 0 or 1. */
    flightControls() {
      return {
        pitch: axis(DIVE, CLIMB),
        yaw: axis(YAW_LEFT, YAW_RIGHT),
        throttle: axis(THROTTLE_DOWN, THROTTLE_UP),
      };
    },
    /** True at most once per press of Space, Enter or a click. */
    takeConfirm() {
      const taken = confirmQueued;
      confirmQueued = false;
      return taken;
    },
    /** The last click's point in FIELD coordinates, or null; consumed on read. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    /** True at most once per press of M. */
    takeMuteToggle() {
      const taken = muteQueued;
      muteQueued = false;
      return taken;
    },
  };
}

/** Hit test helper shared by main.js's menu handlers: is (x, y) inside this rectangle? */
export function pointInRect(point, x, y, width, height) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

/** Hit test helper for round click targets, such as an island marker on the harbour's chart. */
export function pointInCircle(point, x, y, radius) {
  const dx = point.x - x;
  const dy = point.y - y;
  return dx * dx + dy * dy <= radius * radius;
}
