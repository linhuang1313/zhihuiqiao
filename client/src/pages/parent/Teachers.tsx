import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Star, MapPin, DollarSign, GraduationCap } from "lucide-react";

interface TeacherWithProfile {
  id: number;
  name: string;
  city?: string;
  profile: {
    education?: string;
    major?: string;
    degree?: string;
    skills: string;
    serviceTypes: string;
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    ratingAvg: number;
    totalOrders: number;
    verified: boolean;
  } | null;
}

export default function BrowseTeachers() {
  const [search, setSearch] = useState("");
  const { data: teachers, isLoading } = useQuery<TeacherWithProfile[]>({
    queryKey: ["/api/teachers"],
  });

  const filtered = teachers?.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const skills = (() => { try { return JSON.parse(t.profile?.skills || "[]").join(" "); } catch { return ""; } })();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.profile?.education || "").toLowerCase().includes(q) ||
      skills.toLowerCase().includes(q) ||
      (t.city || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">浏览老师</h1>
        <p className="text-sm text-muted-foreground mt-1">寻找最适合您孩子的老师</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="搜索老师姓名、技能、学校..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-teachers"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-52 w-full" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p>没有找到匹配的老师</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((t) => {
            const skills: string[] = (() => { try { return JSON.parse(t.profile?.skills || "[]"); } catch { return []; } })();
            return (
              <Card
                key={t.id}
                className="border-card-border hover:border-primary/40 transition-colors"
                data-testid={`teacher-card-${t.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                        {t.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{t.name}</span>
                        {t.profile?.verified && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">已认证</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <GraduationCap size={13} />
                        <span className="truncate">
                          {t.profile?.education || "未填写"}
                          {t.profile?.degree && ` · ${t.profile.degree}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.slice(0, 4).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {skills.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{skills.length - 4}</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star size={13} fill="currentColor" />
                      <span className="font-medium">{t.profile?.ratingAvg?.toFixed(1) || "暂无"}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t.profile?.totalOrders || 0} 单
                    </span>
                    {t.city && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin size={12} />
                        {t.city}
                      </span>
                    )}
                  </div>

                  {/* Rate */}
                  {(t.profile?.hourlyRateMin || t.profile?.hourlyRateMax) && (
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      <DollarSign size={13} className="text-primary" />
                      <span className="font-medium text-primary">
                        ¥{t.profile.hourlyRateMin}-{t.profile.hourlyRateMax}/小时
                      </span>
                    </div>
                  )}

                  <Link href={`/parent/teachers/${t.id}`}>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      data-testid={`btn-view-teacher-${t.id}`}
                    >
                      查看详情
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
