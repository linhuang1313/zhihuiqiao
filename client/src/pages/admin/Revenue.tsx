import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Check, Clock, TrendingUp, ShoppingCart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PurchaseEnriched {
  id: number;
  userId: number;
  packageId: number;
  amount: number;
  unlockQuota: number | null;
  expiresAt: string | null;
  status: string;
  confirmedBy: number | null;
  createdAt: string;
  confirmedAt: string | null;
  userName?: string;
  packageName?: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalPurchases: number;
  confirmedCount: number;
  pendingCount: number;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "default" },
  confirmed: { label: "已确认", color: "secondary" },
  expired: { label: "已过期", color: "outline" },
  refunded: { label: "已退款", color: "destructive" },
};

export default function AdminRevenue() {
  const { toast } = useToast();

  const { data: revenueStats, isLoading: statsLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/admin/revenue"],
  });

  const { data: pendingPurchases, isLoading: pendingLoading } = useQuery<PurchaseEnriched[]>({
    queryKey: ["/api/admin/purchases/pending"],
  });

  const { data: allPurchases, isLoading: allLoading } = useQuery<PurchaseEnriched[]>({
    queryKey: ["/api/admin/purchases"],
  });

  const confirmMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const res = await apiRequest("POST", `/api/admin/purchases/${purchaseId}/confirm`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "购买确认成功" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "确认失败", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="page-title-revenue">收入管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理套餐购买和收入统计</p>
      </div>

      {/* Revenue stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "总收入",
              value: `¥${revenueStats?.totalRevenue?.toFixed(1) || 0}`,
              icon: <DollarSign className="text-green-500" size={20} />,
              bg: "bg-green-50 dark:bg-green-900/20",
            },
            {
              label: "总订单数",
              value: revenueStats?.totalPurchases || 0,
              icon: <ShoppingCart className="text-blue-500" size={20} />,
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "已确认",
              value: revenueStats?.confirmedCount || 0,
              icon: <Check className="text-emerald-500" size={20} />,
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "待确认",
              value: revenueStats?.pendingCount || 0,
              icon: <Clock className="text-amber-500" size={20} />,
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
          ].map((c, i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>{c.icon}</div>
                <div className="text-xl font-bold text-foreground" data-testid={`revenue-stat-${i}`}>{c.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending purchases */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            待确认订单
            {pendingPurchases && pendingPurchases.length > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingPurchases.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !pendingPurchases || pendingPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无待确认订单</p>
          ) : (
            <div className="space-y-3">
              {pendingPurchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg"
                  data-testid={`pending-purchase-${p.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{p.id}</span>
                      <span className="text-sm">{p.userName || "未知用户"}</span>
                      <Badge variant="outline" className="text-xs">{p.packageName || "套餐"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      金额：<span className="text-primary font-medium">¥{p.amount}</span>
                      <span className="ml-2">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString("zh-CN") : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(p.id)}
                    disabled={confirmMutation.isPending}
                    className="gap-1"
                    data-testid={`btn-confirm-purchase-${p.id}`}
                  >
                    <Check size={14} />
                    确认收款
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All purchases history */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            全部购买记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !allPurchases || allPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无购买记录</p>
          ) : (
            <div className="space-y-2">
              {allPurchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`purchase-history-${p.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{p.id}</span>
                      <span className="text-sm">{p.userName || "未知用户"}</span>
                      <span className="text-sm text-primary font-medium">¥{p.amount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.packageName || "套餐"}
                      <span className="ml-2">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString("zh-CN") : ""}
                      </span>
                      {p.confirmedAt && (
                        <span className="ml-2">确认于 {new Date(p.confirmedAt).toLocaleString("zh-CN")}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusMap[p.status]?.color as any || "default"}>
                    {statusMap[p.status]?.label || p.status}
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
