import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Target, Clock, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  title: string;
  content: string;
  relatedId: number | null;
  relatedType: string | null;
  matchScore: number | null;
  isRead: boolean;
  createdAt: string;
}

export default function TeacherNotifications() {
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/read-all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "已全部标记为已读" });
    },
  });

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" data-testid="page-title-notifications">消息通知</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} 条未读通知` : "所有通知已读"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            data-testid="btn-mark-all-read"
          >
            <CheckCheck size={14} />
            全部已读
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无通知，有新的匹配需求会第一时间通知你</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const isMatch = notif.type === "match_demand";
            return (
              <Card
                key={notif.id}
                className={`border-card-border transition-colors cursor-pointer hover:border-primary/30 ${
                  !notif.isRead ? "border-l-4 border-l-primary bg-primary/5" : ""
                }`}
                data-testid={`notification-${notif.id}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isMatch ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {isMatch ? (
                        <Target size={18} className="text-primary" />
                      ) : (
                        <Bell size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </span>
                        {isMatch && notif.matchScore && (
                          <Badge variant="secondary" className="text-xs" data-testid={`match-score-${notif.id}`}>
                            匹配度 {notif.matchScore}%
                          </Badge>
                        )}
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {notif.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} />
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleString("zh-CN") : ""}
                        </span>
                        {isMatch && notif.relatedId && (
                          <Link href={`/teacher/demands`}>
                            <a
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`btn-view-demand-${notif.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              查看需求 <ArrowRight size={12} />
                            </a>
                          </Link>
                        )}
                      </div>
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
