import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, CheckCircle } from "lucide-react";

export default function TeacherVerify() {
  const { toast } = useToast();
  const { data: pending, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/teachers/pending"] });

  const verifyMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/admin/teachers/${userId}/verify`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers/pending"] });
      toast({ title: "教师认证通过" });
    },
    onError: (err: any) => toast({ title: err.message || "操作失败", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">教师认证</h1>
        <p className="text-sm text-muted-foreground mt-1">审核待认证教师资料</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !pending || pending.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <CheckCircle size={36} className="mb-3 text-green-500 opacity-60" />
            <p className="font-medium text-foreground">暂无待审核教师</p>
            <p className="text-sm mt-1">所有教师资料已审核完毕</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((t) => {
            const skills: string[] = (() => { try { return JSON.parse(t.profile?.skills || "[]"); } catch { return []; } })();
            return (
              <Card key={t.id} className="border-card-border" data-testid={`verify-card-${t.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/15 text-primary font-semibold">{t.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.name}</span>
                          <Badge variant="secondary" className="text-xs">待认证</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <GraduationCap size={13} />
                          {t.profile?.education || "未填写"}
                          {t.profile?.degree && ` · ${t.profile.degree}`}
                          {t.profile?.major && ` · ${t.profile.major}`}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {skills.slice(0, 5).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                        {t.profile?.bio && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.profile.bio}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => verifyMutation.mutate(t.id)}
                      disabled={verifyMutation.isPending}
                      className="gap-1 shrink-0"
                      data-testid={`btn-verify-${t.id}`}
                    >
                      <CheckCircle size={14} />
                      通过认证
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
