"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Loader2, ArrowUp, ArrowDown, MapPin, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type FieldMeta = {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "date" | "datetime" | "select" | "textarea" | "email" | "tel" | "stops";
  options?: { value: string; label: string }[];
  optionsRoute?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  full?: boolean;
  createOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type ResourceMeta = {
  key: string;
  title: string;
  description: string;
  roles: string[];
  listColumns: { key: string; label: string }[];
  searchKeys: string[];
  fields: FieldMeta[];
};

export type RowLink = {
  href: string;
  title: string;
  icon?: "printer" | "download";
};

function toInputValue(field: FieldMeta, row: Record<string, any> | null): string {
  const v = row?.[field.key];
  if (v === undefined || v === null) return "";
  if (field.type === "date") return String(v).slice(0, 10);
  if (field.type === "datetime") return new Date(v).toISOString().slice(0, 16);
  return String(v);
}

function toInputDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString("en-CA");
  return value;
}

export function ResourceTable({
  meta,
  headerActions,
  rowLinks = [],
}: {
  meta: ResourceMeta;
  headerActions?: React.ReactNode;
  rowLinks?: RowLink[];
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const userRole = (session?.user as { role?: string })?.role;
  const canWrite =
    !!userRole && (userRole === "SUPER_ADMIN" || (meta.roles as string[]).includes(userRole));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [meta.key],
    queryFn: async () => {
      const res = await fetch(`/api/${meta.key}`);
      if (!res.ok) throw new Error("로드 실패");
      const json = await res.json();
      return (json.data ?? []) as Record<string, any>[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      meta.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, meta.searchKeys]);

  const openCreate = () => {
    setEditing(null);
    const init: Record<string, string> = {};
    for (const f of meta.fields) init[f.key] = "";
    setForm(init);
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, any>) => {
    setEditing(row);
    const init: Record<string, string> = {};
    for (const f of meta.fields) init[f.key] = toInputValue(f, row);
    setForm(init);
    setDialogOpen(true);
  };

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const payload: Record<string, any> = {};
    for (const f of meta.fields) {
      const isCreate = !editing;
      if (f.createOnly && !isCreate) continue;
      payload[f.key] = form[f.key] ?? "";
    }
    for (const f of meta.fields) {
      if (f.type !== "stops" || !form[f.key]) continue;
      let stops: unknown[] = [];
      try {
        stops = JSON.parse(form[f.key]);
      } catch {
        // ignore
      }
      if (
        Array.isArray(stops) &&
        stops.some((s) => !String((s as any)?.stopName ?? "").trim())
      ) {
        toast.error("정차 장소 이름이 비어 있는 항목이 있습니다.");
        return false;
      }
    }
    const res = await fetch(editing ? `/api/${meta.key}/${editing.id}` : `/api/${meta.key}`, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "저장에 실패했습니다.");
      return false;
    }
    toast.success(editing ? "변경사항이 저장되었습니다." : "등록되었습니다.");
    if (json.warning) toast.warning(json.warning);
    queryClient.invalidateQueries({ queryKey: [meta.key] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    return true;
  };

  const remove = async (row: Record<string, any>) => {
    if (!window.confirm("삭제하시겠습니까? (감사 로그에 기록됩니다)")) return;
    const res = await fetch(`/api/${meta.key}/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "삭제에 실패했습니다.");
      return;
    }
    toast.success("삭제되었습니다.");
    queryClient.invalidateQueries({ queryKey: [meta.key] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription className="mt-1">{meta.description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-52 pl-9"
            />
          </div>
          {headerActions}
          {canWrite && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              신규 등록
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            데이터를 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            데이터가 없습니다. {canWrite && "신규 등록 버튼으로 추가하세요."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {meta.listColumns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  <TableHead className="w-24 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    {meta.listColumns.map((c) => (
                      <TableCell key={c.key}>
                        {c.key.endsWith("Label") || c.key === "statusLabel" ? (
                          <Badge variant={(row[c.key.replace("Label", "Variant")] as any) ?? "secondary"}>
                            {row[c.key] ?? "-"}
                          </Badge>
                        ) : (
                          <span>{row[c.key] ?? "-"}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {rowLinks.map((l) => {
                          const RowIcon = l.icon === "printer" ? Printer : FileDown;
                          return (
                            <Link
                              key={l.href}
                              href={l.href.replace("{id}", row.id)}
                              target={l.icon === "printer" ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              title={l.title}
                            >
                              <Button variant="ghost" size="icon" aria-label={l.title}>
                                <RowIcon className="h-4 w-4" />
                              </Button>
                            </Link>
                          );
                        })}
                        {canWrite && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="수정">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(row)} title="삭제">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `${meta.title} 수정` : `${meta.title} 신규 등록`}</DialogTitle>
            <DialogDescription>
              필수(*) 항목을 입력해주세요. 저장 시 감사 로그가 기록됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            {meta.fields
              .filter((f) => !(f.createOnly && editing))
              .map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <Label htmlFor={f.key}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  <div className="mt-1.5">
                    <FormField
                      field={f}
                      value={form[f.key] ?? ""}
                      onChange={(v) => setField(f.key, v)}
                    />
                    {f.help ? <p className="mt-1 text-xs text-muted-foreground">{f.help}</p> : null}
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={async () => {
                const ok = await submit();
                if (ok) setDialogOpen(false);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "stops") {
    return <StopsEditor value={value} onChange={onChange} />;
  }
  if (field.type === "select") {
    return <SelectField field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "textarea") {
    return (
      <Textarea id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        id={field.key}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    );
  }
  if (field.type === "date") {
    return (
      <Input id={field.key} type="date" value={toInputDate(value)} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (field.type === "datetime") {
    return (
      <Input id={field.key} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
  return (
    <Input
      id={field.key}
      type={field.type === "password" ? "password" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
    />
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
}) {
  let options = field.options ?? [];

  const { data: remote } = useQuery({
    queryKey: ["options", field.optionsRoute],
    queryFn: async () => {
      if (!field.optionsRoute) return [];
      const res = await fetch(`/api/${field.optionsRoute}?all=1`);
      const json = await res.json();
      return json.options ?? [];
    },
    enabled: !!field.optionsRoute,
    staleTime: 60_000,
  });

  if (field.optionsRoute) {
    options = remote ?? [];
  }

  const hasValue = value !== "" || options.some((o) => o.value === value);

  return (
    <Select id={field.key} value={hasValue ? value : ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">선택해주세요</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function StopsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const stops = useMemo<{ stopName: string; stopTime: string; note: string }[]>(() => {
    try {
      const arr = JSON.parse(value || "[]");
      if (Array.isArray(arr)) {
        return arr.map((s) => ({
          stopName: String(s?.stopName ?? s?.name ?? ""),
          stopTime: String(s?.stopTime ?? ""),
          note: String(s?.note ?? ""),
        }));
      }
    } catch {
      // ignore
    }
    return [];
  }, [value]);

  const apply = (next: { stopName: string; stopTime: string; note: string }[]) => {
    onChange(JSON.stringify(next));
  };

  const add = () => apply([...stops, { stopName: "", stopTime: "", note: "" }]);

  const update = (i: number, patch: Partial<{ stopName: string; stopTime: string; note: string }>) => {
    apply(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...stops];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    apply(next);
  };

  const remove = (i: number) => apply(stops.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {stops.map((s, i) => (
        <div key={i} className="space-y-1 rounded-lg border bg-muted/40 p-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> 정차 {i + 1}
            <div className="ml-auto flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" type="button" disabled={i === 0} onClick={() => move(i, -1)} title="위로">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" type="button" disabled={i === stops.length - 1} onClick={() => move(i, 1)} title="아래로">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" type="button" onClick={() => remove(i)} title="삭제">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={s.stopName}
              onChange={(e) => update(i, { stopName: e.target.value })}
              placeholder="정차 장소 (예: XX초등학교 정문)"
              className="flex-1"
            />
            <Input
              type="time"
              value={s.stopTime}
              onChange={(e) => update(i, { stopTime: e.target.value })}
              className="w-28"
              aria-label={`정차 시간 ${i + 1}`}
            />
          </div>
          <Input
            type="text"
            value={s.note}
            onChange={(e) => update(i, { note: e.target.value })}
            placeholder="메모 (예: 미리 10분 도착)"
            className="h-8 text-xs"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" type="button" className="w-full" onClick={add}>
        <Plus className="h-4 w-4" /> 정차 추가
      </Button>
      <p className="text-xs text-muted-foreground">
        출발지→도착지 순서로 승객을 태울 중간 정차 장소를 등록하세요. 기사님 앱에 순서대로 표시되고 음성으로 안내됩니다.
      </p>
    </div>
  );
}