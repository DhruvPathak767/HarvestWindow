import { createContext, useContext } from "react";

/** True once the preloader has lifted (or immediately when it is skipped). */
export const IntroContext = createContext(true);

export const useIntro = () => useContext(IntroContext);
