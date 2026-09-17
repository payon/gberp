import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Bus,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  const features = [
    { icon: CalendarClock, title: "배차 엔진", desc: "중복 배차 방지, 법정 휴식시간 준수, 추천 점수 기반 배정" },
    { icon: Users, title: "고객/계약 관리", desc: "관공서·학교·기업·개인 거래처와 계약금/잔금 관리" },
    { icon: Bus, title: "차량/기사/가이드", desc: "자차·외주 차량, 기사 근무조건, 가이드 전문분야 관리" },
    { icon: ShieldCheck, title: "회계 & 감사", desc: "더존 연동 대비 표준 분개 구조, 전체 변경 이력 감사 로그" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            종합여행사 ERP
          </div>
          <Button asChild variant="outline">
            <a href="/login">
              로그인
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            여행사의 모든 업무,
            <br />
            <span className="text-primary">한 곳에서 관리하세요.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            상품·일정·배차·정산·회계까지. 관공서·학교 수송 업무와 더존 연동까지
            대비한 한국 여행사 전용 통합 ERP 플랫폼입니다.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild size="lg">
              <a href="/login">시스템 입장하기</a>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <f.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 종합여행사 ERP 시스템. 관공서 제출 문서 · 감사 로그 지원.
      </footer>
    </div>
  );
}