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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLogout } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const logout = useLogout();
  const { data: user } = useGetMe();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Specialiști", href: "/specialists", icon: Users },
    { name: "Evaluări", href: "/evaluations", icon: ClipboardList },
    { name: "Rapoarte", href: "/reports", icon: BarChart2 },
    { name: "Setări", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const NavContent = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-primary">SPI</h1>
        <p className="text-xs text-muted-foreground">Sales Performance Index</p>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.name} href={item.href} className="block">
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
        <div className="mb-4 px-3">
          <p className="text-sm font-medium truncate">{user?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconectare
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
        <h1 className="text-xl font-bold tracking-tight text-primary">SPI</h1>
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
    </>
  );
}
