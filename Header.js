import { Link, useLocation } from 'react-router-dom';
import { Music, History, Home, Code } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function Header() {
  const location = useLocation();

  const handleDownloadCode = async () => {
    try {
      toast.info('Preparing download...');
      window.open(`${API_URL}/api/download-source`, '_blank');
      toast.success('Download started!');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  return (
    <header 
      data-testid="header"
      className="glass border-b border-border/50 sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          data-testid="logo-link"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="font-display text-xl font-medium tracking-tight hidden sm:block">
            SonataFlow
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link to="/">
            <Button
              data-testid="nav-home"
              variant={location.pathname === '/' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              <Home className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Transcribe</span>
            </Button>
          </Link>
          
          <Link to="/history">
            <Button
              data-testid="nav-history"
              variant={location.pathname === '/history' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </Link>

          <Button
            data-testid="download-code-btn"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleDownloadCode}
            title="Download Source Code"
          >
            <Code className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Get Code</span>
          </Button>

          <div className="w-px h-6 bg-border mx-2" />
          
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export default Header;
