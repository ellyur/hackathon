import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import type { AuthUser } from '@workspace/api-client-react';
import {
  LayoutDashboard,
  Bell,
  Calendar,
  ClipboardList,
  CheckCircle,
  Users,
  Building2,
  Settings,
  LogOut,
  FileText,
  AlertTriangle,
  Menu,
  X,
  Stethoscope,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user: rawUser, logout } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const roleNavItems = {
    student: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Schedule', href: '/schedule', icon: Calendar },
      { name: 'Clinical Passport', href: '/passport', icon: ClipboardList },
      { name: 'Attendance', href: '/attendance', icon: CheckCircle },
      { name: 'Available Slots', href: '/slots', icon: PlusCircle },
    ],
    ci: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Duties', href: '/duties', icon: ClipboardList },
      { name: 'Attendance Roster', href: '/attendance', icon: CheckCircle }, // Actually under /duties/:id/attendance usually, but a global one is helpful
    ],
    scheduler: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Master Schedule', href: '/schedules', icon: Calendar },
      { name: 'Students', href: '/students', icon: Users },
      { name: 'Duty Slots', href: '/slots', icon: ClipboardList },
      { name: 'Makeup Duties', href: '/makeup-duties', icon: AlertTriangle },
      { name: 'Case Gaps', href: '/case-gaps', icon: PieChart },
      { name: 'Verifications', href: '/verifications', icon: CheckCircle },
      { name: 'Announcements', href: '/announcements/manage', icon: Bell },
    ],
    admin: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/admin/analytics', icon: PieChart },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Hospitals', href: '/admin/hospitals', icon: Building2 },
      { name: 'Clinical Cases', href: '/admin/cases', icon: Stethoscope },
      { name: 'Reports', href: '/admin/reports', icon: FileText },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ]
  };

  const navItems = roleNavItems[user.role] || [];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out flex flex-col",
          isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0 md:relative"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-sidebar-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            ClinicalFlow
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-sidebar-accent/50 transition-colors text-left">
                <Avatar className="w-9 h-9 border border-sidebar-border">
                  <AvatarImage src={user.avatarUrl || ''} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer w-full flex">Profile Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold md:hidden">ClinicalFlow</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/notifications" className="relative p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Needed icon imported above but missing from lucide
import { PlusCircle } from 'lucide-react';
