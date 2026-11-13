import { createRoot } from "react-dom/client";
import { App } from "./App";
import { deck } from "./deck";
import "@fontsource/noto-serif-tc/500.css";
import "./styles.css";

document.documentElement.lang = deck.lang;
document.documentElement.dataset.theme = deck.theme;
createRoot(document.getElementById("root")!).render(<App />);
