import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, TrendingUp, Clock, Star } from "lucide-react";
import type { Order } from "@shared/schema";

export default function TeacherEarnings() {
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders/my"] });

  const completedOrders = orders?.filter((o) => o.serviceStatus === "completed") || [];
  const totalIncome = completedOrders.reduce((sum, o) => sum + (o.teacherIncome || 0), 0);
  const totalHours = completedOrders.reduce((sum, o) => sum + (o.durationHours || 0), 0);
  const avgPerOrder = completedOrders.length > 0 ? Math.round(totalIncome / completedOrders.length) : 0;

  // Monthly data
  const monthlyData: Record<string, number> = {};
  completedOrders.forEach((o) => {
    if (!o.createdAt) return;
    const month = new Date(o.createdAt).toLocaleDateString("zh-CN", { month: "short", year: "2-digit" });
    monthlyData[month] = (monthlyData[month] || 0) + (o.teacherIncome || 0);
  });
  const chartData = Object.entries(monthlyData).map(([month, income]) => ({ month, income }));

  const stats = [
    { label: "累计收入", value: `¥${totalIncome}`, icon: <DollarSign className="text-primary" size={20} />, bg: "bg-primary/10" },
    { label: "完成订单", value: `${completedOrders.length} 单`, icon: <Star className="text-amber-500" size={20} />, bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "服务时长", value: `${totalHours} 小时`, icon: <Clock className="text-green-500" size={20} />, bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "平均单价", value: `¥${avgPerOrder}`, icon: <TrendingUp className="text-blue-500" size={20} />, bg: "bg-blue-50 dark:bg-blue-900/20" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">收入统计</h1>
        <p className="text-sm text-muted-foreground mt-1">查看您的收入数据</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>{s.icon}</div>
                  <div className="text-xl font-bold text-foreground" data-testid={`earning-stat-${i}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {chartData.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2"><CardTitle className="text-base">月度收入</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [`¥${v}`, "收入"]} />
                    <Bar dataKey="income" radius={[4, 4, 0, 0]} fill="hsl(217 91% 60%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="border-card-border">
            <CardHeader className="pb-2"><CardTitle className="text-base">收入明细</CardTitle></CardHeader>
            <CardContent>
              {completedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无收入记录</p>
              ) : (
                <div className="space-y-3">
                  {completedOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`earning-row-${o.id}`}>
                      <div>
                        <span className="text-sm font-medium">订单 #{o.id}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.serviceDate || "未知日期"} · {o.durationHours}小时</div>
                      </div>
                      <span className="font-semibold text-primary">+¥{o.teacherIncome || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
