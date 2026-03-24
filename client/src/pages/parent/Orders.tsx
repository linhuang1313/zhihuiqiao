import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import type { Order } from "@shared/schema";

const statusMap: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "待服务", color: "default" },
  in_progress: { label: "服务中", color: "secondary" },
  completed: { label: "已完成", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};

export default function ParentOrders() {
  const { toast } = useToast();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/orders/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "订单已取消" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "操作失败", variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "评价已提交，感谢您的反馈！" });
      setReviewOrder(null);
      setComment("");
      setRating(5);
    },
    onError: (err: any) => {
      toast({ title: err.message || "提交失败", variant: "destructive" });
    },
  });

  const handleReview = () => {
    if (!reviewOrder) return;
    reviewMutation.mutate({
      orderId: reviewOrder.id,
      revieweeId: reviewOrder.teacherId,
      rating,
      comment,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">我的订单</h1>
        <p className="text-sm text-muted-foreground mt-1">查看和管理所有服务订单</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : orders?.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <p>暂无订单</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((o) => (
            <Card key={o.id} className="border-card-border" data-testid={`order-card-${o.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">订单 #{o.id}</span>
                      <Badge variant={statusMap[o.serviceStatus]?.color || "default"}>
                        {statusMap[o.serviceStatus]?.label || o.serviceStatus}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {o.paymentStatus === "paid" ? "已付款" : o.paymentStatus === "refunded" ? "已退款" : "待付款"}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>服务日期：{o.serviceDate || "待定"}</p>
                      <p>服务时长：{o.durationHours || 0} 小时</p>
                      <p>
                        金额：<span className="font-medium text-foreground">¥{o.totalAmount || 0}</span>
                        <span className="ml-2 text-xs">（平台费：¥{o.platformFee || 0}）</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {o.serviceStatus === "completed" && (
                      <Button
                        size="sm"
                        onClick={() => setReviewOrder(o)}
                        data-testid={`btn-review-${o.id}`}
                      >
                        评价
                      </Button>
                    )}
                    {(o.serviceStatus === "scheduled") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => cancelMutation.mutate(o.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`btn-cancel-order-${o.id}`}
                      >
                        取消
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewOrder} onOpenChange={(open) => !open && setReviewOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>评价老师</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-2">评分</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i)}
                    data-testid={`star-${i}`}
                    className="cursor-pointer"
                  >
                    <Star
                      size={28}
                      className={i <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">评论</p>
              <Textarea
                placeholder="分享您的服务体验..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                data-testid="input-review-comment"
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              data-testid="btn-submit-review"
            >
              {reviewMutation.isPending ? "提交中..." : "提交评价"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
