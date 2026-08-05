import { createContext, useContext, useState, ReactNode } from "react";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";

interface LiteModeContextType {
  liteMode: boolean;
  setLiteMode: (v: boolean) => void;
  toggleLiteMode: () => void;
}

const LiteModeContext = createContext<LiteModeContextType>({
  liteMode: false,
  setLiteMode: () => {},
  toggleLiteMode: () => {},
});

export const LiteModeProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useDisplaySettings();
  const [userChoice, setUserChoice] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem("pennyekart_lite_mode");
      return stored === null ? null : stored === "true";
    } catch {
      return null;
    }
  });

  // Local choice wins; otherwise follow the admin default
  const liteMode = userChoice ?? settings.defaultLiteMode;

  const setLiteMode = (v: boolean) => {
    setUserChoice(v);
    try {
      localStorage.setItem("pennyekart_lite_mode", String(v));
    } catch {}
  };

  const toggleLiteMode = () => setLiteMode(!liteMode);

  return (
    <LiteModeContext.Provider value={{ liteMode, setLiteMode, toggleLiteMode }}>
      {children}
    </LiteModeContext.Provider>
  );
};

export const useLiteMode = () => useContext(LiteModeContext);
