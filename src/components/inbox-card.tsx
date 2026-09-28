"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, CheckCheck } from "lucide-react";

type InboxItem = { id: string; title: string; message: string; read: boolean; createdAt: string };

export function InboxCard({ queryKey }: { queryKey: string }) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await fetch("/api/notifications/inbox", { cache: "no-store" });
      if (!res.ok) return { data: [] as InboxItem[], unread: 0 };
      return res.json();
    },
    refetchInterval: 60000,
  });
  const list = (data?.data ?? []) as InboxItem[];

  const markRead = useCallback(
    async (id: string) => {
      await fetch("/api/notifications/inbox/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => null);
      refetch();
    },
    [refetch]
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold">
            <Inbox className="h-5 w-5 text-primary" /> 알림함
            {(data?.unread ?? 0) > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {data.unread}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            새로고침
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">받은 알림이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.slice(0, 10).map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-3 text-sm ${n.read ? "bg-muted/40 text-muted-foreground" : "border-primary/30 bg-primary/5"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{n.title}</span>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary"
                    >
                      <CheckCheck className="h-4 w-4" /> 읽음
                    </button>
                  )}
                </div>
                <p className="mt-1">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
