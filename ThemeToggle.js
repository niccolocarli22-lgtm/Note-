import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      data-testid="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`rounded-full w-10 h-10 ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-accent" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default ThemeToggle;
