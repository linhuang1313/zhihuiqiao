import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, BookOpen, Star, Plus, ArrowRight } from "lucide-react";
import type { Demand, Order } from "@shared/schema";

const demandStatusMap: Record<string, { label: string; color: string }> = {
  open: { label: "招募中", color: "default" },
  matched: { label: "已匹配", color: "secondary" },
  closed: { label: "已关闭", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};

const orderStatusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: "待服务", color: "default" },
  in_progress: { label: "服务中", color: "secondary" },
  completed: { label: "已完成", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};

export default function ParentDashboard() {
  const { user } = useAuth();
  const { data: demands, isLoading: demandsLoading } = useQuery<Demand[]>({
    queryKey: ["/api/demands/my"],
  });
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
  });

  const openDemands = demands?.filter((d) => d.status === "open") || [];
  const activeOrders = orders?.filter((o) => o.serviceStatus !== "cancelled" && o.serviceStatus !== "completed") || [];
  const completedOrders = orders?.filter((o) => o.serviceStatus === "completed") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">家长工作台</h1>
        <p className="text-muted-foreground text-sm mt-1">欢迎回来，{user?.name}！为孩子找到最好的老师。</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "招募中需求",
            value: demandsLoading ? "-" : openDemands.length,
            icon: <ClipboardList className="text-primary" size={20} />,
            bg: "bg-primary/10",
          },
          {
            label: "进行中订单",
            value: ordersLoading ? "-" : activeOrders.length,
            icon: <BookOpen className="text-amber-500" size={20} />,
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "已完成订单",
            value: ordersLoading ? "-" : completedOrders.length,
            icon: <Star className="text-green-500" size={20} />,
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "总需求数",
            value: demandsLoading ? "-" : (demands?.length || 0),
            icon: <ClipboardList className="text-muted-foreground" size={20} />,
            bg: "bg-muted/40",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-card-border">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid={`stat-${i}`}>
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
          <Link href="/parent/post-demand">
            <Button data-testid="btn-post-demand" className="gap-2">
              <Plus size={16} />
              发布新需求
            </Button>
          </Link>
          <Link href="/parent/teachers">
            <Button variant="outline" data-testid="btn-browse-teachers">浏览老师</Button>
          </Link>
          <Link href="/parent/orders">
            <Button variant="outline" data-testid="btn-view-orders">查看订单</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Demands */}
      <Card className="border-card-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">最近需求</CardTitle>
          <Link href="/parent/demands">
            <a className="text-sm text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </a>
          </Link>
        </CardHeader>
        <CardContent>
          {demandsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : demands?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无需求，去发布第一个需求吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {demands?.slice(0, 3).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`demand-row-${d.id}`}
                >
                  <div>
                    <span className="text-sm font-medium">{d.serviceCategory}</span>
                    {d.specificService && (
                      <span className="text-xs text-muted-foreground ml-2">· {d.specificService}</span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      孩子{d.childAge}岁 · {d.location || "未填写地址"}
                    </div>
                  </div>
                  <Badge variant={demandStatusMap[d.status]?.color as any || "default"}>
                    {demandStatusMap[d.status]?.label || d.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="border-card-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">最近订单</CardTitle>
          <Link href="/parent/orders">
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
              <p className="text-sm">暂无订单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders?.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`order-row-${o.id}`}
                >
                  <div>
                    <span className="text-sm font-medium">订单 #{o.id}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      服务日期：{o.serviceDate || "待定"} · ¥{o.totalAmount || 0}
                    </div>
                  </div>
                  <Badge variant={orderStatusMap[o.serviceStatus]?.color as any || "default"}>
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
