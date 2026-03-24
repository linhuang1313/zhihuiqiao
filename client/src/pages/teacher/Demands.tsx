import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, DollarSign, Clock, Zap } from "lucide-react";
import type { Demand } from "@shared/schema";

const serviceTypeMap: Record<string, string> = {
  home: "上门服务", center: "机构中心", online: "线上授课",
};

export default function TeacherDemands() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: demands, isLoading } = useQuery<Demand[]>({
    queryKey: ["/api/demands/open"],
  });

  const orderMutation = useMutation({
    mutationFn: async (demand: Demand) => {
      const res = await apiRequest("POST", "/api/orders", {
        demandId: demand.id,
        parentId: demand.parentId,
        teacherId: user?.id,
        serviceDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        durationHours: 2,
        totalAmount: demand.budgetMin ? demand.budgetMin * 2 : 200,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "申请已提交！等待家长确认" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "申请失败", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">接单大厅</h1>
        <p className="text-sm text-muted-foreground mt-1">浏览家长发布的需求，找到适合您的服务</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : demands?.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="text-center py-16 text-muted-foreground">
            <p>暂无开放需求</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {demands?.map((d) => {
            const times: string[] = (() => { try { return JSON.parse(d.preferredTime || "[]"); } catch { return []; } })();
            return (
              <Card key={d.id} className="border-card-border hover:border-primary/30 transition-colors" data-testid={`demand-item-${d.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{d.serviceCategory}</span>
                        {d.specificService && <Badge variant="outline" className="text-xs">{d.specificService}</Badge>}
                        <Badge variant="secondary" className="text-xs">{serviceTypeMap[d.serviceType]}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <span>孩子{d.childAge}岁 {d.childGender || ""}</span>
                        {d.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {d.location}
                          </span>
                        )}
                        {(d.budgetMin || d.budgetMax) && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={12} />
                            ¥{d.budgetMin || 0}-{d.budgetMax || "不限"}/小时
                          </span>
                        )}
                        {times.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {times.slice(0, 2).join("、")}
                          </span>
                        )}
                      </div>
                      {d.specialRequirements && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.specialRequirements}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => orderMutation.mutate(d)}
                      disabled={orderMutation.isPending}
                      className="gap-1 shrink-0"
                      data-testid={`btn-apply-${d.id}`}
                    >
                      <Zap size={14} />
                      立即申请
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
