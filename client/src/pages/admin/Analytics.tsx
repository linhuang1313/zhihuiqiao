import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(217 91% 60%)", "hsl(24 95% 53%)", "hsl(158 64% 42%)", "hsl(43 96% 56%)", "hsl(280 68% 56%)"];

export default function AdminAnalytics() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: orders } = useQuery<any[]>({ queryKey: ["/api/admin/orders"] });
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  // User role distribution
  const roleData = [
    { name: "家长", value: stats?.totalParents || 0 },
    { name: "教师", value: stats?.totalTeachers || 0 },
  ];

  // Monthly order data
  const monthlyOrders: Record<string, number> = {};
  orders?.forEach((o) => {
    if (!o.createdAt) return;
    const m = new Date(o.createdAt).toLocaleDateString("zh-CN", { month: "short" });
    monthlyOrders[m] = (monthlyOrders[m] || 0) + 1;
  });
  const orderChart = Object.entries(monthlyOrders).map(([month, count]) => ({ month, count }));

  // GMV by month
  const monthlyGMV: Record<string, number> = {};
  orders?.forEach((o) => {
    if (!o.createdAt || !o.totalAmount) return;
    const m = new Date(o.createdAt).toLocaleDateString("zh-CN", { month: "short" });
    monthlyGMV[m] = (monthlyGMV[m] || 0) + o.totalAmount;
  });
  const gmvChart = Object.entries(monthlyGMV).map(([month, gmv]) => ({ month, gmv }));

  // Service category distribution (from users — placeholder)
  const categoryData = [
    { name: "音乐陪伴", value: 35 },
    { name: "科目辅导", value: 30 },
    { name: "体育培训", value: 18 },
    { name: "兴趣培养", value: 12 },
    { name: "氛围陪伴", value: 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">数据分析</h1>
        <p className="text-sm text-muted-foreground mt-1">平台运营数据可视化报表</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card className="border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">用户角色分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Category */}
        <Card className="border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">服务类别分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}%`, "占比"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Orders */}
        <Card className="border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">月度订单量</CardTitle></CardHeader>
          <CardContent>
            {orderChart.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={orderChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [v, "订单数"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly GMV */}
        <Card className="border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">月度GMV</CardTitle></CardHeader>
          <CardContent>
            {gmvChart.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gmvChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`¥${v}`, "GMV"]} />
                  <Bar dataKey="gmv" radius={[4, 4, 0, 0]} fill="hsl(24 95% 53%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
