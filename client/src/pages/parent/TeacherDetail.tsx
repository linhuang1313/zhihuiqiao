import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, GraduationCap, Clock, DollarSign, ShieldCheck } from "lucide-react";

export default function TeacherDetail() {
  const [, params] = useRoute("/parent/teachers/:id");
  const teacherId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: teacher, isLoading } = useQuery<any>({
    queryKey: ["/api/teachers", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/teachers/${teacherId}`, { credentials: "include" });
      if (!res.ok) throw new Error("老师不存在");
      return res.json();
    },
    enabled: !!teacherId,
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: ["/api/reviews", { teacherId }],
  });

  const { data: myDemands } = useQuery<any[]>({
    queryKey: ["/api/demands/my"],
  });

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      toast({ title: "订单已创建！请等待老师确认" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "下单失败", variant: "destructive" });
    },
  });

  const handleOrder = () => {
    const openDemand = myDemands?.find((d) => d.status === "open");
    if (!openDemand) {
      toast({ title: "请先发布需求", variant: "destructive" });
      return;
    }
    orderMutation.mutate({
      demandId: openDemand.id,
      teacherId,
      serviceDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      durationHours: 2,
      totalAmount: teacher?.profile?.hourlyRateMin ? teacher.profile.hourlyRateMin * 2 : 0,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!teacher) {
    return <div className="text-center py-16 text-muted-foreground">老师不存在</div>;
  }

  const skills: string[] = (() => { try { return JSON.parse(teacher.profile?.skills || "[]"); } catch { return []; } })();
  const serviceTypes: string[] = (() => { try { return JSON.parse(teacher.profile?.serviceTypes || "[]"); } catch { return []; } })();
  const serviceAreas: string[] = (() => { try { return JSON.parse(teacher.profile?.serviceAreas || "[]"); } catch { return []; } })();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header Card */}
      <Card className="border-card-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl bg-primary/15 text-primary font-bold">
                {teacher.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-foreground">{teacher.name}</h1>
                {teacher.profile?.verified && (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck size={12} />
                    已认证
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <GraduationCap size={14} />
                {teacher.profile?.education || "未填写院校"}
                {teacher.profile?.major && ` · ${teacher.profile.major}`}
                {teacher.profile?.degree && ` · ${teacher.profile.degree}`}
              </div>
              {teacher.city && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <MapPin size={13} />
                  {teacher.city}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <span className="font-semibold">{teacher.profile?.ratingAvg?.toFixed(1) || "暂无"}</span>
                </span>
                <span className="text-sm text-muted-foreground">{teacher.profile?.totalOrders || 0} 次服务</span>
                {(teacher.profile?.hourlyRateMin || teacher.profile?.hourlyRateMax) && (
                  <span className="flex items-center gap-1 text-primary font-medium text-sm">
                    <DollarSign size={13} />
                    ¥{teacher.profile.hourlyRateMin}-{teacher.profile.hourlyRateMax}/小时
                  </span>
                )}
              </div>
            </div>
          </div>

          {teacher.profile?.bio && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{teacher.profile.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">技能专长</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
            {skills.length === 0 && <span className="text-sm text-muted-foreground">暂未填写</span>}
          </div>
          {serviceTypes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">服务类型</p>
              <div className="flex flex-wrap gap-2">
                {serviceTypes.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {serviceAreas.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">服务区域</p>
              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((a) => (
                  <span key={a} className="text-sm text-muted-foreground">📍 {a}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">学员评价 ({reviews?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!reviews || reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无评价</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3 bg-muted/30 rounded-lg" data-testid={`review-${r.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={13}
                          className={i <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{r.comment || "无评论"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleOrder}
        disabled={orderMutation.isPending}
        data-testid="btn-book-teacher"
      >
        {orderMutation.isPending ? "提交中..." : "立即预约"}
      </Button>
    </div>
  );
}
