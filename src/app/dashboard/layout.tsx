import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { menuForRoleWithOverrides, parseRbacOverrides } from "@/lib/app-menus";
import { getSettings, setting } from "@/lib/settings";
import type { UserRole } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role as UserRole;
  if (role === "DRIVER" || role === "GUIDE") {
    redirect("/driver");
  }

  const settings = await getSettings();
  const overrides = parseRbacOverrides(setting(settings, "rbac.overrides"));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={menuForRoleWithOverrides(role, overrides)}
        user={{ name: session.user.name, email: session.user.email, role }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <MobileNav role={role} />
      </div>
    </div>
  );
}