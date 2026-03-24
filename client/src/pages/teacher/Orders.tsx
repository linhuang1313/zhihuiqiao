import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@shared/schema";

const statusMap: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "待服务", color: "default" },
  in_progress: { label: "服务中", color: "secondary" },
  completed: { label: "已完成", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};

export default function TeacherOrders() {
  const { toast } = useToast();
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders/my"] });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/orders/${id}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "订单已接受，开始服务" });
    },
    onError: (err: any) => toast({ title: err.message || "操作失败", variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/orders/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "服务已完成" });
    },
    onError: (err: any) => toast({ title: err.message || "操作失败", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">我的订单</h1>
        <p className="text-sm text-muted-foreground mt-1">管理您的所有服务订单</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}</div>
      ) : orders?.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="text-center py-16 text-muted-foreground"><p>暂无订单</p></CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((o) => (
            <Card key={o.id} className="border-card-border" data-testid={`teacher-order-card-${o.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">订单 #{o.id}</span>
                      <Badge variant={statusMap[o.serviceStatus]?.color || "default"}>
                        {statusMap[o.serviceStatus]?.label}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>服务日期：{o.serviceDate || "待定"}</p>
                      <p>服务时长：{o.durationHours || 0} 小时</p>
                      <p>您的收入：<span className="font-medium text-foreground">¥{o.teacherIncome || 0}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {o.serviceStatus === "scheduled" && (
                      <Button size="sm" onClick={() => acceptMutation.mutate(o.id)} disabled={acceptMutation.isPending} data-testid={`btn-accept-${o.id}`}>
                        接受
                      </Button>
                    )}
                    {o.serviceStatus === "in_progress" && (
                      <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(o.id)} disabled={completeMutation.isPending} data-testid={`btn-complete-${o.id}`}>
                        完成
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
