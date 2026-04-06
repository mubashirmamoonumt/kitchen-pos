import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  ClipboardList, 
  UtensilsCrossed, 
  Users, 
  Package, 
  BookOpen, 
  CalendarClock, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Languages,
  Menu as MenuIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, isLoading, error } = useGetMe({ query: { retry: false } as any });
  const logoutMutation = useLogout();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("mufaz_token"));
  }, []);

  useEffect(() => {
    if (error) {
      setLocation("/login");
    }
  }, [error, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("mufaz_token");
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/recipes", label: "Recipes", icon: BookOpen },
    { href: "/scheduled", label: "Scheduled", icon: CalendarClock },
  ];

  if (user.role === "owner") {
    navItems.push(
      { href: "/bills", label: "Bills", icon: Receipt },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings }
    );
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary/10 text-foreground transition-colors">
          <item.icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{t(item.label)}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side={language === "ur" ? "right" : "left"} className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold text-xl text-primary">MUFAZ</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLanguage(language === "en" ? "ur" : "en")}>
            <Languages className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary tracking-tight">MUFAZ Kitchen</h1>
          <p className="text-sm text-muted-foreground mt-1">{user.name} ({user.role})</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={() => setLanguage(language === "en" ? "ur" : "en")}
          >
            <Languages className="h-4 w-4" />
            {language === "en" ? "اردو" : "English"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {t("Logout")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
