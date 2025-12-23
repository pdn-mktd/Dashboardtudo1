import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSearchParams, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Users,
  CreditCard,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

// Menu items for embed mode
const embedMenuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/planejamento', label: 'Planejamento', icon: Target },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/transacoes', label: 'Transações', icon: CreditCard },
  { to: '/configuracoes', label: 'Config', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isEmbed = searchParams.get('embed') === 'true';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modo embed: menu horizontal compacto no topo
  if (isEmbed) {
    return (
      <div className="w-full h-full min-h-screen bg-background flex flex-col">
        {/* Header compacto para embed */}
        <header className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 sticky top-0 z-50">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <img src="/logo.png" alt="tudo1" className="h-6 w-6" />
            <span className="font-semibold text-sm hidden sm:inline">tudo1</span>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {embedMenuItems.map((item) => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={`${item.to}?embed=true`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Theme Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-sm py-2 px-3">
            <nav className="flex flex-col gap-1">
              {embedMenuItems.map((item) => {
                const isActive = location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <NavLink
                    key={item.to}
                    to={`${item.to}?embed=true`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
