import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLogout } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { NotificationsBell } from "@/components/notifications-bell";

export function Sidebar() {
  const [location] = useLocation();
  const logout = useLogout();
  const { data: user } = useGetMe();
  const { t } = useLanguage();

  const isSpecialist = user?.role === "user";

  const isAdmin = user?.role === "admin";

  const adminNavigation = [
    { name: t.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: t.nav.specialists, href: "/specialists", icon: Users },
    { name: t.nav.evaluations, href: "/evaluations", icon: ClipboardList },
    ...(isAdmin ? [{ name: t.nav.evaluatori, href: "/evaluatori", icon: UserCheck }] : []),
    { name: t.nav.reports, href: "/reports", icon: BarChart2 },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];

  const specialistNavigation = [
    { name: t.nav.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { name: t.nav.myEvaluations, href: "/evaluations", icon: ClipboardList },
  ];

  const navigation = isSpecialist ? specialistNavigation : adminNavigation;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const NavContent = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-4 flex justify-center">
        <img src="/logo2.png" alt="SPI Logo" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className="block">
              <span
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 px-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
          {isSpecialist && <NotificationsBell />}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t.nav.logout}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <NavContent />
      </div>
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
        <img src="/logo2.png" alt="SPI Logo" className="h-8 w-auto" />
        <div className="flex items-center gap-2">
          {isSpecialist && <NotificationsBell />}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
