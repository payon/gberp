"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import { hasRole } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type MenuInfo = { href: string; label: string; group: string; roles: string[] };

export function RbacMatrix() {
  const { data: session } = useSession();
  const myRole = (session?.user as { role?: UserRole } | undefined)?.role;
  const canEdit = myRole === "SUPER_ADMIN";

  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [role, setRole] = useState<UserRole>("SALES");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rbac", { cache: "no-store" });
        if (!res.ok) {
          toast.error("메뉴 권한을 불러오지 못했습니다.");
          return;
        }
        const json = await res.json();
        setMenus(json.data?.menus ?? []);
        setRoles(json.data?.editableRoles ?? []);
        setOverrides(json.data?.overrides ?? {});
        if (json.data?.editableRoles?.length) setRole(json.data.editableRoles[0]);
      } catch {
        toast.error("메뉴 권한을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const denied = useMemo(() => new Set(Object.keys(overrides[role] ?? {})), [overrides, role]);

  const isAllowedByDefault = useCallback(
    (m: MenuInfo) => hasRole(role, m.roles as UserRole[]),
    [role]
  );

  const toggle = useCallback(
    (href: string, next: boolean) => {
      if (!canEdit) return;
      setOverrides((prev) => {
        const perRole = { ...(prev[role] ?? {}) };
        if (next) delete perRole[href];
        else perRole[href] = false;
        const out = { ...prev };
        if (Object.keys(perRole).length === 0) delete out[role];
        else out[role] = perRole;
        return out;
      });
    },
    [canEdit, role]
  );

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/rbac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        toast.error(j?.error ?? "저장에 실패했습니다.");
        return;
      }
      const j = await res.json();
      setOverrides(j.data?.overrides ?? {});
      toast.success("메뉴 권한을 저장했습니다. (사이드바·API에 즉시 반영)");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [overrides]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  const groups = [...new Set(menus.map((m) => m.group))];

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4" /> 최고관리자만 변경할 수 있습니다. 현재는 조회 전용입니다.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Label>역할</Label>
        {roles.map((r) => (
          <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => setRole(r)}>
            {ROLE_LABELS[r] ?? r}
          </Button>
        ))}
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" onClick={doSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            저장
          </Button>
        )}
      </div>
      {groups.map((g) => (
        <Card key={g}>
          <CardContent className="space-y-1 p-4">
            <div className="mb-2 text-sm font-bold">{g}</div>
            {menus
              .filter((m) => m.group === g)
              .map((m) => {
                const base = isAllowedByDefault(m);
                const off = denied.has(m.href);
                const allowed = base && !off;
                return (
                  <div key={m.href} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-muted/50">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowed}
                      aria-label={`${m.label} 허용`}
                      disabled={!canEdit || !base}
                      onClick={() => toggle(m.href, !allowed)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        allowed ? "bg-primary" : "bg-muted"
                      } ${!canEdit || !base ? "opacity-50" : "cursor-pointer"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          allowed ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{m.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.href}</div>
                    </div>
                    {!base && <span className="text-xs text-muted-foreground">기본 미허용</span>}
                    {base && off && <span className="text-xs text-destructive">차단됨</span>}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">
        기본 미허용 메뉴는 켤 수 없습니다(코드 정적 권한). 허용 메뉴만 차단할 수 있으며, 차단은 사이드바와 API에 동시 적용됩니다.
        SUPER_ADMIN은 항상 전체 허용입니다.
      </p>
    </div>
  );
}
