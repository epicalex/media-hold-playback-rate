# media-hold-playback-rate

A Media Chrome-style custom element for hold-to-speed video playback.

`<media-hold-playback-rate>` brings the mobile “hold to play faster” interaction closer to a full playback-speed control: hold for a temporary speed boost, slide vertically to adjust speed, slide right to lock, and slide left to unlock.

It is designed to work with [Media Chrome](https://www.media-chrome.org/) rather than around it. The element dispatches Media Chrome playback-rate request events and lets `<media-controller>` update media state.

## Why

On mobile video players, hold-to-2x is wonderfully fast. The awkward part is choosing a different speed, or making that speed stick, without diving through settings menus.

This component explores a gesture-first alternative:

- hold to temporarily use your last chosen speed,
- slide up/down to step through available speeds,
- slide right to lock the current speed,
- slide left to unlock,
- release to return to `1x` when unlocked.

## Install

```sh
npm install media-hold-playback-rate media-chrome
```

## Quick Start

```html
<script type="module" src="./node_modules/media-chrome/dist/index.js"></script>
<script
  type="module"
  src="./node_modules/media-hold-playback-rate/dist/index.js"
></script>

<media-controller>
  <video slot="media" src="video.mp4" playsinline></video>

  <media-hold-playback-rate>
    <button slot="rate" value="1.25">1.25x</button>
    <button slot="rate" value="1.5">1.5x</button>
    <button slot="rate" value="1.75">1.75x</button>
    <button slot="rate" value="2">2x</button>
  </media-hold-playback-rate>

  <media-control-bar>
    <media-play-button></media-play-button>
    <media-time-range></media-time-range>
    <media-playback-rate-button></media-playback-rate-button>
    <media-fullscreen-button></media-fullscreen-button>
  </media-control-bar>
</media-controller>
```

With a bundler:

```js
import 'media-chrome';
import 'media-hold-playback-rate';
```

## Gesture Model

- Long press starts temporary playback at the last chosen speed. The first default is `2x`.
- The speed menu does not appear from time alone.
- Slide vertically while holding to reveal the menu.
- Speed changes are relative, not based on absolute screen position.
- Moving up steps to slower speeds.
- Moving down steps to faster speeds.
- Slide right while holding to lock the current speed.
- Once locked, vertical movement in that same lock gesture will not change speed.
- Slide left while locked to unlock.
- After unlocking, vertical speed changes are available immediately without lifting your finger.
- Relocking is relative to the current horizontal position, so you do not need to travel back to the original press point.
- The speed UI uses a vertical stack when there is room and switches to a compact single-value display when player height is limited.
- If unlocked, releasing returns playback to `1x`.
- If locked, releasing keeps the selected speed.

Gestures do not start from common interactive targets such as buttons, form controls, sliders, `media-control-bar`, or `media-time-range`. In a typical Media Chrome layout, keep the control bar visually above this gesture layer so timeline dragging and button presses remain normal player interactions.

## Speeds

Prefer slotted rate elements when you want author-controlled markup:

```html
<media-hold-playback-rate>
  <button slot="rate" value="1.25">1.25x</button>
  <button slot="rate" value="1.5">1.5x</button>
  <button slot="rate" value="1.75">1.75x</button>
  <button slot="rate" value="2">2x</button>
</media-hold-playback-rate>
```

Or use the `rates` attribute:

```html
<media-hold-playback-rate rates="1.25 1.5 1.75 2"></media-hold-playback-rate>
```

Slotted `slot="rate"` elements take precedence over `rates`. If neither is provided, the fallback rates are `1.25 1.5 1.75 2`.

## Attributes And Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `rates` | string | `1.25 1.5 1.75 2` | Space-separated fallback playback rates. |
| `display-mode` | string | `auto` | `auto`, `stack`, or `compact`. Auto switches to compact when the player is short. |
| `hold-delay` | number | `280` | Milliseconds before a touch hold starts faster playback. |
| `vertical-threshold` | number | `24` | Pixels of relative vertical movement per speed step. |
| `horizontal-threshold` | number | `72` | Pixels of relative horizontal movement required to lock or unlock. |
| `idle-delay` | number | `1400` | Milliseconds before the open menu fades after movement stops. |
| `mediacontroller` | string | none | Optional id of a `<media-controller>` to associate with. |
| `mediaplaybackrate` | number | `1` | Media Chrome state attribute, normally set by `<media-controller>`. |
| `disabled` | boolean | false | Disables gesture handling. |

The `rates`, `displayMode`, `mediaPlaybackRate`, `locked`, `holdDelay`, `idleDelay`, `verticalThreshold`, and `horizontalThreshold` properties are also available from JavaScript.

## Styling

Parts:

- `overlay`
- `rates`
- `rate`
- `active-rate`
- `lock-hint`
- `lock-track`
- `unlock-icon`
- `lock-icon`

Custom properties:

```css
media-hold-playback-rate {
  --media-hold-playback-rate-z-index: 1;
  --media-hold-playback-rate-inline-offset: 16px;
  --media-hold-playback-rate-menu-width: 72px;
  --media-hold-playback-rate-menu-padding: 8px;
  --media-hold-playback-rate-menu-border-radius: 8px;
  --media-hold-playback-rate-menu-background: rgb(20 20 20 / 72%);
  --media-hold-playback-rate-gap: 6px;
  --media-hold-playback-rate-item-size: 32px;
  --media-hold-playback-rate-item-inline-padding: 10px;
  --media-hold-playback-rate-item-border-radius: 6px;
  --media-hold-playback-rate-active-background: rgb(255 255 255 / 22%);
  --media-hold-playback-rate-locked-background: rgb(80 190 255 / 34%);
  --media-hold-playback-rate-hint-color: rgb(255 255 255 / 78%);
  --media-hold-playback-rate-hint-icon-size: 14px;
  --media-hold-playback-rate-lock-track-width: 42px;
  --media-hold-playback-rate-lock-track-background: rgb(255 255 255 / 14%);
  --media-hold-playback-rate-lock-thumb-background: rgb(255 255 255 / 24%);
  --media-hold-playback-rate-lock-thumb-locked-background: rgb(80 190 255 / 42%);
  --media-hold-playback-rate-compact-menu-width: 72px;
  --media-hold-playback-rate-compact-menu-padding: 8px 10px;
  --media-hold-playback-rate-compact-item-size: 44px;
  --media-hold-playback-rate-compact-font-size: 20px;
  --media-hold-playback-rate-compact-hint-icon-size: 12px;
  --media-hold-playback-rate-compact-lock-track-width: 38px;
}
```

## Media Chrome Integration

This package follows Media Chrome's [design principles](https://www.media-chrome.org/docs/en/design-principles) and [architecture](https://www.media-chrome.org/docs/en/architecture):

- It is a native custom element with a `media-` name.
- It is declarative and independently usable.
- User intent is emitted as composed, bubbling `mediaplaybackraterequest` events.
- It does not directly mutate the media element.
- Media state is reflected through Media Chrome attributes such as `mediaplaybackrate`.
- It works nested inside `<media-controller>` or associated by `mediacontroller`.

## Development

```sh
npm install
npm run check
npm run dev
```

The demo runs from `demo/` with Vite:

```sh
npm run dev
```

Then open `http://127.0.0.1:5173/`.

## Status

This is an experimental v1 gesture component. It is touch-first; mouse and pen gestures are not part of the supported interaction contract yet.

## License

MIT
