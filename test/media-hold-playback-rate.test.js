import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../dist/index.js';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

function pointer(
  target,
  type,
  { x = 100, y = 100, pointerId = 1, pointerType = 'touch' } = {}
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId,
      pointerType,
    })
  );
}

describe('media-hold-playback-rate', () => {
  it('uses documented numeric defaults when attributes are absent', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate></media-hold-playback-rate>
    `);

    expect(el.holdDelay).to.equal(280);
    expect(el.idleDelay).to.equal(1400);
    expect(el.verticalThreshold).to.equal(24);
    expect(el.horizontalThreshold).to.equal(72);
  });

  it('uses slotted rates before the rates attribute', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate rates="1.5 2">
        <button slot="rate" value="1.25">1.25x</button>
        <button slot="rate" value="1.75">1.75x</button>
      </media-hold-playback-rate>
    `);

    await tick();

    expect(el.rates).to.deep.equal([1.25, 1.75]);
  });

  it('lays out the speed menu vertically', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        menu
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const buttons = [...el.shadowRoot.querySelectorAll('.rate')];
    const rects = buttons.map((button) => button.getBoundingClientRect());

    expect(buttons).to.have.length(4);
    expect(rects[1].top).to.be.greaterThan(rects[0].top);
    expect(rects[2].top).to.be.greaterThan(rects[1].top);
    expect(rects[3].top).to.be.greaterThan(rects[2].top);
  });

  it('can force compact display mode', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        menu
        display-mode="compact"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const buttons = [...el.shadowRoot.querySelectorAll('.rate')];
    const visibleButtons = buttons.filter(
      (button) => getComputedStyle(button).display !== 'none'
    );

    expect(el.hasAttribute('compact')).to.equal(true);
    expect(visibleButtons).to.have.length(1);
    expect(visibleButtons[0].textContent).to.equal('2x');
  });

  it('renders icon-only lock hints with accessible labels', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate menu></media-hold-playback-rate>
    `);
    const hint = el.shadowRoot.querySelector('.lock-hint');

    expect(hint.textContent.trim()).to.equal('');
    expect(hint.getAttribute('aria-label')).to.equal('Slide right to lock');
    expect(hint.querySelectorAll('svg')).to.have.length(2);
    expect(hint.querySelector('[part="unlock-icon"]').dataset.active).to.equal(
      'true'
    );

    el.locked = true;

    expect(hint.getAttribute('aria-label')).to.equal('Slide left to unlock');
    expect(hint.querySelectorAll('svg')).to.have.length(2);
    expect(hint.querySelector('[part="lock-icon"]').dataset.active).to.equal(
      'true'
    );
  });

  it('keeps compact overlay width stable as the active speed changes', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        display-mode="compact"
        hold-delay="1"
        vertical-threshold="10"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const overlay = el.shadowRoot.querySelector('.overlay');

    pointer(el, 'pointerdown', { y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { y: 100 });
    const widthAt2x = Math.round(overlay.getBoundingClientRect().width);
    pointer(window, 'pointermove', { y: 90 });
    const widthAt175x = Math.round(overlay.getBoundingClientRect().width);
    pointer(window, 'pointermove', { y: 80 });
    const widthAt15x = Math.round(overlay.getBoundingClientRect().width);

    expect(widthAt2x).to.equal(widthAt175x);
    expect(widthAt175x).to.equal(widthAt15x);
  });

  it('can force stack display mode', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        menu
        display-mode="stack"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);

    expect(el.hasAttribute('compact')).to.equal(false);
  });

  it('switches to compact display mode when player height is limited', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        style="display: block; position: relative; height: 120px;"
        menu
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);

    await tick();

    expect(el.hasAttribute('compact')).to.equal(true);
  });

  it('starts temporary playback after a hold without revealing the menu', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate hold-delay="1"></media-hold-playback-rate>
    `);
    const eventPromise = oneEvent(el, 'mediaplaybackraterequest');

    pointer(el, 'pointerdown');
    const event = await eventPromise;

    expect(event).to.have.property('detail', 2);
    expect(el.hasAttribute('menu')).to.equal(false);
  });

  it('does not start the gesture from interactive targets', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate hold-delay="1">
        <button id="button">Button</button>
      </media-hold-playback-rate>
    `);
    const button = el.querySelector('#button');
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(button, 'pointerdown');
    await tick(5);
    pointer(window, 'pointermove', { x: 130 });

    expect(events).to.deep.equal([]);
  });

  it('reveals the menu after vertical movement and selects a rate', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    pointer(el, 'pointerdown', { y: 200 });
    await tick(5);

    const eventPromise = oneEvent(el, 'mediaplaybackraterequest');
    pointer(window, 'pointermove', { y: 40 });
    pointer(window, 'pointermove', { y: 30 });
    const event = await eventPromise;

    expect(el.hasAttribute('menu')).to.equal(true);
    expect(event).to.have.property('detail', 1.75);
  });

  it('reveals the menu when vertical movement starts before the hold delay completes', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="20"
        idle-delay="1000"
        vertical-threshold="10"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    pointer(el, 'pointerdown', { y: 200 });
    pointer(window, 'pointermove', { y: 40 });
    await tick(30);

    expect(el.hasAttribute('menu')).to.equal(true);
  });

  it('reveals the menu without jumping to an absolute screen-bin rate', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        vertical-threshold="10"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { y: 300 });
    await tick(5);
    pointer(window, 'pointermove', { y: 20 });

    expect(el.hasAttribute('menu')).to.equal(true);
    expect(events).to.deep.equal([2]);
  });

  it('uses relative movement: up slows down and down speeds up', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        vertical-threshold="10"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { y: 100 });
    pointer(window, 'pointermove', { y: 90 });
    pointer(window, 'pointermove', { y: 100 });

    expect(events).to.deep.equal([2, 1.75, 2]);
  });

  it('restores 1x on release when unlocked', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate hold-delay="1"></media-hold-playback-rate>
    `);

    pointer(el, 'pointerdown');
    await oneEvent(el, 'mediaplaybackraterequest');

    const eventPromise = oneEvent(el, 'mediaplaybackraterequest');
    pointer(window, 'pointerup');
    const event = await eventPromise;

    expect(event).to.have.property('detail', 1);
  });

  it('locks on right slide while the menu is open', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        vertical-threshold="10"
        horizontal-threshold="20"
      ></media-hold-playback-rate>
    `);

    pointer(el, 'pointerdown', { x: 100, y: 100 });
    await tick(5);
    pointer(window, 'pointermove', { x: 100, y: 40 });
    pointer(window, 'pointermove', { x: 130, y: 40 });

    expect(el.locked).to.equal(true);
    expect(el.hasAttribute('locked')).to.equal(true);
  });

  it('locks on right slide without first changing speed', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        horizontal-threshold="20"
      ></media-hold-playback-rate>
    `);
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 100 });
    await tick(5);
    pointer(window, 'pointermove', { x: 121, y: 100 });

    expect(el.locked).to.equal(true);
    expect(el.hasAttribute('menu')).to.equal(true);
    expect(events).to.deep.equal([2, 2]);
  });

  it('unlocks on left slide without first changing speed', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        horizontal-threshold="20"
      ></media-hold-playback-rate>
    `);
    el.locked = true;

    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 100 });
    await tick(5);
    pointer(window, 'pointermove', { x: 79, y: 100 });

    expect(el.locked).to.equal(false);
    expect(el.hasAttribute('menu')).to.equal(true);
    expect(events).to.deep.equal([1]);
  });

  it('does not change speed from vertical movement after locking', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        horizontal-threshold="20"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { x: 100, y: 40 });
    pointer(window, 'pointermove', { x: 100, y: 30 });
    pointer(window, 'pointermove', { x: 130, y: 40 });
    pointer(window, 'pointermove', { x: 130, y: 360 });

    expect(el.locked).to.equal(true);
    expect(events).to.deep.equal([2, 1.75, 1.75]);
  });

  it('keeps playback locked after release', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate hold-delay="1"></media-hold-playback-rate>
    `);
    el.locked = true;

    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown');
    await tick(5);
    pointer(window, 'pointerup');

    expect(events).to.deep.equal([]);
  });

  it('unlocks on left slide during a locked long press', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        horizontal-threshold="20"
      ></media-hold-playback-rate>
    `);
    el.locked = true;

    const eventPromise = oneEvent(el, 'mediaplaybackraterequest');
    pointer(el, 'pointerdown', { x: 100 });
    await tick(5);
    pointer(window, 'pointermove', { x: 70 });
    const event = await eventPromise;

    expect(el.locked).to.equal(false);
    expect(el.hasAttribute('menu')).to.equal(true);
    expect(event).to.have.property('detail', 1);
  });

  it('does not hide when continuing left after unlocking', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        horizontal-threshold="20"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    el.locked = true;

    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { x: 70, y: 200 });
    pointer(window, 'pointermove', { x: 40, y: 40 });

    expect(el.locked).to.equal(false);
    expect(el.hasAttribute('menu')).to.equal(true);
    expect(events).to.deep.equal([1, 1.25]);
  });

  it('allows speed changes after unlocking while the finger is still left', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        horizontal-threshold="20"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    el.locked = true;

    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { x: 70, y: 200 });
    pointer(window, 'pointermove', { x: 40, y: 40 });
    pointer(window, 'pointermove', { x: 40, y: 30 });

    expect(el.locked).to.equal(false);
    expect(events).to.deep.equal([1, 1.25]);
  });

  it('relocks from a relative horizontal movement after overshooting left from unlock', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        horizontal-threshold="20"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    el.locked = true;

    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 300, y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { x: 260, y: 200 });
    pointer(window, 'pointermove', { x: 120, y: 190 });
    pointer(window, 'pointermove', { x: 141, y: 190 });

    expect(el.locked).to.equal(true);
    expect(events).to.deep.equal([1, 1.75, 1.75]);
  });

  it('allows speed changes after locking and unlocking in the same hold', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1000"
        vertical-threshold="10"
        horizontal-threshold="20"
        rates="1.25 1.5 1.75 2"
      ></media-hold-playback-rate>
    `);
    const events = [];
    el.addEventListener('mediaplaybackraterequest', (event) => {
      events.push(event.detail);
    });

    pointer(el, 'pointerdown', { x: 100, y: 200 });
    await tick(5);
    pointer(window, 'pointermove', { x: 100, y: 100 });
    pointer(window, 'pointermove', { x: 100, y: 90 });
    pointer(window, 'pointermove', { x: 130, y: 90 });
    pointer(window, 'pointermove', { x: 100, y: 90 });
    pointer(window, 'pointermove', { x: 90, y: 80 });

    expect(el.locked).to.equal(false);
    expect(events).to.deep.equal([2, 1.75, 1.75, 1, 1.5]);
  });

  it('fades the menu after idle delay', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate
        hold-delay="1"
        idle-delay="1"
        vertical-threshold="10"
      ></media-hold-playback-rate>
    `);

    pointer(el, 'pointerdown', { y: 100 });
    await tick(5);
    pointer(window, 'pointermove', { y: 40 });
    expect(el.hasAttribute('menu')).to.equal(true);

    await tick(5);
    expect(el.hasAttribute('menu')).to.equal(false);
  });

  it('emits composed bubbling playback-rate requests', async () => {
    const host = await fixture(html`
      <div>
        <media-hold-playback-rate hold-delay="1"></media-hold-playback-rate>
      </div>
    `);
    const el = host.querySelector('media-hold-playback-rate');
    const eventPromise = oneEvent(host, 'mediaplaybackraterequest');

    pointer(el, 'pointerdown');
    const event = await eventPromise;

    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
    expect(event.detail).to.equal(2);
  });

  it('prevents the native context menu while enabled', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate></media-hold-playback-rate>
    `);
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    el.dispatchEvent(event);

    expect(event.defaultPrevented).to.equal(true);
  });

  it('allows the native context menu while disabled', async () => {
    const el = await fixture(html`
      <media-hold-playback-rate disabled></media-hold-playback-rate>
    `);
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    el.dispatchEvent(event);

    expect(event.defaultPrevented).to.equal(false);
  });

  it('associates with a controller referenced by id', async () => {
    const host = await fixture(html`
      <div>
        <div id="controller"></div>
        <media-hold-playback-rate></media-hold-playback-rate>
      </div>
    `);
    const controller = host.querySelector('#controller');
    const el = host.querySelector('media-hold-playback-rate');
    controller.associateElement = (element) => {
      controller.associated = element;
    };

    el.setAttribute('mediacontroller', 'controller');
    await tick();

    expect(controller.associated).to.equal(el);
  });
});
