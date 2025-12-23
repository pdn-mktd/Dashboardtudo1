import { LayoutDashboard, Package, Users, Receipt, LogOut, Shield, ArrowRightLeft, PieChart, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Produtos', url: '/produtos', icon: Package },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Transações', url: '/transacoes', icon: ArrowRightLeft },
  { title: 'Financeiro', url: '/financeiro', icon: PieChart },
  { title: 'Planejamento', url: '/planejamento', icon: Target },
  { title: 'Usuários', url: '/usuarios', icon: Shield },
];

export function Sidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: 'Erro ao sair', variant: 'destructive' });
      return;
    }
    toast({ title: 'Você saiu da conta' });
    navigate('/auth');
  };

  return (
    <ShadcnSidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="tudo1"
            className="h-8 w-auto object-contain"
          />
          {!collapsed && (
            <span className="font-semibold text-lg text-foreground sr-only">tudo1</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                          {collapsed && isActive && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border">
        <div className="flex flex-col gap-2">
          {!collapsed && user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
