import HomeScreen from "../components/HomeScreen";
import { ThemeProvider } from "../components/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>
  );
}
