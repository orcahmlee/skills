import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { deck, plainText, slides, SLIDE_WIDTH, type DeckSlide } from "./deck";

type IconName = "previous" | "next" | "panel" | "grid" | "notes" | "fullscreen" | "close";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    previous: <path d="m14 5-7 7 7 7" />,
    next: <path d="m10 5 7 7-7 7" />,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    notes: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    fullscreen: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/** Renders text in which `**word**` marks the emphasis colour. */
function Inline({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part)}</>;
}

function SlideBody({ slide, preview }: { slide: DeckSlide; preview: boolean }) {
  if (slide.layout === "cover") return <h1><Inline text={slide.title} /></h1>;
  if (slide.layout === "embed") {
    // A preview shows a card, so thumbnails and the notes window run no second copy of the page.
    return preview
      ? <div className="embed-placeholder"><h2>{plainText(slide.title)}</h2><p>Interactive page</p></div>
      : <iframe className="slide-embed" title={plainText(slide.title)} srcDoc={slide.page} />;
  }
  return <>
    <h2><Inline text={slide.title} /></h2>
    {slide.layout === "figure"
      ? <figure className="slide-figure">
        <img src={slide.image} alt={plainText(slide.caption ?? slide.title)} />
        {slide.caption && <figcaption><Inline text={slide.caption} /></figcaption>}
      </figure>
      : <ol className="point-list">
        {slide.items.map((item, position) => <li key={position}>
          <span className="point-number">{String(position + 1).padStart(2, "0")}</span>
          <span className="point-text"><Inline text={item} /></span>
        </li>)}
      </ol>}
  </>;
}

export function SlideFrame({ slide, index, preview = false, animate = false }: {
  slide: DeckSlide;
  index: number;
  preview?: boolean;
  animate?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setScale(element.getBoundingClientRect().width / SLIDE_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="slide-viewport" ref={container} aria-hidden={preview || undefined}>
      <article key={slide.id} className={`slide-canvas layout-${slide.layout}${animate ? " slide-enter" : ""}`}
        data-slide-id={slide.id} data-preview={preview} style={{ transform: `scale(${scale})` }}>
        <div className="slide-content"><SlideBody slide={slide} preview={preview} /></div>
        <footer className="slide-footer"><span>{String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span></footer>
      </article>
    </div>
  );
}

function SlidePicker({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  return <ol className="slide-picker">
    {slides.map((slide, index) => <li key={slide.id}>
      <button type="button" className="thumbnail-button" aria-current={active === index ? "page" : undefined}
        aria-label={`Go to slide ${index + 1}: ${plainText(slide.title)}`} onClick={() => onSelect(index)}>
        <SlideFrame slide={slide} index={index} preview />
        <span className="thumbnail-caption"><span>{String(index + 1).padStart(2, "0")}</span>{plainText(slide.title)}</span>
      </button>
    </li>)}
  </ol>;
}

function Overview({ active, onSelect, onClose }: {
  active: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return <dialog className="overview-dialog" ref={dialog} aria-labelledby="overview-title" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-heading"><h2 id="overview-title">Slide overview</h2><button className="icon-button" type="button" aria-label="Close overview" onClick={onClose}><Icon name="close" /></button></div>
    <SlidePicker active={active} onSelect={onSelect} />
    <p className="dialog-hint">Select a slide, or press <kbd>Esc</kbd> to return.</p>
  </dialog>;
}

function PresenterView({ active, onNavigate, showFullscreenHint }: {
  active: number;
  onNavigate: (index: number) => void;
  showFullscreenHint: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const started = useRef(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = Math.floor((now - started.current) / 1000);
  const timerLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const current = slides[active];
  const next = slides[active + 1];

  return <main className="presenter-view">
    <header className="presenter-header"><span>Speaker notes</span><span className="presenter-clock">{new Date(now).toLocaleTimeString("en-GB", { hour12: false })}<span>Elapsed {timerLabel}</span></span></header>
    <div className="presenter-layout">
      <section className="speaker-copy" aria-label="Current speaker notes">
        <p className="presenter-label">Slide {active + 1} / {slides.length}</p>
        <h1>{plainText(current.title)}</h1>
        <div className="speaker-notes">{current.notes.map((note, position) => <p key={position}>{note}</p>)}</div>
        <nav className="presenter-navigation" aria-label="Presenter navigation">
          <button type="button" disabled={active === 0} onClick={() => onNavigate(active - 1)}><Icon name="previous" />Previous</button>
          <button type="button" disabled={active === slides.length - 1} onClick={() => onNavigate(active + 1)}>Next<Icon name="next" /></button>
        </nav>
        {showFullscreenHint && <p className="presenter-hint" role="status">Full screen starts from the deck window. Select that window, then press F.</p>}
      </section>
      <aside className="presenter-previews">
        <p className="presenter-label">Current slide</p>
        <SlideFrame slide={current} index={active} preview />
        <p className="presenter-label next-label">Next slide</p>
        {next ? <SlideFrame slide={next} index={active + 1} preview /> : <div className="end-card">End of deck</div>}
      </aside>
    </div>
  </main>;
}

interface PresenterWindow {
  window: Window;
  root: HTMLElement;
}

function indexFromHash() {
  const match = window.location.hash.match(/^#(?:slide-)?(\d+)$/);
  return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
}

export function App() {
  const [active, setActive] = useState(indexFromHash);
  const [panel, setPanel] = useState(false);
  const [overview, setOverview] = useState(false);
  const [presenter, setPresenter] = useState<PresenterWindow | null>(null);
  const [notice, setNotice] = useState("");
  const [fullscreenHint, setFullscreenHint] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const navigate = useCallback((index: number) => {
    setActive(Math.max(0, Math.min(slides.length - 1, index)));
    setOverview(false);
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `#slide-${active + 1}`);
    document.title = `${deck.title} · ${active + 1}/${slides.length}`;
    if (presenter && !presenter.window.closed) presenter.window.document.title = `Speaker notes · ${active + 1}/${slides.length}`;
  }, [active, presenter]);

  useEffect(() => {
    const change = () => setActive(indexFromHash());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else setNotice("Full screen is not available in this browser.");
    } catch {
      setNotice("Use the browser's full-screen command to present this deck.");
    }
  }, []);

  const openNotes = useCallback(() => {
    if (presenter && !presenter.window.closed) {
      presenter.window.focus();
      return;
    }
    const popup = window.open("", "live-deck-speaker-notes", "popup,width=1120,height=800");
    if (!popup) {
      setNotice("Allow pop-ups for this file to open speaker notes.");
      return;
    }
    const doc = popup.document;
    doc.open();
    doc.write(`<!doctype html><html lang='${deck.lang}' data-theme='${deck.theme}'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>Speaker notes</title></head><body class='presenter-body'><div id='presenter-root'></div></body></html>`);
    doc.close();
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.append(base);
    document.querySelectorAll("style, link[rel='stylesheet']").forEach(style => doc.head.append(style.cloneNode(true)));
    setPresenter({ window: popup, root: doc.getElementById("presenter-root")! });
    setNotice("");
  }, [presenter]);

  useEffect(() => {
    if (!presenter) return;
    const timer = window.setInterval(() => {
      if (presenter.window.closed) setPresenter(null);
    }, 750);
    const close = () => { if (!presenter.window.closed) presenter.window.close(); };
    window.addEventListener("beforeunload", close);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", close);
    };
  }, [presenter]);

  useEffect(() => {
    if (!fullscreenHint) return;
    const timer = window.setTimeout(() => setFullscreenHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, [fullscreenHint]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // defaultPrevented means an embedded page already used this key.
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || target?.isContentEditable || target?.closest("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      if (["arrowright", "arrowdown", "pagedown"].includes(key) || key === " " && !target?.closest("button, a")) {
        event.preventDefault();
        navigate(active + 1);
      } else if (["arrowleft", "arrowup", "pageup"].includes(key)) {
        event.preventDefault();
        navigate(active - 1);
      } else if (key === "home" || key === "end") {
        event.preventDefault();
        navigate(key === "home" ? 0 : slides.length - 1);
      } else if (key === "f") {
        event.preventDefault();
        // A key press in the notes window does not activate the deck window.
        // Unless the deck had its own key press seconds earlier, the request fails and shows a message on the projected deck.
        // A key press in an embedded page does activate the deck window, so it may toggle full screen.
        if (presenter && event.view === presenter.window) setFullscreenHint(true);
        else void toggleFullscreen();
      } else if (key === "g") {
        event.preventDefault();
        setPanel(false);
        setOverview(value => !value);
      } else if (key === "p") {
        event.preventDefault();
        setOverview(false);
        setPanel(value => !value);
      } else if (key === "n") {
        event.preventDefault();
        openNotes();
      } else if (key === "escape") {
        setOverview(false);
        setPanel(false);
        setNotice("");
      }
    };
    window.addEventListener("keydown", handleKey);
    presenter?.window.addEventListener("keydown", handleKey);
    // A key press inside an embedded page never reaches this window, so listen in the frame too.
    const frame = shell.current?.querySelector<HTMLIFrameElement>(".presentation-stage iframe");
    const listenInFrame = () => frame?.contentWindow?.addEventListener("keydown", handleKey);
    listenInFrame();
    frame?.addEventListener("load", listenInFrame);
    return () => {
      window.removeEventListener("keydown", handleKey);
      presenter?.window.removeEventListener("keydown", handleKey);
      frame?.removeEventListener("load", listenInFrame);
      frame?.contentWindow?.removeEventListener("keydown", handleKey);
    };
  }, [active, navigate, openNotes, presenter, toggleFullscreen]);

  const onTouchStart = (event: TouchEvent) => {
    touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (!touch.current || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) navigate(active + (dx < 0 ? 1 : -1));
    touch.current = null;
  };

  return <div className="deck-shell relative flex min-h-svh flex-col overflow-hidden" ref={shell}>
    <main className="presentation-stage flex flex-1 items-center justify-center" aria-label="Presentation" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="stage-width"><SlideFrame slide={slides[active]} index={active} animate /></div>
    </main>

    <footer className="deck-toolbar flex flex-wrap items-center justify-between" aria-label="Presentation controls">
      <nav className="navigation-group flex items-center" aria-label="Slide navigation">
        <button type="button" className="icon-button" disabled={active === 0} onClick={() => navigate(active - 1)} aria-label="Previous slide"><Icon name="previous" /></button>
        <span className="slide-counter" aria-live="polite">{String(active + 1).padStart(2, "0")}<span>/</span>{String(slides.length).padStart(2, "0")}</span>
        <button type="button" className="icon-button" disabled={active === slides.length - 1} onClick={() => navigate(active + 1)} aria-label="Next slide"><Icon name="next" /></button>
      </nav>
      <nav className="tool-group flex items-center" aria-label="Presentation tools">
        <button type="button" className="tool-button" aria-label="Toggle slide panel" aria-pressed={panel} title="Slide panel (P)" onClick={() => { setOverview(false); setPanel(value => !value); }}><Icon name="panel" /><span className="tool-label">Panel</span><kbd>P</kbd></button>
        <button type="button" className="tool-button" aria-label="Toggle slide overview" aria-pressed={overview} title="Slide overview (G)" onClick={() => { setPanel(false); setOverview(value => !value); }}><Icon name="grid" /><span className="tool-label">Grid</span><kbd>G</kbd></button>
        <button type="button" className="tool-button" aria-label="Open speaker notes" title="Speaker notes (N)" onClick={openNotes}><Icon name="notes" /><span className="tool-label">Notes</span><kbd>N</kbd></button>
        <button type="button" className="tool-button" aria-label="Toggle full screen" title="Full screen (F)" onClick={() => void toggleFullscreen()}><Icon name="fullscreen" /><span className="tool-label">Full screen</span><kbd>F</kbd></button>
      </nav>
    </footer>

    {panel && <aside className="slide-panel" aria-label="Slide panel">
      <div className="dialog-heading"><h2>Slides <span>{slides.length}</span></h2><button type="button" className="icon-button" aria-label="Close slide panel" onClick={() => setPanel(false)}><Icon name="close" /></button></div>
      <SlidePicker active={active} onSelect={navigate} />
      <p className="panel-hint"><kbd>←</kbd> <kbd>→</kbd> or <kbd>Space</kbd> to navigate</p>
    </aside>}
    {overview && <Overview active={active} onSelect={navigate} onClose={() => setOverview(false)} />}
    {notice && <div className="notice" role="status">{notice}<button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
    {presenter && !presenter.window.closed && createPortal(<PresenterView active={active} onNavigate={navigate} showFullscreenHint={fullscreenHint} />, presenter.root)}
  </div>;
}
