import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, BookOpen, DollarSign, Search, ArrowRight } from "lucide-react";
import type { Order } from "@shared/schema";

const orderStatusMap: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "待服务", color: "default" },
  in_progress: { label: "服务中", color: "secondary" },
  completed: { label: "已完成", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
  });
  const { data: profile } = useQuery<any>({
    queryKey: ["/api/teacher/profile"],
  });

  const activeOrders = orders?.filter((o) => o.serviceStatus === "scheduled" || o.serviceStatus === "in_progress") || [];
  const completedOrders = orders?.filter((o) => o.serviceStatus === "completed") || [];
  const totalIncome = completedOrders.reduce((sum, o) => sum + (o.teacherIncome || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">老师工作台</h1>
        <p className="text-sm text-muted-foreground mt-1">欢迎回来，{user?.name}！</p>
      </div>

      {!profile?.verified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <span className="font-medium text-amber-700 dark:text-amber-400">⚠️ 您的资料尚未通过认证</span>
          <span className="text-amber-600 dark:text-amber-500 ml-2">请完善个人资料，等待管理员审核</span>
          <Link href="/teacher/profile">
            <Button size="sm" variant="outline" className="ml-3 text-xs h-7">完善资料</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "进行中订单",
            value: ordersLoading ? "-" : activeOrders.length,
            icon: <BookOpen className="text-primary" size={20} />,
            bg: "bg-primary/10",
          },
          {
            label: "已完成订单",
            value: ordersLoading ? "-" : completedOrders.length,
            icon: <Star className="text-amber-500" size={20} />,
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "平均评分",
            value: profile?.ratingAvg > 0 ? profile.ratingAvg.toFixed(1) : "暂无",
            icon: <Star className="text-green-500" size={20} />,
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "累计收入",
            value: ordersLoading ? "-" : `¥${totalIncome}`,
            icon: <DollarSign className="text-blue-500" size={20} />,
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-card-border">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                {stat.icon}
              </div>
              <div className="text-xl font-bold text-foreground" data-testid={`teacher-stat-${i}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/teacher/demands">
            <Button className="gap-2" data-testid="btn-browse-demands">
              <Search size={16} />
              浏览接单大厅
            </Button>
          </Link>
          <Link href="/teacher/profile">
            <Button variant="outline" data-testid="btn-edit-profile">完善资料</Button>
          </Link>
          <Link href="/teacher/earnings">
            <Button variant="outline" data-testid="btn-view-earnings">查看收入</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="border-card-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">最近订单</CardTitle>
          <Link href="/teacher/orders">
            <a className="text-sm text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </a>
          </Link>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : orders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无订单，去接单大厅接单吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders?.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`teacher-order-row-${o.id}`}
                >
                  <div>
                    <span className="text-sm font-medium">订单 #{o.id}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {o.serviceDate || "待定"} · 收入 ¥{o.teacherIncome || 0}
                    </div>
                  </div>
                  <Badge variant={orderStatusMap[o.serviceStatus]?.color || "default"}>
                    {orderStatusMap[o.serviceStatus]?.label || o.serviceStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
