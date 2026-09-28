"use client";

import { useState } from "react";
import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";
import { RbacMatrix } from "@/components/rbac-matrix";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [tab, setTab] = useState<"users" | "rbac">("users");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "users" ? "default" : "outline"} onClick={() => setTab("users")}>
          <Users className="mr-1 h-4 w-4" /> 사용자 목록
        </Button>
        <Button
          size="sm"
          variant={tab === "rbac" ? "default" : "outline"}
          onClick={() => setTab("rbac")}
          className={cn(tab === "rbac" && "border-primary")}
        >
          <ShieldCheck className="mr-1 h-4 w-4" /> 메뉴 권한
        </Button>
      </div>
      {tab === "users" ? (
        <ResourceWrapper resource="users" headerActions={<ResourceExcelActions resource="users" />} />
      ) : (
        <RbacMatrix />
      )}
    </div>
  );
}
