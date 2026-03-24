import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Auth pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Parent pages
import ParentDashboard from "@/pages/parent/Dashboard";
import PostDemand from "@/pages/parent/PostDemand";
import MyDemands from "@/pages/parent/Demands";
import BrowseTeachers from "@/pages/parent/Teachers";
import TeacherDetail from "@/pages/parent/TeacherDetail";
import ParentOrders from "@/pages/parent/Orders";

// Teacher pages
import TeacherDashboard from "@/pages/teacher/Dashboard";
import TeacherProfile from "@/pages/teacher/Profile";
import TeacherDemands from "@/pages/teacher/Demands";
import TeacherOrders from "@/pages/teacher/Orders";
import TeacherEarnings from "@/pages/teacher/Earnings";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import TeacherVerify from "@/pages/admin/Verify";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminAnalytics from "@/pages/admin/Analytics";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.hash = "/";
    return null;
  }

  return <Layout>{children}</Layout>;
}

function AppRouter() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />

      {/* Parent */}
      <Route path="/parent">
        {() => <ProtectedLayout><ParentDashboard /></ProtectedLayout>}
      </Route>
      <Route path="/parent/post-demand">
        {() => <ProtectedLayout><PostDemand /></ProtectedLayout>}
      </Route>
      <Route path="/parent/demands">
        {() => <ProtectedLayout><MyDemands /></ProtectedLayout>}
      </Route>
      <Route path="/parent/teachers">
        {() => <ProtectedLayout><BrowseTeachers /></ProtectedLayout>}
      </Route>
      <Route path="/parent/teachers/:id">
        {() => <ProtectedLayout><TeacherDetail /></ProtectedLayout>}
      </Route>
      <Route path="/parent/orders">
        {() => <ProtectedLayout><ParentOrders /></ProtectedLayout>}
      </Route>

      {/* Teacher */}
      <Route path="/teacher">
        {() => <ProtectedLayout><TeacherDashboard /></ProtectedLayout>}
      </Route>
      <Route path="/teacher/profile">
        {() => <ProtectedLayout><TeacherProfile /></ProtectedLayout>}
      </Route>
      <Route path="/teacher/demands">
        {() => <ProtectedLayout><TeacherDemands /></ProtectedLayout>}
      </Route>
      <Route path="/teacher/orders">
        {() => <ProtectedLayout><TeacherOrders /></ProtectedLayout>}
      </Route>
      <Route path="/teacher/earnings">
        {() => <ProtectedLayout><TeacherEarnings /></ProtectedLayout>}
      </Route>

      {/* Admin */}
      <Route path="/admin">
        {() => <ProtectedLayout><AdminDashboard /></ProtectedLayout>}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedLayout><AdminUsers /></ProtectedLayout>}
      </Route>
      <Route path="/admin/verify">
        {() => <ProtectedLayout><TeacherVerify /></ProtectedLayout>}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedLayout><AdminOrders /></ProtectedLayout>}
      </Route>
      <Route path="/admin/analytics">
        {() => <ProtectedLayout><AdminAnalytics /></ProtectedLayout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
