import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, Check, Clock, Zap, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Package {
  id: number;
  name: string;
  description: string | null;
  price: number;
  unlockCount: number | null;
  durationDays: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface Purchase {
  id: number;
  packageId: number;
  amount: number;
  unlockQuota: number | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
}

const packageIcons = [
  <Zap size={24} className="text-blue-500" />,
  <CreditCard size={24} className="text-purple-500" />,
  <Crown size={24} className="text-amber-500" />,
  <Crown size={24} className="text-rose-500" />,
];

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "default" },
  confirmed: { label: "已确认", color: "secondary" },
  expired: { label: "已过期", color: "outline" },
  refunded: { label: "已退款", color: "destructive" },
};

export default function Packages() {
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const { data: purchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases/my"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const res = await apiRequest("POST", "/api/purchases", { packageId });
      return res.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/purchases/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unlock/status"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "购买失败", variant: "destructive" });
      setShowPayDialog(false);
    },
  });

  const handleBuy = (pkg: Package) => {
    setSelectedPkg(pkg);
    setShowPayDialog(true);
    purchaseMutation.mutate(pkg.id);
  };

  const pendingPurchases = purchases?.filter(p => p.status === "pending") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="page-title-packages">解锁套餐</h1>
        <p className="text-sm text-muted-foreground mt-1">购买套餐，解锁老师完整资料</p>
      </div>

      {/* Package grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages?.map((pkg, idx) => (
            <Card
              key={pkg.id}
              className={`border-card-border relative overflow-hidden ${idx === 2 ? "ring-2 ring-primary" : ""}`}
              data-testid={`package-card-${pkg.id}`}
            >
              {idx === 2 && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-bl-lg">
                  推荐
                </div>
              )}
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  {packageIcons[idx] || packageIcons[0]}
                  <div>
                    <h3 className="font-bold text-foreground">{pkg.name}</h3>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  </div>
                </div>

                <div className="my-4">
                  <span className="text-3xl font-bold text-primary">¥{pkg.price}</span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4 flex-1">
                  {pkg.unlockCount ? (
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-green-500" />
                      可解锁 {pkg.unlockCount} 位老师
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-green-500" />
                      无限解锁老师资料
                    </div>
                  )}
                  {pkg.durationDays ? (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      有效期 {pkg.durationDays} 天
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      永久有效
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={idx === 2 ? "default" : "outline"}
                  onClick={() => handleBuy(pkg)}
                  disabled={purchaseMutation.isPending}
                  data-testid={`btn-buy-package-${pkg.id}`}
                >
                  立即购买
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My purchases */}
      {purchases && purchases.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">我的购买记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  data-testid={`purchase-row-${p.id}`}
                >
                  <div>
                    <span className="text-sm font-medium">订单 #{p.id}</span>
                    <span className="text-sm text-primary font-medium ml-2">¥{p.amount}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString("zh-CN") : ""}
                    </div>
                  </div>
                  <Badge variant={statusMap[p.status]?.color as any || "default"}>
                    {statusMap[p.status]?.label || p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending notice */}
      {pendingPurchases.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="pending-notice">
              您有 {pendingPurchases.length} 笔订单待管理员确认，转账后请耐心等待。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent data-testid="pay-dialog">
          <DialogHeader>
            <DialogTitle>支付信息</DialogTitle>
            <DialogDescription>
              请通过以下方式完成转账，管理员确认后套餐即刻生效
            </DialogDescription>
          </DialogHeader>
          {selectedPkg && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">支付金额</p>
                <p className="text-3xl font-bold text-primary">¥{selectedPkg.price}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedPkg.name}</p>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <p className="text-sm font-medium">转账方式</p>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p>1. 微信/支付宝扫码转账至平台收款账号</p>
                  <p>2. 转账备注请填写：<span className="font-mono text-primary">ZHQ-{purchaseId || "..."}</span></p>
                  <p>3. 管理员确认收款后，套餐自动生效</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Check size={16} className="text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  订单已创建 (#{purchaseId})，请尽快完成转账
                </span>
              </div>

              <Button
                className="w-full"
                onClick={() => setShowPayDialog(false)}
                data-testid="btn-close-pay-dialog"
              >
                我已转账，等待确认
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
