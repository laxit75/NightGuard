import React, { createContext, useContext, useEffect, useState } from "react";
import { DARK_COLORS, LIGHT_COLORS } from "../constants/colors";

const ThemeContext = createContext<{
  isLight: boolean;
  colors: Record<string, string>;
  toggleTheme: () => void;
}>({ isLight: false, colors: {}, toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLight, setIsLight] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      setIsLight(hour >= 6 && hour < 18);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const colors = isLight ? LIGHT_COLORS : DARK_COLORS;
  const toggleTheme = () => setIsLight((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isLight, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
