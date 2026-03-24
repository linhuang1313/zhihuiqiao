import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order } from "@shared/schema";

const statusMap: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "待服务", color: "default" },
  in_progress: { label: "服务中", color: "secondary" },
  completed: { label: "已完成", color: "outline" },
  cancelled: { label: "已取消", color: "destructive" },
};
const paymentMap: Record<string, string> = { pending: "待付款", paid: "已付款", refunded: "已退款" };

export default function AdminOrders() {
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/admin/orders"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">订单管理</h1>
        <p className="text-sm text-muted-foreground mt-1">查看所有平台订单</p>
      </div>

      <Card className="border-card-border">
        {isLoading ? (
          <CardContent className="pt-4 space-y-3">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单ID</TableHead>
                  <TableHead>服务日期</TableHead>
                  <TableHead>时长</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>平台费</TableHead>
                  <TableHead>支付状态</TableHead>
                  <TableHead>服务状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((o) => (
                  <TableRow key={o.id} data-testid={`admin-order-row-${o.id}`}>
                    <TableCell className="font-medium">#{o.id}</TableCell>
                    <TableCell className="text-muted-foreground">{o.serviceDate || "待定"}</TableCell>
                    <TableCell>{o.durationHours || 0}h</TableCell>
                    <TableCell className="font-medium">¥{o.totalAmount || 0}</TableCell>
                    <TableCell className="text-muted-foreground">¥{o.platformFee || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{paymentMap[o.paymentStatus] || o.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[o.serviceStatus]?.color || "default"}>
                        {statusMap[o.serviceStatus]?.label || o.serviceStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!orders || orders.length === 0) && (
              <p className="text-center py-8 text-sm text-muted-foreground">暂无订单数据</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
