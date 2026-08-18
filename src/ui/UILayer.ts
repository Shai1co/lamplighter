/**
 * UILayer — the crisp DOM overlay orchestrator.
 *
 * Owns the whole HTML UI: dialogue, the signature Lumen proxy panel, choices,
 * chapter cards, title screen, save/load, settings, backlog, the pause menu and
 * the credits roll. It is the sole emitter of `input:*` events and subscribes to
 * every `ui:*` / `wait:*` narrative directive. Nothing here reaches into the
 * stage or audio — everything crosses the shared bus.
 */
import './fonts';
import '../styles/reset.css';
import '../styles/tokens.css';
import '../styles/typography.css';
import '../styles/ui.css';

import type {
  AppHost,
  IEmitter,
  IUILayer,
  ResolvedChoice,
  Settings,
  StoryManifest,
  StoryTheme,
} from '../core/types';
import { clear, el, focusables, Icons, overlayShell, rgbTriplet, systemMotionOK } from './dom';
import { CallStrip } from './CallStrip';
import { DialogueBox } from './DialogueBox';
import { ProxyPanel } from './ProxyPanel';
import { ChoiceMenu } from './ChoiceMenu';
import { ChapterCard } from './ChapterCard';
import { Backlog } from './Backlog';
import { SaveLoad } from './SaveLoad';
import { SettingsPanel } from './Settings';
import { TitleScreen } from './TitleScreen';

interface ModalEntry {
  overlay: HTMLElement;
  panel: HTMLElement;
  prevFocus: HTMLElement | null;
}

export class UILayer implements IUILayer {
  private readonly bus: IEmitter;
  private readonly host: AppHost;

  private readonly pq: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly modalLayer: HTMLElement;
  private readonly advanceEl: HTMLElement;
  private readonly waitEl: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly liveEl: HTMLElement;
  private readonly creditsEl: HTMLElement;
  private readonly gradeEl: HTMLElement;
  private readonly atmosEl: HTMLElement;
  private readonly tonePlateEl: HTMLElement;
  private readonly plateEl: HTMLElement;
  private readonly cornerPlateEl: HTMLElement;
  private readonly wallPlateEl: HTMLElement;
  private readonly vignettePlateEl: HTMLElement;

  private readonly dialogue: DialogueBox;
  private readonly callstrip: CallStrip;
  private readonly proxy: ProxyPanel;
  private readonly choices: ChoiceMenu;
  private readonly chapter: ChapterCard;
  private readonly backlog: Backlog;
  private readonly saveload: SaveLoad;
  private readonly settings: SettingsPanel;
  private readonly title: TitleScreen;
  private readonly pause: ReturnType<typeof overlayShell>;
  private readonly about: ReturnType<typeof overlayShell>;

  private settingsState: Settings;
  private readonly unsubs: Array<() => void> = [];
  private readonly modalStack: ModalEntry[] = [];

  private choiceActive = false;
  private choiceOptions: ResolvedChoice[] = [];
  private choiceEls: HTMLElement[] = [];
  private waitActive = false;
  /** Who is currently on stage — drives `.has-cast`. See the subscription. */
  private readonly cast = new Set<string>();
  private narratorLabel: string | undefined;
  private creditsActive = false;
  private creditsDone = false;
  private autoTimer = 0;

  constructor(bus: IEmitter, root: HTMLElement, host: AppHost) {
    this.bus = bus;
    this.host = host;
    this.settingsState = { ...host.getSettings() };

    /* ── DOM shell ── */
    this.advanceEl = el('div', {
      class: 'pq-advance',
      role: 'button',
      tabIndex: -1,
      aria: { label: 'Advance dialogue', hidden: true },
      on: { click: () => this.requestAdvance() },
    });
    this.waitEl = el('div', { class: 'pq-wait', aria: { hidden: true }, hidden: true }, [
      el('span', { class: 'pq-wait__dot' }),
      el('span', { class: 'pq-wait__dot' }),
      el('span', { class: 'pq-wait__dot' }),
    ]);

    this.stage = el('div', { class: 'pq-stagelayer' }, [this.advanceEl, this.waitEl]);

    this.topbar = el('div', { class: 'pq-topbar', hidden: true }, [
      el('button', {
        class: 'pq-iconbtn pq-topbar__menu',
        type: 'button',
        html: Icons.menu,
        aria: { label: 'Menu' },
        on: { click: () => this.togglePauseMenu() },
      }),
    ]);

    this.modalLayer = el('div', { class: 'pq-modallayer' });
    this.creditsEl = el('div', {
      class: 'pq-credits',
      role: 'group',
      aria: { label: 'Credits' },
      hidden: true,
    });
    this.liveEl = el('div', { class: 'pq-sr', aria: { live: 'polite', atomic: 'true' } });

    // Frame-wide grade + emulsion. The power windows go UNDER everything (they
    // are part of the photograph); the grain goes over the render, the
    // composited character and the DOM UI alike, which is what marries three
    // separately-authored layers into one plate. Neither is ever interactive
    // and neither belongs to the reading layer, so they hang off .pq directly
    // and survive a modal taking the frame.
    this.gradeEl = el('div', { class: 'pq-roomgrade', aria: { hidden: true } });
    // Atmosphere: the shaft/haze pass that belongs to the *plate currently on
    // stage* rather than to the story. Keyed off `data-pq-bg` (set from
    // scene:bg below), so a room whose light is a wall of clerestory glass gets
    // shafts and a local-contrast restore, and a room whose light is one desk
    // lamp gets neither.
    this.atmosEl = el('div', { class: 'pq-atmos', aria: { hidden: true } }, [
      // Order is the optical order: the midground is racked off the focal
      // plane FIRST (a defocus is a property of the lens, so it happens before
      // anything a colourist would do), local contrast is restored next (it
      // reads the plate beneath it), the shafts are then laid into the air it
      // just cleared, and the cool wash grades the shadows both of them leave.
      el('span', { class: 'pq-atmos__focus' }),
      el('span', { class: 'pq-atmos__local' }),
      // …then the midground is LIT (the chair back catching the window, the wet
      // floor carrying the city) and the glass behind it is given its bokeh
      // density, because a frame whose middle third has no light in it has no
      // midground at all — just two assets either side of a hole.
      el('span', { class: 'pq-atmos__midlight' }),
      el('span', { class: 'pq-atmos__bokeh' }),
      el('span', { class: 'pq-atmos__shafts' }),
      el('span', { class: 'pq-atmos__cool' }),
    ]);
    // The print's chromatic cast, laid UNDER the emulsion but on the same layer
    // — over the render, the composited portrait and every panel alike, so the
    // whole frame is graded once rather than each surface being graded on its
    // own. See .pq-plate--tone.
    this.tonePlateEl = el('div', {
      class: 'pq-plate pq-plate--tone',
      aria: { hidden: true },
    });
    this.plateEl = el('div', { class: 'pq-plate', aria: { hidden: true } });
    // The corner emulsion is a SIBLING of the plate, never a child: opacity on
    // the plate establishes a compositing group, so a nested field would come
    // out at 3.4% of its own alpha. See .pq-plate--corner.
    this.cornerPlateEl = el('div', {
      class: 'pq-plate pq-plate--corner',
      aria: { hidden: true },
    });
    // …and a third field over the dark wall and ceiling, upper left, where the
    // frame's longest near-black falloff lives and where 8-bit banding shows
    // first. Same reasoning, same structure. See .pq-plate--wall.
    this.wallPlateEl = el('div', {
      class: 'pq-plate pq-plate--wall',
      aria: { hidden: true },
    });
    // …and the LENS, last of the three shared finishing terms (grain, grade,
    // vignette). It has to live up here with the other two rather than on the
    // modal backdrop, because a lens artefact that only appears when a panel is
    // open — and stops at that panel's edge — is not a lens artefact, and the
    // seam it exists to dissolve runs straight through the frame whether a
    // panel is up or not. See .pq-plate--vignette.
    this.vignettePlateEl = el('div', {
      class: 'pq-plate pq-plate--vignette',
      aria: { hidden: true },
    });

    this.pq = el('div', { class: 'pq' }, [
      this.gradeEl,
      this.atmosEl,
      this.stage,
      this.topbar,
      this.modalLayer,
      this.creditsEl,
      this.tonePlateEl,
      this.plateEl,
      this.cornerPlateEl,
      this.wallPlateEl,
      this.vignettePlateEl,
      this.liveEl,
    ]);
    root.appendChild(this.pq);

    /* ── Components ── */
    this.dialogue = new DialogueBox(this.stage);
    // Sits on the frame itself, not in the reading layer — a modal pulls the
    // dialogue bar out of shot, and the relay readout is part of the room.
    this.callstrip = new CallStrip(this.pq);
    this.proxy = new ProxyPanel(this.stage);
    this.choices = new ChoiceMenu(this.stage);
    this.chapter = new ChapterCard(this.stage);
    // The title owns a modal of its own now — the story picker — so it is handed
    // the shared modal layer and the same open/close entry points every other
    // panel in the game goes through. One modal stack, one focus trap, one Esc.
    this.title = new TitleScreen(this.pq, this.modalLayer, {
      onStart: (id) => this.host.startStory(id),
      onContinue: () => this.host.continueGame(),
      onLoad: () => this.openSaveLoad('load'),
      onSettings: () => this.openSettings(),
      onAbout: () => this.openModal(this.about.overlay, this.about.panel),
      hasContinue: () => this.host.hasContinue(),
      coverUrl: (id) => this.host.getCoverUrl(id),
      backdropUrl: (id) => this.host.getBackdropUrl(id),
      openModal: (overlay, panel) => this.openModal(overlay, panel),
      closeModal: () => this.closeTop(),
    });

    this.backlog = new Backlog(this.modalLayer, () => this.closeTop());
    this.saveload = new SaveLoad(
      this.modalLayer,
      host,
      () => this.closeTop(),
      () => this.closeAllModals(),
    );
    this.settings = new SettingsPanel(this.modalLayer, host, () => this.closeTop(), (next) =>
      this.commitSettings(next),
    );
    this.pause = this.buildPauseMenu();
    this.about = this.buildAbout();
    this.modalLayer.appendChild(this.pause.overlay);
    this.modalLayer.appendChild(this.about.overlay);

    /* ── Wiring ── */
    this.subscribe();
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);

    this.applySettings(this.settingsState);
    this.updateInputMode();
  }

  /* ─────────────────────────  Bus subscriptions  ───────────────────────── */

  private subscribe(): void {
    this.unsubs.push(
      this.bus.on('ui:say', (p) => {
        this.clearWait();
        this.clearAuto();
        this.closeChoiceUI();
        this.dialogue.show(
          p.speaker,
          p.text,
          { speed: this.settingsState.textSpeed, narrator: this.narratorLabel },
          (natural) => this.onLineComplete(natural, p.auto),
        );
        if (p.speaker) this.callstrip.connect(p.speaker.name);
        this.backlog.push({ name: p.speaker?.name ?? null, color: p.speaker?.color, text: p.text });
        this.announce(p.speaker ? `${p.speaker.name}. ${p.text}` : p.text);
        this.updateInputMode();
      }),
    );

    // The grade needs to know which plate it is grading. One data attribute on
    // the frame root is the whole mechanism: every per-plate power window,
    // light shaft and haze pass in ui.css is selected off it.
    this.unsubs.push(
      this.bus.on('scene:bg', (p) => {
        this.pq.dataset.pqBg = p.id;
      }),
    );

    /* …and WHO is on it, which is the other half of the same mechanism.
     *
     * The ops room is two compositions, not one. With a speaker on stage the
     * frame is a close two-hander and the foreground is a laptop lid between
     * her and the lens — the thing that occludes her torso and spills cool
     * light up onto her jaw. With nobody on stage the same lid is a black
     * quadrant covering the bottom-right third of an establishing shot, with
     * no object in frame to explain it and nothing behind it to see: the "dead
     * lower-right / undifferentiated darkness" note, exactly.
     *
     * A foreground element that only exists to sit in front of a figure has to
     * be conditional on there BEING a figure. One class on the frame root,
     * maintained the same way `data-pq-bg` is, and the room grade selects the
     * right composition off it (see `.pq:not(.has-cast) .pq-roomgrade::after`).
     */
    this.unsubs.push(
      this.bus.on('char:enter', (p) => {
        this.cast.add(p.char);
        this.pq.classList.add('has-cast');
      }),
      this.bus.on('char:exit', (p) => {
        this.cast.delete(p.char);
        this.pq.classList.toggle('has-cast', this.cast.size > 0);
      }),
      this.bus.on('runtime:ready', () => {
        this.cast.clear();
        this.pq.classList.remove('has-cast');
      }),
    );

    this.unsubs.push(this.bus.on('ui:choices', (p) => this.presentChoices(p.options)));

    this.unsubs.push(
      this.bus.on('ui:chapter', (p) => {
        this.clearWait();
        this.clearAuto();
        this.closeChoiceUI();
        this.chapter.show(p.title, p.subtitle, p.index);
        this.announce(`Chapter. ${p.title}${p.subtitle ? '. ' + p.subtitle : ''}`);
        this.updateInputMode();
      }),
    );

    this.unsubs.push(
      this.bus.on('ui:clear', () => {
        this.clearAuto();
        this.dialogue.clear();
        this.updateInputMode();
      }),
    );

    this.unsubs.push(this.bus.on('ui:end', (p) => this.rollCredits(p.credits ?? [])));

    this.unsubs.push(
      this.bus.on('wait:begin', (p) => {
        this.waitActive = true;
        // Only surface the ellipsis when there is nothing else holding the
        // frame. With a line on screen the dialogue bar already says "wait" —
        // a second, unexplained affordance in the corner is just noise.
        this.waitEl.hidden = this.dialogue.isVisible();
        this.updateInputMode();
        // Safety: hide the affordance around the natural end of the wait.
        window.setTimeout(() => {
          if (this.waitActive) this.waitEl.classList.add('is-soft');
        }, Math.max(200, p.seconds * 1000));
      }),
    );

    this.unsubs.push(
      this.bus.on('runtime:ready', (p) => {
        this.backlog.reset();
        this.chapter.reset();
        this.callstrip.reset();
        this.narratorLabel = p.story.narrator;
        // Rebuild the transcript the run arrives with. A fresh start carries an
        // empty history and this is a no-op; a game resumed from a save carries
        // the whole night, and without replaying it the History panel opened
        // blank on state the save had faithfully preserved. Speaker colours are
        // re-resolved from the manifest rather than stored, exactly as
        // Runtime.resolveSpeaker does — the save format keeps story text, not
        // presentation.
        for (const entry of p.history) {
          this.backlog.push({
            name: entry.speakerName ?? (entry.speaker ? entry.speaker : null),
            color: entry.speaker ? p.story.characters[entry.speaker]?.color : undefined,
            text: entry.text,
            kind: entry.choiceKind,
          });
        }
        this.applyTheme(p.story.theme);
        this.applySlotArt(p.story.id);
      }),
    );
  }

  private onLineComplete(natural: boolean, auto: boolean): void {
    if (!natural) return;
    if (!(auto || this.settingsState.autoAdvance)) return;
    const delay = 520;
    this.clearAuto();
    this.autoTimer = window.setTimeout(() => {
      this.autoTimer = 0;
      if (!this.choiceActive && this.modalStack.length === 0 && !this.creditsActive) {
        this.bus.emit('input:advance', {});
      }
    }, delay);
  }

  /* ─────────────────────────  Choices  ───────────────────────── */

  private presentChoices(options: ResolvedChoice[]): void {
    this.clearWait();
    this.clearAuto();
    if (this.dialogue.isTyping()) this.dialogue.skip();

    // The panel is chosen by whether ANY option is proxy-shaped — but it is then
    // given EVERY option, not just the proxy-shaped ones.
    //
    // This used to hand the panel `options.filter(proxy-shaped)`, which meant a
    // menu mixing a plain `>?` branch into a `>` / `>!` pair silently dropped the
    // plain branch: the author's third choice existed in the parsed script, was
    // reachable by the runtime, and could not be selected by any player. The
    // starter template ships exactly such a menu to demonstrate all three choice
    // kinds, so the first thing a new author saw was one of the three quietly
    // missing. A menu never renders fewer options than it was handed.
    const useProxy = options.some((o) => o.kind === 'suggested' || o.kind === 'offscript');
    const panelOptions = options;

    this.choiceOptions = panelOptions;
    this.choiceEls = useProxy
      ? this.proxy.show(panelOptions, (i) => this.selectChoice(i))
      : this.choices.show(panelOptions, (i) => this.selectChoice(i));

    this.choiceActive = true;
    this.updateInputMode();
    // Focus the first response for keyboard users.
    requestAnimationFrame(() => this.choiceEls[0]?.focus());
  }

  private selectChoice(index: number): void {
    if (!this.choiceActive) return;
    const opt = this.choiceOptions[index];
    const src = this.choiceEls[index];
    if (!opt) return;
    this.choiceActive = false;
    this.clearAuto();

    const fromProxy = this.proxy.isOpen();
    if (src) src.classList.add('is-chosen');
    (fromProxy ? this.proxy.root : this.choices.root).classList.add('is-choosing');

    const finish = (): void => {
      this.proxy.hide();
      this.choices.hide();
      this.choiceEls = [];
      this.choiceOptions = [];
      this.updateInputMode();
      // The reply the player actually gave belongs in the transcript. The
      // Runtime already records it in GameState.history (that is what the save
      // slot's label is derived from) and the Backlog already styles it — an
      // off-script line keeps the warm quill accent so you can retrace where you
      // broke script. It was simply never pushed on the live path, so History
      // read as Noor talking to herself, and a save round-trip produced a richer
      // transcript than the run that wrote it. Pushed here, immediately before
      // the choice reaches the Runtime, so both transcripts stay in step.
      this.backlog.push({ name: null, text: opt.text, kind: opt.kind });
      this.bus.emit('input:choose', { target: opt.target });
    };

    if (src && this.motionOK()) this.liftIntoDialogue(src, finish);
    else window.setTimeout(finish, 90);
  }

  private closeChoiceUI(): void {
    if (this.proxy.isOpen()) this.proxy.hide();
    if (this.choices.isOpen()) this.choices.hide();
    this.choiceActive = false;
    this.choiceEls = [];
    this.choiceOptions = [];
  }

  /** FLIP-style lift: a clone of the chosen line flies up into the dialogue body. */
  private liftIntoDialogue(src: HTMLElement, done: () => void): void {
    const target = this.dialogue.textElement;
    if (!this.dialogue.isVisible() || !target) {
      done();
      return;
    }
    const from = src.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (from.width === 0) {
      done();
      return;
    }
    const clone = src.cloneNode(true) as HTMLElement;
    clone.classList.add('pq-lift');
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: '0',
      transformOrigin: 'top left',
      pointerEvents: 'none',
      zIndex: '95',
    } as Partial<CSSStyleDeclaration>);
    this.pq.appendChild(clone);

    const scale = Math.min(1, to.width / from.width);
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const anim = clone.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1, filter: 'blur(0px)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0, filter: 'blur(2px)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );
    let finished = false;
    const end = (): void => {
      if (finished) return;
      finished = true;
      clone.remove();
      done();
    };
    anim.addEventListener('finish', end);
    window.setTimeout(end, 460);
  }

  /* ─────────────────────────  Advance / input mode  ───────────────────────── */

  private requestAdvance(): void {
    if (this.title.isVisible() || this.modalStack.length > 0) return;
    if (this.creditsActive) {
      this.skipCredits();
      return;
    }
    if (this.chapter.isOpen()) {
      this.chapter.hide();
      // Hand the frame straight back to the reading surface — the incoming line
      // then fades in under the card's own fade-out instead of after it.
      this.updateInputMode();
      this.bus.emit('input:advance', {});
      return;
    }
    if (this.waitActive) {
      this.clearWait();
      this.bus.emit('input:continue', {});
      return;
    }
    if (this.choiceActive) return;
    if (this.dialogue.isTyping()) {
      this.dialogue.skip();
      this.bus.emit('input:skip', {});
      return;
    }
    if (this.dialogue.isVisible()) {
      this.clearAuto();
      this.bus.emit('input:advance', {});
    }
  }

  private updateInputMode(): void {
    const armed =
      !this.title.isVisible() &&
      this.modalStack.length === 0 &&
      !this.creditsActive &&
      !this.choiceActive;
    this.advanceEl.classList.toggle('is-armed', armed);
    this.advanceEl.setAttribute('aria-hidden', armed ? 'false' : 'true');
    const inStory = !this.title.isVisible() && !this.creditsActive;
    this.topbar.hidden = !inStory;
    this.callstrip.setVisible(inStory);
    this.pq.classList.toggle('is-choice', this.choiceActive);
    // A modal owns the frame. The dialogue bar steps out rather than sitting
    // under the backdrop blur as an illegible ghost of type competing with the
    // panel's own column — and stepping out gives the room back its bottom third.
    this.pq.classList.toggle('is-modal', this.modalStack.length > 0);
    // A chapter card owns the whole frame: the dialogue bar and the wait
    // ellipsis step out rather than leaving stale marks under the lockup.
    this.pq.classList.toggle('is-chapter', this.chapter.isOpen());
  }

  private clearWait(): void {
    if (!this.waitActive && this.waitEl.hidden) return;
    this.waitActive = false;
    this.waitEl.hidden = true;
    this.waitEl.classList.remove('is-soft');
  }

  private clearAuto(): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = 0;
    }
  }

  /* ─────────────────────────  Keyboard  ───────────────────────── */

  private onKeyDown(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName;
    const editable =
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t?.isContentEditable ?? false);

    if (e.key === 'Escape') {
      e.preventDefault();
      this.onEscape();
      return;
    }

    if (this.modalStack.length > 0) {
      if (e.key === 'Tab') this.trapTab(e);
      return;
    }

    if (this.creditsActive) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
        e.preventDefault();
        this.skipCredits();
      }
      return;
    }

    if (this.title.isVisible()) return;

    if (this.choiceActive) {
      if (!editable && e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (idx < this.choiceEls.length) {
          e.preventDefault();
          this.selectChoice(idx);
        }
      }
      return;
    }

    if (editable) return;
    if ((e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') && this.isReadingTarget(t)) {
      e.preventDefault();
      this.requestAdvance();
    }
  }

  private isReadingTarget(t: HTMLElement | null): boolean {
    return t === document.body || t === this.pq || t === this.stage || t === this.advanceEl || t === null;
  }

  /* ─────────────────────────  Menus & modals  ───────────────────────── */

  private onEscape(): void {
    if (this.creditsActive) {
      this.skipCredits();
      return;
    }
    if (this.modalStack.length > 0) {
      this.closeTop();
      return;
    }
    if (this.title.isVisible()) return;
    this.openModal(this.pause.overlay, this.pause.panel);
  }

  private togglePauseMenu(): void {
    const top = this.modalStack[this.modalStack.length - 1];
    if (top && top.overlay === this.pause.overlay) this.closeTop();
    else if (this.modalStack.length === 0) this.openModal(this.pause.overlay, this.pause.panel);
  }

  private openSaveLoad(mode: 'save' | 'load'): void {
    this.saveload.open(mode);
    this.openModal(this.saveload.overlay, this.saveload.panel);
  }

  private openSettings(): void {
    this.settings.open();
    this.openModal(this.settings.overlay, this.settings.panel);
  }

  private openBacklog(): void {
    this.backlog.render();
    this.openModal(this.backlog.overlay, this.backlog.panel);
  }

  private openModal(overlay: HTMLElement, panel: HTMLElement): void {
    const prevFocus = (document.activeElement as HTMLElement | null) ?? null;
    // Retire the panel underneath. Two live overlays means two stacked backdrop
    // blurs and two stacked scrims — the room behind collapses into grey mush and
    // the lower panel's type smears through the upper one. Only the top pane of
    // glass is ever lit.
    this.setUnder(this.modalStack[this.modalStack.length - 1], true);
    this.modalStack.push({ overlay, panel, prevFocus });
    // Promote to the end of the layer so it paints above any modal beneath it
    // (all overlays share one stacking context — paint order is DOM order).
    this.modalLayer.appendChild(overlay);
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    this.focusInto(panel);
    this.updateInputMode();
  }

  private closeTop(): void {
    const top = this.modalStack.pop();
    if (!top) return;
    top.overlay.classList.remove('is-open');
    window.setTimeout(() => {
      if (!this.modalStack.some((m) => m.overlay === top.overlay)) top.overlay.hidden = true;
    }, 220);

    const under = this.modalStack[this.modalStack.length - 1];
    this.setUnder(under, false);
    if (top.prevFocus && document.contains(top.prevFocus)) top.prevFocus.focus();
    else if (under) this.focusInto(under.panel);
    this.updateInputMode();
  }

  private closeAllModals(): void {
    while (this.modalStack.length) {
      const m = this.modalStack.pop();
      if (m) {
        m.overlay.classList.remove('is-open', 'is-under');
        m.overlay.hidden = true;
      }
    }
    this.updateInputMode();
  }

  /** Dim/disarm a modal that another modal has been opened on top of. */
  private setUnder(entry: ModalEntry | undefined, under: boolean): void {
    if (entry) entry.overlay.classList.toggle('is-under', under);
  }

  private focusInto(panel: HTMLElement): void {
    // Focus the panel itself rather than its first control. Programmatic focus
    // inherits the session's focus-visible state, so focusing the close button
    // painted a keyboard ring around it on open — a default-HTML tell that the
    // rubric hard-fails. Tab still walks the controls; the trap is unchanged.
    requestAnimationFrame(() => {
      if (panel.hasAttribute('tabindex')) panel.focus();
      else (focusables(panel)[0] ?? panel).focus();
    });
  }

  private trapTab(e: KeyboardEvent): void {
    const top = this.modalStack[this.modalStack.length - 1];
    if (!top) return;
    const f = focusables(top.panel);
    if (f.length === 0) {
      e.preventDefault();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !top.panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private buildPauseMenu(): ReturnType<typeof overlayShell> {
    const shell = overlayShell('Paused', { onClose: () => this.closeTop(), kicker: 'Menu' });
    const item = (label: string, ic: string, onClick: () => void): HTMLElement =>
      el('button', { class: 'pq-menurow', type: 'button', on: { click: onClick } }, [
        el('span', { class: 'pq-menurow__ic', html: ic, aria: { hidden: true } }),
        el('span', { class: 'pq-menurow__label', text: label }),
        el('span', { class: 'pq-menurow__chev', html: Icons.chevron, aria: { hidden: true } }),
      ]);

    shell.body.appendChild(
      el('div', { class: 'pq-menugrid' }, [
        item('Resume', Icons.play, () => this.closeTop()),
        item('Save', Icons.save, () => this.openSaveLoad('save')),
        item('Load', Icons.load, () => this.openSaveLoad('load')),
        item('History', Icons.backlog, () => this.openBacklog()),
        item('Settings', Icons.settings, () => this.openSettings()),
        item('Return to title', Icons.home, () => {
          this.closeAllModals();
          this.host.returnToTitle();
        }),
      ]),
    );
    return shell;
  }

  private buildAbout(): ReturnType<typeof overlayShell> {
    const shell = overlayShell('About', { onClose: () => this.closeTop(), kicker: 'Lamplighter' });
    shell.body.appendChild(
      el('div', { class: 'pq-about' }, [
        el('p', {
          class: 'pq-about__lede',
          text:
            'Lamplighter is a cinematic anthology of narrative quests. You play the human voice of an AI companion — choosing between the words it suggests and the words that are truly yours.',
        }),
        el('p', {
          class: 'pq-about__body',
          text:
            'An original work in the spirit of Zachtronics’ Eliza, rendered in real time with Three.js: parallax depth, weather, film grain and a per-story color grade. Every story is a folder you can drop in — no code required.',
        }),
        el('div', { class: 'pq-about__meta' }, [
          el('span', { text: 'Space / Enter — advance' }),
          el('span', { text: '1 – 3 — choose a response' }),
          el('span', { text: 'Esc — menu' }),
        ]),
        // Engine credit lives here, not on the title screen.
        el('p', {
          class: 'pq-about__credit',
          text: 'Built with Three.js · original work in the spirit of Eliza',
        }),
      ]),
    );
    return shell;
  }

  /* ─────────────────────────  Credits  ───────────────────────── */

  private rollCredits(lines: string[]): void {
    this.closeAllModals();
    this.closeChoiceUI();
    this.clearWait();
    this.clearAuto();
    this.dialogue.clear();
    this.creditsActive = true;
    this.creditsDone = false;
    this.updateInputMode();

    clear(this.creditsEl);
    const reduced = !this.motionOK();

    const column = el('div', { class: 'pq-credits__col' }, [
      el('div', { class: 'pq-credits__mark' }, [
        el('span', { class: 'pq-credits__glyph', html: Icons.spark, aria: { hidden: true } }),
        el('span', { class: 'pq-credits__word', text: 'fin' }),
      ]),
      ...lines.map((ln) => el('p', { class: 'pq-credits__line', text: ln })),
      el('div', { class: 'pq-credits__end' }, [
        el('p', { class: 'pq-credits__thanks', text: 'Thank you for lending your voice.' }),
      ]),
    ]);

    const skip = el('button', {
      class: 'pq-btn pq-btn--ghost pq-credits__skip',
      type: 'button',
      text: reduced ? 'Return to title' : 'Skip',
      on: { click: () => this.skipCredits() },
    });

    this.creditsEl.append(column, skip);
    this.creditsEl.hidden = false;
    this.creditsEl.classList.remove('is-out');

    if (reduced) {
      column.classList.add('is-static');
      requestAnimationFrame(() => skip.focus());
      return;
    }

    const seconds = Math.max(12, lines.length * 1.7 + 8);
    column.style.animationDuration = `${seconds}s`;
    column.classList.add('is-rolling');
    const onEnd = (ev: AnimationEvent): void => {
      if (ev.animationName && ev.target === column) {
        column.removeEventListener('animationend', onEnd);
        this.finishCredits();
      }
    };
    column.addEventListener('animationend', onEnd);
    requestAnimationFrame(() => skip.focus());
  }

  private skipCredits(): void {
    if (!this.creditsActive) return;
    this.finishCredits();
  }

  private finishCredits(): void {
    if (this.creditsDone) return;
    this.creditsDone = true;
    this.creditsActive = false;
    this.creditsEl.classList.add('is-out');
    window.setTimeout(() => {
      this.creditsEl.hidden = true;
      clear(this.creditsEl);
    }, 400);
    this.updateInputMode();
    this.host.returnToTitle();
  }

  /* ─────────────────────────  IUILayer surface  ───────────────────────── */

  showTitle(stories: StoryManifest[]): void {
    this.closeAllModals();
    this.closeChoiceUI();
    this.clearWait();
    this.clearAuto();
    this.dialogue.clear();
    this.chapter.hide();
    this.creditsActive = false;
    this.creditsEl.hidden = true;
    this.title.show(stories);
    this.updateInputMode();
    requestAnimationFrame(() => this.title.focusFirst());
  }

  hideTitle(): void {
    this.title.hide();
    this.updateInputMode();
  }

  applyTheme(theme: StoryTheme): void {
    const rootStyle = document.documentElement.style;
    const set = (name: string, hex: string): void => {
      rootStyle.setProperty(name, hex);
      const rgb = rgbTriplet(hex);
      if (rgb) rootStyle.setProperty(`${name}-rgb`, rgb);
    };
    if (theme.key) set('--pq-key', theme.key);
    if (theme.accent) set('--pq-accent', theme.accent);
    if (theme.ink) set('--pq-ink', theme.ink);
    if (theme.paper) set('--pq-paper', theme.paper);
  }

  /**
   * Publishes the running story's establishing plate as `--pq-slot-art`, the
   * image the save screen ghosts into every unwritten slot (see `.pq-slot__art`).
   * Written the same way the theme is — one custom property on the document root,
   * consumed by CSS — so nothing in the save screen has to reach back into the
   * bundle, and a story with no art yet simply leaves the property unset and the
   * blanks fall back to their gradients.
   */
  private applySlotArt(storyId: string): void {
    const url = this.host.getBackdropUrl(storyId);
    const rootStyle = document.documentElement.style;
    if (url) rootStyle.setProperty('--pq-slot-art', `url("${url}")`);
    else rootStyle.removeProperty('--pq-slot-art');
  }

  applySettings(settings: Settings): void {
    this.settingsState = { ...settings };
    const reduced = settings.reducedMotion || !systemMotionOK();
    document.documentElement.dataset.pqMotion = reduced ? 'reduced' : 'full';
    this.settings.sync(this.settingsState);
  }

  private commitSettings(next: Settings): void {
    this.host.applySettings(next);
    this.applySettings(next);
    this.title.refresh();
  }

  private motionOK(): boolean {
    return !this.settingsState.reducedMotion && systemMotionOK();
  }

  private announce(msg: string): void {
    this.liveEl.textContent = '';
    // Next frame so screen readers register the change.
    requestAnimationFrame(() => {
      this.liveEl.textContent = msg;
    });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    this.clearAuto();
    this.dialogue.destroy();
    this.callstrip.destroy();
    this.proxy.destroy();
    this.choices.destroy();
    this.chapter.destroy();
    this.backlog.destroy();
    this.saveload.destroy();
    this.settings.destroy();
    this.title.destroy();
    this.pq.remove();
  }
}
