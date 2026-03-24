import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Unlock, Star, GraduationCap } from "lucide-react";

interface UnlockRecordEnriched {
  id: number;
  parentId: number;
  teacherId: number;
  purchaseId: number;
  createdAt: string;
  teacher: {
    id: number;
    name: string;
    city?: string;
    avatar?: string | null;
    profile: {
      education?: string;
      degree?: string;
      skills: string;
      ratingAvg: number;
    } | null;
  } | null;
}

export default function UnlockRecords() {
  const { data: records, isLoading } = useQuery<UnlockRecordEnriched[]>({
    queryKey: ["/api/unlock/records"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="page-title-unlocks">解锁记录</h1>
        <p className="text-sm text-muted-foreground mt-1">已解锁的老师列表</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !records || records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Unlock size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无解锁记录</p>
          <Link href="/parent/teachers">
            <Button variant="outline" className="mt-4" data-testid="btn-go-teachers">
              去浏览老师
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const skills: string[] = (() => {
              try { return JSON.parse(r.teacher?.profile?.skills || "[]"); } catch { return []; }
            })();
            return (
              <Card key={r.id} className="border-card-border" data-testid={`unlock-record-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                        {r.teacher?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{r.teacher?.name || "未知"}</span>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          <Unlock size={10} className="mr-0.5" />
                          已解锁
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {r.teacher?.profile && (
                          <>
                            <span className="flex items-center gap-0.5">
                              <GraduationCap size={11} />
                              {r.teacher.profile.education || "未填写"}
                              {r.teacher.profile.degree && ` · ${r.teacher.profile.degree}`}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Star size={11} className="text-amber-500" />
                              {r.teacher.profile.ratingAvg?.toFixed(1) || "暂无"}
                            </span>
                          </>
                        )}
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {skills.slice(0, 3).map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs py-0">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}
                      </div>
                      <Link href={`/parent/teachers/${r.teacherId}`}>
                        <Button size="sm" variant="outline" className="mt-1" data-testid={`btn-view-unlocked-${r.teacherId}`}>
                          查看详情
                        </Button>
                      </Link>
                    </div>
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
