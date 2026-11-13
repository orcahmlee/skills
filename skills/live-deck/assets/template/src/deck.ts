import rawDeck from "../content.json";

export type Layout = "cover" | "content" | "figure" | "embed";

export interface DeckSlide {
  id: string;
  layout: Layout;
  title: string;
  items: readonly string[];
  image?: string;
  caption?: string;
  page?: string;
  notes: readonly string[];
}

interface DeckSource {
  title: string;
  lang: string;
  theme: "dark" | "light";
  slides: readonly (Omit<DeckSlide, "id" | "items"> & { items?: readonly string[] })[];
}

// Asserted, because inferred JSON types would narrow to the slides of one deck. scripts/verify.mjs checks the shape.
export const deck = rawDeck as unknown as DeckSource;

const images = import.meta.glob<string>("../images/*.{png,jpg,jpeg,webp,gif,svg}", {
  eager: true,
  import: "default",
  query: "?inline",
});

const pages = import.meta.glob<string>("../embeds/*.html", {
  eager: true,
  import: "default",
  query: "?raw",
});

export const slides: readonly DeckSlide[] = deck.slides.map((slide, index) => ({
  ...slide,
  id: `slide-${index + 1}`,
  items: slide.items ?? [],
  image: slide.image && images[`../images/${slide.image}`],
  page: slide.page && pages[`../embeds/${slide.page}`],
}));

export const SLIDE_WIDTH = 1600;

/** Removes the `**` emphasis markers from slide text. */
export const plainText = (text: string) => text.replaceAll("**", "");
