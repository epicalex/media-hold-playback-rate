import { MediaUIAttributes, MediaUIEvents } from 'media-chrome/constants.js';

const Attributes = {
  COMPACT: 'compact',
  DISABLED: 'disabled',
  DISPLAY_MODE: 'display-mode',
  HOLD_DELAY: 'hold-delay',
  HORIZONTAL_THRESHOLD: 'horizontal-threshold',
  IDLE_DELAY: 'idle-delay',
  MEDIA_CONTROLLER: 'mediacontroller',
  MENU: 'menu',
  LOCKED: 'locked',
  RATES: 'rates',
  VERTICAL_THRESHOLD: 'vertical-threshold',
} as const;

const DEFAULT_RATES = [1.25, 1.5, 1.75, 2];
const DEFAULT_HOLD_DELAY = 280;
const DEFAULT_IDLE_DELAY = 1400;
const DEFAULT_VERTICAL_THRESHOLD = 24;
const DEFAULT_HORIZONTAL_THRESHOLD = 72;
const DEFAULT_RATE = 1;
const DEFAULT_HOLD_RATE = 2;
const STACK_ITEM_HEIGHT = 32;
const STACK_GAP = 6;
const STACK_PADDING = 12;
const STACK_HINT_HEIGHT = 20;
const COMPACT_HEIGHT_RATIO = 0.72;

type MediaControllerLike = HTMLElement & {
  associateElement?: (element: HTMLElement) => void;
  unassociateElement?: (element: HTMLElement) => void;
};

type Point = {
  x: number;
  y: number;
};

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    :host {
      display: var(--media-hold-playback-rate-display, block);
      position: absolute;
      inset: 0;
      z-index: var(--media-hold-playback-rate-z-index, 1);
      box-sizing: border-box;
      color: var(--media-hold-playback-rate-color, white);
      font: var(--media-font, 500 14px/1.2 system-ui, sans-serif);
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }

    :host([hidden]) {
      display: none;
    }

    :host([disabled]) {
      pointer-events: none;
    }

    .overlay {
      position: absolute;
      inset-block: 50% auto;
      inset-inline-start: var(--media-hold-playback-rate-inline-offset, 16px);
      display: grid;
      gap: var(--media-hold-playback-rate-gap, 6px);
      min-width: var(--media-hold-playback-rate-menu-width, 72px);
      padding: var(--media-hold-playback-rate-menu-padding, 6px);
      border-radius: var(--media-hold-playback-rate-menu-border-radius, 8px);
      background: var(--media-hold-playback-rate-menu-background, rgb(20 20 20 / 72%));
      opacity: 0;
      pointer-events: none;
      transform: translate3d(-8px, -50%, 0);
      transition:
        opacity 180ms ease,
        transform 180ms ease;
      backdrop-filter: blur(16px);
    }

    :host([menu]) .overlay {
      opacity: 1;
      transform: translate3d(0, -50%, 0);
    }

    .rates {
      display: grid;
      grid-auto-flow: row;
      gap: var(--media-hold-playback-rate-gap, 6px);
    }

    .rate {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: var(--media-hold-playback-rate-item-size, 32px);
      padding: 0 var(--media-hold-playback-rate-item-inline-padding, 10px);
      border: 0;
      border-radius: var(--media-hold-playback-rate-item-border-radius, 6px);
      background: transparent;
      color: inherit;
      font: inherit;
    }

    :host([compact]) .overlay {
      width: var(--media-hold-playback-rate-compact-menu-width, 72px);
      min-width: var(--media-hold-playback-rate-compact-menu-width, 72px);
      padding: var(--media-hold-playback-rate-compact-menu-padding, 8px 10px);
    }

    :host([compact]) .rates {
      display: block;
    }

    :host([compact]) .rate {
      display: none;
      min-height: var(--media-hold-playback-rate-compact-item-size, 44px);
      width: 100%;
      min-width: 0;
      padding: 0;
      font-size: var(--media-hold-playback-rate-compact-font-size, 20px);
      font-weight: 700;
      white-space: nowrap;
    }

    :host([compact]) .rate[aria-current='true'] {
      display: inline-flex;
    }

    .rate[aria-current='true'] {
      background: var(--media-hold-playback-rate-active-background, rgb(255 255 255 / 22%));
    }

    :host([locked]) .rate[aria-current='true'] {
      background: var(--media-hold-playback-rate-locked-background, rgb(80 190 255 / 34%));
    }

    .lock-hint {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: 24px;
      color: var(--media-hold-playback-rate-hint-color, rgb(255 255 255 / 78%));
    }

    :host([compact]) .lock-hint {
      min-height: 18px;
    }

    .lock-track {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 1fr;
      width: var(--media-hold-playback-rate-lock-track-width, 42px);
      padding: 2px;
      border-radius: 999px;
      background: var(--media-hold-playback-rate-lock-track-background, rgb(255 255 255 / 14%));
    }

    .lock-track::before {
      content: "";
      position: absolute;
      inset-block: 2px;
      inset-inline-start: 2px;
      width: calc((100% - 4px) / 2);
      border-radius: inherit;
      background: var(--media-hold-playback-rate-lock-thumb-background, rgb(255 255 255 / 24%));
      transform: translateX(0);
      transition: transform 160ms ease;
    }

    :host([locked]) .lock-track::before {
      transform: translateX(100%);
      background: var(--media-hold-playback-rate-lock-thumb-locked-background, rgb(80 190 255 / 42%));
    }

    @media (prefers-reduced-motion: reduce) {
      .overlay,
      .lock-track::before {
        transition: none;
      }
    }

    .lock-state {
      position: relative;
      z-index: 1;
      display: inline-grid;
      place-items: center;
      min-width: 19px;
      min-height: 18px;
      opacity: 0.58;
    }

    .lock-state[data-active='true'] {
      opacity: 1;
    }

    .lock-hint svg {
      display: block;
      width: var(--media-hold-playback-rate-hint-icon-size, 14px);
      height: var(--media-hold-playback-rate-hint-icon-size, 14px);
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    :host([compact]) .lock-hint svg {
      width: var(--media-hold-playback-rate-compact-hint-icon-size, 12px);
      height: var(--media-hold-playback-rate-compact-hint-icon-size, 12px);
    }

    :host([compact]) .lock-track {
      width: var(--media-hold-playback-rate-compact-lock-track-width, 38px);
    }

    .definition-slot {
      display: none;
    }
  </style>

  <div class="overlay" part="overlay" aria-hidden="true">
    <div class="rates" part="rates"></div>
    <div class="lock-hint" part="lock-hint"></div>
  </div>
  <slot class="definition-slot" name="rate"></slot>
`;

const lockIconSvg = /* html */ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2"></rect>
    <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
  </svg>
`;

const unlockIconSvg = /* html */ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2"></rect>
    <path d="M8 11V8a4 4 0 0 1 7.5-2"></path>
  </svg>
`;

export class MediaHoldPlaybackRate extends HTMLElement {
  static get observedAttributes() {
    return [
      Attributes.DISABLED,
      Attributes.DISPLAY_MODE,
      Attributes.HOLD_DELAY,
      Attributes.HORIZONTAL_THRESHOLD,
      Attributes.IDLE_DELAY,
      Attributes.MEDIA_CONTROLLER,
      Attributes.RATES,
      Attributes.VERTICAL_THRESHOLD,
      MediaUIAttributes.MEDIA_PLAYBACK_RATE,
    ];
  }

  #activePointerId: number | null = null;
  #holdTimer = 0;
  #idleTimer = 0;
  #isHolding = false;
  #selectionFrozen = false;
  #unlockGuardActive = false;
  #locked = false;
  #mediaController: MediaControllerLike | null = null;
  #origin: Point | null = null;
  #horizontalAnchor: Point | null = null;
  #selectionAnchor: Point | null = null;
  #lastPoint: Point | null = null;
  #lastChosenRate = DEFAULT_HOLD_RATE;
  #selectedRate = DEFAULT_HOLD_RATE;
  #rates = DEFAULT_RATES;
  #resizeObserver: ResizeObserver | null = null;
  #rateSlot: HTMLSlotElement;
  #ratesEl: HTMLElement;
  #lockHintEl: HTMLElement;

  constructor() {
    super();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = template.innerHTML;
    }

    const root = this.shadowRoot;
    const rateSlot = root?.querySelector<HTMLSlotElement>('slot[name="rate"]');
    const ratesEl = root?.querySelector<HTMLElement>('.rates');
    const lockHintEl = root?.querySelector<HTMLElement>('.lock-hint');

    if (!rateSlot || !ratesEl || !lockHintEl) {
      throw new Error('media-hold-playback-rate template was not initialized.');
    }

    this.#rateSlot = rateSlot;
    this.#ratesEl = ratesEl;
    this.#lockHintEl = lockHintEl;
  }

  connectedCallback() {
    this.#rateSlot.addEventListener('slotchange', this);
    this.addEventListener('pointerdown', this);
    this.addEventListener('contextmenu', this);
    this.#associateController();
    this.#syncRates();
    this.#observeSize();
    this.#render();
  }

  disconnectedCallback() {
    this.#rateSlot.removeEventListener('slotchange', this);
    this.removeEventListener('pointerdown', this);
    this.removeEventListener('contextmenu', this);
    this.#removeWindowListeners();
    this.#clearTimers();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#unassociateController();
  }

  attributeChangedCallback(name: string, oldValue: string | null) {
    if (name === Attributes.MEDIA_CONTROLLER && this.isConnected) {
      this.#unassociateController();
      this.#associateController();
      return;
    }

    if (name === Attributes.RATES && this.isConnected) {
      this.#syncRates();
      this.#render();
      return;
    }

    if (name === Attributes.DISPLAY_MODE && this.isConnected) {
      this.#updateDisplayMode();
      return;
    }

    if (name === MediaUIAttributes.MEDIA_PLAYBACK_RATE && oldValue !== null) {
      this.#render();
    }
  }

  handleEvent(event: Event) {
    if (event.type === 'slotchange') {
      this.#syncRates();
      this.#render();
      return;
    }

    if (event.type === 'pointerdown') this.#handlePointerDown(event as PointerEvent);
    if (event.type === 'pointermove') this.#handlePointerMove(event as PointerEvent);
    if (event.type === 'pointerup') this.#handlePointerUp(event as PointerEvent);
    if (event.type === 'pointercancel') this.#handlePointerCancel(event as PointerEvent);
    if (event.type === 'contextmenu') this.#handleContextMenu(event);
  }

  get disabled() {
    return this.hasAttribute(Attributes.DISABLED);
  }

  set disabled(value: boolean) {
    this.toggleAttribute(Attributes.DISABLED, value);
  }

  get rates() {
    return [...this.#rates];
  }

  set rates(value: ArrayLike<number> | string | null | undefined) {
    if (!value) {
      this.removeAttribute(Attributes.RATES);
      return;
    }
    this.setAttribute(
      Attributes.RATES,
      typeof value === 'string' ? value : Array.from(value).join(' ')
    );
  }

  get mediaPlaybackRate() {
    return readNumberAttr(this, MediaUIAttributes.MEDIA_PLAYBACK_RATE, DEFAULT_RATE);
  }

  get displayMode() {
    return this.getAttribute(Attributes.DISPLAY_MODE) ?? 'auto';
  }

  set displayMode(value: string | null | undefined) {
    if (!value || value === 'auto') {
      this.removeAttribute(Attributes.DISPLAY_MODE);
      return;
    }

    this.setAttribute(Attributes.DISPLAY_MODE, value);
  }

  set mediaPlaybackRate(value: number) {
    setNumberAttr(this, MediaUIAttributes.MEDIA_PLAYBACK_RATE, value);
  }

  get locked() {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = Boolean(value);
    this.toggleAttribute(Attributes.LOCKED, this.#locked);
    this.#render();
  }

  get holdDelay() {
    return readNumberAttr(this, Attributes.HOLD_DELAY, DEFAULT_HOLD_DELAY);
  }

  set holdDelay(value: number) {
    setNumberAttr(this, Attributes.HOLD_DELAY, value);
  }

  get idleDelay() {
    return readNumberAttr(this, Attributes.IDLE_DELAY, DEFAULT_IDLE_DELAY);
  }

  set idleDelay(value: number) {
    setNumberAttr(this, Attributes.IDLE_DELAY, value);
  }

  get verticalThreshold() {
    return readNumberAttr(
      this,
      Attributes.VERTICAL_THRESHOLD,
      DEFAULT_VERTICAL_THRESHOLD
    );
  }

  set verticalThreshold(value: number) {
    setNumberAttr(this, Attributes.VERTICAL_THRESHOLD, value);
  }

  get horizontalThreshold() {
    return readNumberAttr(
      this,
      Attributes.HORIZONTAL_THRESHOLD,
      DEFAULT_HORIZONTAL_THRESHOLD
    );
  }

  set horizontalThreshold(value: number) {
    setNumberAttr(this, Attributes.HORIZONTAL_THRESHOLD, value);
  }

  #handlePointerDown(event: PointerEvent) {
    if (this.disabled || this.#activePointerId !== null) return;
    if (event.pointerType && event.pointerType !== 'touch') return;
    if (isInteractiveEventTarget(event)) return;

    this.#activePointerId = event.pointerId;
    this.#origin = { x: event.clientX, y: event.clientY };
    this.#horizontalAnchor = this.#origin;
    this.#selectionAnchor = null;
    this.#lastPoint = this.#origin;
    this.#isHolding = false;
    this.#selectionFrozen = false;
    this.#unlockGuardActive = false;
    this.#clearTimers();
    try {
      this.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic tests and some embedded players may not expose capture for this id.
    }
    window.addEventListener('pointermove', this);
    window.addEventListener('pointerup', this);
    window.addEventListener('pointercancel', this);

    this.#holdTimer = window.setTimeout(() => {
      this.#isHolding = true;
      this.#selectedRate = this.#nearestRate(this.#lastChosenRate);
      if (!this.#locked) {
        this.#requestPlaybackRate(this.#selectedRate);
      }
      this.#applyMenuIntentFromPoint(this.#lastPoint);
      this.#render();
    }, this.holdDelay);
  }

  #handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== this.#activePointerId || !this.#origin) return;

    const point = { x: event.clientX, y: event.clientY };
    const deltaY = point.y - this.#origin.y;
    const horizontalDeltaX = point.x - (this.#horizontalAnchor?.x ?? this.#origin.x);
    this.#lastPoint = point;

    if (!this.#isHolding) {
      return;
    }

    if (this.#locked && horizontalDeltaX <= -this.horizontalThreshold) {
      this.locked = false;
      this.#selectionFrozen = false;
      this.#unlockGuardActive = true;
      this.#horizontalAnchor = point;
      this.#selectionAnchor = point;
      this.#requestPlaybackRate(DEFAULT_RATE);
      this.#showMenu();
      this.#scheduleMenuFade();
      return;
    }

    if (this.#unlockGuardActive) {
      if (point.x < (this.#horizontalAnchor?.x ?? point.x)) {
        this.#horizontalAnchor = point;
      }

      if (
        point.x - (this.#horizontalAnchor?.x ?? point.x) >=
        this.horizontalThreshold
      ) {
        this.#unlockGuardActive = false;
      }
    }

    if (
      horizontalDeltaX >= this.horizontalThreshold &&
      !this.#selectionFrozen &&
      !this.#unlockGuardActive
    ) {
      this.locked = true;
      this.#lastChosenRate = this.#selectedRate;
      this.#selectionFrozen = true;
      this.#horizontalAnchor = point;
      this.#requestPlaybackRate(this.#selectedRate);
      this.#showMenu();
      this.#scheduleMenuFade();
      return;
    }

    this.#applyMenuIntentFromPoint(point);
  }

  #handlePointerUp(event: PointerEvent) {
    if (event.pointerId !== this.#activePointerId) return;

    if (this.#isHolding && !this.#locked) {
      this.#requestPlaybackRate(DEFAULT_RATE);
    }

    this.#resetGesture();
  }

  #handlePointerCancel(event: PointerEvent) {
    if (event.pointerId !== this.#activePointerId) return;

    if (this.#isHolding && !this.#locked) {
      this.#requestPlaybackRate(DEFAULT_RATE);
    }

    this.#resetGesture();
  }

  #handleContextMenu(event: Event) {
    if (this.disabled) return;

    event.preventDefault();
  }

  #showMenu() {
    this.setAttribute(Attributes.MENU, '');
    this.#render();
  }

  #applyMenuIntentFromPoint(point: Point | null) {
    if (!point || !this.#origin) return;

    const deltaY = point.y - this.#origin.y;
    const shouldShowMenu =
      Math.abs(deltaY) >= this.verticalThreshold || this.hasAttribute(Attributes.MENU);

    if (!shouldShowMenu) return;

    this.#showMenu();
    if (!this.#selectionFrozen) {
      this.#selectRateFromMovement(point);
    }
    this.#scheduleMenuFade();
  }

  #hideMenu() {
    this.removeAttribute(Attributes.MENU);
  }

  #scheduleMenuFade() {
    window.clearTimeout(this.#idleTimer);
    this.#idleTimer = window.setTimeout(() => this.#hideMenu(), this.idleDelay);
  }

  #selectRateFromMovement(point: Point) {
    if (!this.#selectionAnchor) {
      this.#selectionAnchor = point;
      return;
    }

    const deltaY = point.y - this.#selectionAnchor.y;
    const stepCount = Math.trunc(deltaY / this.verticalThreshold);
    if (stepCount === 0) return;

    const currentIndex = this.#rates.indexOf(this.#selectedRate);
    const nextIndex = clamp(
      currentIndex + stepCount,
      0,
      this.#rates.length - 1
    );
    const rate = this.#rates[nextIndex] ?? this.#selectedRate;
    this.#selectionAnchor = {
      x: point.x,
      y: this.#selectionAnchor.y + stepCount * this.verticalThreshold,
    };

    if (rate !== this.#selectedRate) {
      this.#selectedRate = rate;
      this.#lastChosenRate = rate;
      this.#requestPlaybackRate(rate);
      this.#render();
    }
  }

  #requestPlaybackRate(rate: number) {
    this.dispatchEvent(
      new CustomEvent(MediaUIEvents.MEDIA_PLAYBACK_RATE_REQUEST, {
        bubbles: true,
        composed: true,
        detail: rate,
      })
    );
  }

  #syncRates() {
    const slottedRates = this.#rateSlot
      .assignedElements({ flatten: true })
      .map(readRateFromElement)
      .filter(isFiniteNumber);

    const attrRates = (this.getAttribute(Attributes.RATES) ?? '')
      .split(/\s+/)
      .map((rate) => Number(rate))
      .filter(isFiniteNumber);

    const sourceRates = slottedRates.length ? slottedRates : attrRates;
    const nextRates = sourceRates.length ? sourceRates : DEFAULT_RATES;

    this.#rates = [...new Set(nextRates)]
      .filter((rate) => rate > 0)
      .sort((a, b) => a - b);
    this.#selectedRate = this.#nearestRate(this.#selectedRate);
    this.#lastChosenRate = this.#nearestRate(this.#lastChosenRate);
    this.#updateDisplayMode();
  }

  #nearestRate(rate: number) {
    return this.#rates.reduce((nearest, candidate) => {
      return Math.abs(candidate - rate) < Math.abs(nearest - rate)
        ? candidate
        : nearest;
    }, this.#rates[0] ?? DEFAULT_HOLD_RATE);
  }

  #render() {
    const activeRate = this.#nearestRate(this.#selectedRate || this.mediaPlaybackRate);
    this.#ratesEl.replaceChildren(
      ...this.#rates.map((rate) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rate';
        button.part.add('rate');
        if (rate === activeRate) {
          button.part.add('active-rate');
          button.setAttribute('aria-current', 'true');
        }
        button.textContent = `${normalizeRate(rate)}x`;
        button.tabIndex = -1;
        return button;
      })
    );
    this.#lockHintEl.setAttribute(
      'aria-label',
      this.#locked ? 'Slide left to unlock' : 'Slide right to lock'
    );
    this.#lockHintEl.innerHTML = /* html */ `
      <span class="lock-track" part="lock-track">
        <span class="lock-state" part="unlock-icon" data-active="${!this.#locked}">
          ${unlockIconSvg}
        </span>
        <span class="lock-state" part="lock-icon" data-active="${this.#locked}">
          ${lockIconSvg}
        </span>
      </span>
    `;
  }

  #observeSize() {
    if (!('ResizeObserver' in window)) {
      this.#updateDisplayMode();
      return;
    }

    this.#resizeObserver = new ResizeObserver(() => this.#updateDisplayMode());
    this.#resizeObserver.observe(this);
    this.#updateDisplayMode();
  }

  #updateDisplayMode() {
    const mode = this.displayMode;

    if (mode === 'compact') {
      this.toggleAttribute(Attributes.COMPACT, true);
      return;
    }

    if (mode === 'stack') {
      this.toggleAttribute(Attributes.COMPACT, false);
      return;
    }

    const availableHeight = this.getBoundingClientRect().height;
    const estimatedStackHeight =
      this.#rates.length * STACK_ITEM_HEIGHT +
      Math.max(0, this.#rates.length - 1) * STACK_GAP +
      STACK_PADDING * 2 +
      STACK_HINT_HEIGHT;

    this.toggleAttribute(
      Attributes.COMPACT,
      availableHeight > 0 &&
        estimatedStackHeight > availableHeight * COMPACT_HEIGHT_RATIO
    );
  }

  #associateController() {
    const controllerId = this.getAttribute(Attributes.MEDIA_CONTROLLER);
    if (!controllerId) return;

    const root = this.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return;

    this.#mediaController = root.getElementById(
      controllerId
    ) as MediaControllerLike | null;
    this.#mediaController?.associateElement?.(this);
  }

  #unassociateController() {
    this.#mediaController?.unassociateElement?.(this);
    this.#mediaController = null;
  }

  #removeWindowListeners() {
    window.removeEventListener('pointermove', this);
    window.removeEventListener('pointerup', this);
    window.removeEventListener('pointercancel', this);
  }

  #clearTimers() {
    window.clearTimeout(this.#holdTimer);
    window.clearTimeout(this.#idleTimer);
  }

  #resetGesture() {
    if (this.#activePointerId !== null) {
      try {
        this.releasePointerCapture?.(this.#activePointerId);
      } catch {
        // Pointer capture may already be gone after cancellation or synthetic events.
      }
    }
    this.#removeWindowListeners();
    this.#clearTimers();
    this.#hideMenu();
    this.#activePointerId = null;
    this.#origin = null;
    this.#horizontalAnchor = null;
    this.#selectionAnchor = null;
    this.#lastPoint = null;
    this.#isHolding = false;
    this.#selectionFrozen = false;
    this.#unlockGuardActive = false;
  }
}

function readRateFromElement(element: Element) {
  const value = element.getAttribute('value') ?? element.textContent ?? '';
  return Number.parseFloat(value);
}

function isInteractiveEventTarget(event: Event) {
  return event.composedPath().some((target) => {
    if (!(target instanceof Element)) return false;

    return Boolean(
      target.closest(
        [
          'a[href]',
          'button',
          'input',
          'select',
          'textarea',
          'summary',
          '[role="button"]',
          '[role="slider"]',
          '[role="menuitem"]',
          '[contenteditable="true"]',
          'media-control-bar',
          'media-time-range',
        ].join(',')
      )
    );
  });
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function readNumberAttr(element: Element, attrName: string, defaultValue: number) {
  const attrValue = element.getAttribute(attrName);
  if (attrValue == null || attrValue === '') return defaultValue;

  const value = Number(attrValue);
  return Number.isFinite(value) ? value : defaultValue;
}

function setNumberAttr(element: Element, attrName: string, value: number) {
  if (value == null || Number.isNaN(Number(value))) {
    element.removeAttribute(attrName);
    return;
  }
  element.setAttribute(attrName, `${Number(value)}`);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRate(rate: number) {
  return Math.round(rate * 100) / 100;
}

declare global {
  interface HTMLElementTagNameMap {
    'media-hold-playback-rate': MediaHoldPlaybackRate;
  }
}

if (!customElements.get('media-hold-playback-rate')) {
  customElements.define('media-hold-playback-rate', MediaHoldPlaybackRate);
}

export default MediaHoldPlaybackRate;
