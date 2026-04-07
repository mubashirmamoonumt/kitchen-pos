import { useEffect, useState } from "react";
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
  Menu as MenuIcon,
  PlusCircle,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { data: user, isLoading, error } = useGetMe({ query: { queryKey: [`/api/auth/me`] as const, retry: false } });
  const logoutMutation = useLogout();
  const [moreOpen, setMoreOpen] = useState(false);

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

  const allNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/orders/new", label: "New Order", icon: PlusCircle },
    { href: "/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/recipes", label: "Recipes", icon: BookOpen },
    { href: "/scheduled", label: "Scheduled", icon: CalendarClock },
    ...(user.role === "owner"
      ? [
          { href: "/bills", label: "Bills", icon: Receipt },
          { href: "/reports", label: "Reports", icon: BarChart3 },
          { href: "/settings", label: "Settings", icon: Settings },
        ]
      : []),
  ];

  // Bottom nav: 4 primary items + "More"
  const bottomNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/orders/new", label: "New Order", icon: PlusCircle },
    { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  ];

  // "More" drawer items: everything not in bottom nav
  const moreNavItems = allNavItems.filter(
    (item) => !bottomNavItems.some((b) => b.href === item.href)
  );

  const isActive = (href: string) =>
    href === "/dashboard" ? location === "/" || location === "/dashboard" : location.startsWith(href);

  const SidebarNavLinks = () => (
    <>
      {allNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            isActive(item.href)
              ? "bg-primary/15 text-primary font-semibold"
              : "hover:bg-primary/10 text-foreground"
          }`}
        >
          <item.icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{t(item.label)}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-40">
        <span className="font-bold text-xl text-primary">MUFAZ Kitchen</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{user.name}</span>
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
          <SidebarNavLinks />
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
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-stretch">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive(item.href) ? "text-primary" : "text-muted-foreground"}`} />
            <span className="leading-tight truncate w-full text-center px-1">
              {t(item.label)}
            </span>
          </Link>
        ))}

        {/* More button */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>{t("More")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl pb-safe">
            <div className="pt-2 pb-4">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-2 px-2">
                {moreNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <item.icon className="h-6 w-6 text-primary" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {t(item.label)}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 px-2 space-y-2 border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { setLanguage(language === "en" ? "ur" : "en"); setMoreOpen(false); }}
                >
                  <Languages className="h-4 w-4" />
                  {language === "en" ? "اردو" : "English"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { handleLogout(); setMoreOpen(false); }}
                >
                  <LogOut className="h-4 w-4" />
                  {t("Logout")}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
