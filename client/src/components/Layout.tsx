import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  DollarSign,
  Search,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const parentNav: NavItem[] = [
  { href: "/parent", label: "总览", icon: <LayoutDashboard size={18} /> },
  { href: "/parent/post-demand", label: "发布需求", icon: <ClipboardList size={18} /> },
  { href: "/parent/demands", label: "我的需求", icon: <BookOpen size={18} /> },
  { href: "/parent/teachers", label: "浏览老师", icon: <Search size={18} /> },
  { href: "/parent/orders", label: "我的订单", icon: <Star size={18} /> },
];

const teacherNav: NavItem[] = [
  { href: "/teacher", label: "总览", icon: <LayoutDashboard size={18} /> },
  { href: "/teacher/profile", label: "我的资料", icon: <Settings size={18} /> },
  { href: "/teacher/demands", label: "接单大厅", icon: <Search size={18} /> },
  { href: "/teacher/orders", label: "我的订单", icon: <BookOpen size={18} /> },
  { href: "/teacher/earnings", label: "收入统计", icon: <DollarSign size={18} /> },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "数据概览", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/users", label: "用户管理", icon: <Users size={18} /> },
  { href: "/admin/verify", label: "教师认证", icon: <ShieldCheck size={18} /> },
  { href: "/admin/orders", label: "订单管理", icon: <BookOpen size={18} /> },
  { href: "/admin/analytics", label: "数据分析", icon: <BarChart3 size={18} /> },
];

const roleLabels: Record<string, string> = {
  parent: "家长",
  teacher: "老师",
  admin: "管理员",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const nav =
    user?.role === "parent"
      ? parentNav
      : user?.role === "teacher"
      ? teacherNav
      : adminNav;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast({ title: "退出失败", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          {/* Bridge SVG Logo */}
          <svg
            viewBox="0 0 40 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-8 shrink-0"
            aria-label="智慧桥"
          >
            {/* Bridge deck */}
            <rect x="2" y="22" width="36" height="3" rx="1.5" fill="hsl(var(--primary))" />
            {/* Left arch */}
            <path
              d="M4 22 Q12 6 20 10"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Right arch */}
            <path
              d="M36 22 Q28 6 20 10"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Left pillar */}
            <rect x="7" y="22" width="2.5" height="8" rx="1" fill="hsl(var(--primary))" />
            {/* Right pillar */}
            <rect x="30.5" y="22" width="2.5" height="8" rx="1" fill="hsl(var(--primary))" />
            {/* Center pillar */}
            <rect x="19" y="10" width="2" height="12" rx="1" fill="hsl(var(--accent))" />
            {/* Top capstone */}
            <circle cx="20" cy="8.5" r="2.5" fill="hsl(var(--accent))" />
          </svg>
          <div>
            <div className="font-bold text-base text-foreground tracking-wide">智慧桥</div>
            <div className="text-xs text-muted-foreground">WisdomBridge</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <Badge
            className="text-xs"
            variant={user?.role === "admin" ? "destructive" : "default"}
          >
            {roleLabels[user?.role || "parent"]} 视图
          </Badge>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-${item.href.replace(/\//g, "-")}`}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium
                    transition-colors cursor-pointer
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="btn-toggle-sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <GraduationCap size={16} className="text-primary" />
              <span className="text-muted-foreground">连接优质陪伴，共建成长之路</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-accent/10"
                data-testid="btn-user-menu"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium" data-testid="text-username">
                    {user?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {roleLabels[user?.role || "parent"]}
                  </div>
                </div>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">当前账号：{user?.username}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer"
                data-testid="btn-logout"
              >
                <LogOut size={16} className="mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
