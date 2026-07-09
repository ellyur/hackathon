import { Link, Redirect, useLocation } from 'wouter';
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
  Clock,
  Menu,
  X,
  Stethoscope,
  PieChart,
  ScanFace,
  PlusCircle,
  BookOpen,
  Star,
  History,
  GraduationCap,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLE_LABELS: Record<string, string> = {
  student: 'Nursing Student',
  ci: 'Clinical Instructor',
  scheduler: 'Scheduler',
  admin: 'Administrator',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user: rawUser, logout, isLoading: authLoading } = useAuth();
  const user = rawUser as AuthUser | undefined;
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true',
  );

  function toggleCollapse() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  if (!user) {
    if (authLoading) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
          <img src="/sipag-logo.png" alt="SIPAG" className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      );
    }
    return <Redirect to="/login" />;
  }

  const roleNavItems = {
    student: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Schedule', href: '/schedule', icon: Calendar },
      { name: 'Academic Schedule', href: '/academic-schedule', icon: GraduationCap },
      { name: 'Clinical Passport', href: '/passport', icon: ClipboardList },
      { name: 'Attendance', href: '/attendance', icon: CheckCircle },
      { name: 'Available Slots', href: '/slots', icon: PlusCircle },
      { name: 'Face Setup', href: '/profile/face-setup', icon: ScanFace },
    ],
    ci: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Duties', href: '/duties', icon: ClipboardList },
      { name: 'Duty Verifications', href: '/verifications', icon: CheckCircle },
      { name: 'Student Progress', href: '/ci/students', icon: Users },
      { name: 'Evaluations', href: '/evaluations', icon: Star },
    ],
    scheduler: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Master Schedule', href: '/schedules', icon: Calendar },
      { name: 'Students', href: '/students', icon: Users },
      { name: 'Duty Slots', href: '/slots', icon: ClipboardList },
      { name: 'Makeup Duties', href: '/makeup-duties', icon: AlertTriangle },
      { name: 'Case Gaps', href: '/case-gaps', icon: PieChart },
      { name: 'Duty Verifications', href: '/duty-verifications', icon: CheckCircle },
      { name: 'Announcements', href: '/announcements/manage', icon: Bell },
    ],
    admin: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/admin/analytics', icon: PieChart },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Hospitals', href: '/admin/hospitals', icon: Building2 },
      { name: 'Clinical Cases', href: '/admin/cases', icon: Stethoscope },
      { name: 'Academic Lists', href: '/admin/academic', icon: BookOpen },
      { name: 'Academic Year Settings', href: '/admin/academic-year-settings', icon: Clock },
      { name: 'Reports', href: '/admin/reports', icon: FileText },
      { name: 'Notification Log', href: '/admin/notification-log', icon: History },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  };

  const navItems = roleNavItems[user.role as keyof typeof roleNavItems] || [];

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
          'bg-sidebar border-r border-sidebar-border',
          isMobile
            ? sidebarOpen
              ? 'translate-x-0 shadow-2xl w-64'
              : '-translate-x-full w-64'
            : cn('translate-x-0 md:relative', sidebarCollapsed ? 'w-16' : 'w-64'),
        )}
      >
        {/* Logo & Brand */}
        <div className="h-16 flex items-center px-3 border-b border-sidebar-border/40 shrink-0">
          <div className={cn('flex items-center gap-3 flex-1 min-w-0', sidebarCollapsed && !isMobile && 'justify-center')}>
            <img
              src="/sipag-logo.png"
              alt="SIPAG"
              className="w-9 h-9 rounded-lg object-contain shrink-0 shadow-md bg-white p-1"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {(!sidebarCollapsed || isMobile) && (
              <div className="min-w-0">
                <div className="text-white font-bold text-lg leading-tight tracking-wide">SIPAG</div>
                <div className="text-sidebar-foreground/50 text-[10px] leading-tight font-medium uppercase tracking-widest truncate">
                  Clinical Scheduling
                </div>
              </div>
            )}
          </div>
          {isMobile ? (
            <button
              className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors ml-2"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors shrink-0"
              onClick={toggleCollapse}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Role chip */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="px-4 pt-4 pb-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-1 mb-1">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className={cn('flex-1 overflow-y-auto pb-4 flex flex-col gap-0.5', sidebarCollapsed && !isMobile ? 'px-2 pt-3' : 'px-3')}>
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== '/dashboard' && location.startsWith(item.href));

            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  'relative flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                  sidebarCollapsed && !isMobile ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-sidebar-primary/15 text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                )}
                <item.icon
                  className={cn(
                    'shrink-0',
                    sidebarCollapsed && !isMobile ? 'w-5 h-5' : 'w-4.5 h-4.5',
                    isActive ? 'text-primary' : 'text-sidebar-foreground/50',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {(!sidebarCollapsed || isMobile) && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60 shrink-0" />}
                  </>
                )}
              </Link>
            );

            if (sidebarCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-sidebar-border/40 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {sidebarCollapsed && !isMobile ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                      <Avatar className="w-8 h-8 shrink-0 ring-2 ring-sidebar-border">
                        <AvatarImage src={user.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{user.firstName} {user.lastName}</TooltipContent>
                </Tooltip>
              ) : (
              <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left group">
                <Avatar className="w-8 h-8 shrink-0 ring-2 ring-sidebar-border">
                  <AvatarImage src={user.avatarUrl || ''} />
                  <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-sidebar-foreground/50 capitalize leading-tight mt-0.5">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0" />
              </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-56 mb-1"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Signed in as <span className="font-semibold text-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer w-full flex">
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              {user.role === 'student' && (
                <DropdownMenuItem asChild>
                  <Link href="/profile/face-setup" className="cursor-pointer w-full flex">
                    Face Setup
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-border sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {/* Show SIPAG logo in header on mobile */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <img src="/sipag-logo.png" alt="SIPAG" className="w-7 h-7 rounded-md object-contain bg-white p-0.5" />
                <span className="font-bold text-navy text-lg tracking-wide" style={{ color: 'hsl(217 67% 27%)' }}>
                  SIPAG
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
            </Link>

            {/* Profile dropdown (desktop only) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground leading-tight">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight capitalize">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="cursor-pointer w-full flex">
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                {user.role === 'student' && (
                  <DropdownMenuItem asChild>
                    <Link href="/profile/face-setup" className="cursor-pointer w-full flex">
                      Face Setup
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto page-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}
