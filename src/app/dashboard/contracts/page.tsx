import Link from "next/link";
import { ResourceWrapper } from "@/components/resource-wrapper";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function ContractsPage() {
  return (
    <ResourceWrapper
      resource="contracts"
      headerActions={
        <Button variant="outline" asChild>
          <Link href="/api/exports/contracts">
            <FileDown className="h-4 w-4" /> 엑셀 다운
          </Link>
        </Button>
      }
      rowLinks={[
        { href: "/contracts/{id}/print", title: "인쇄용 계약서", icon: "printer" },
        { href: "/api/exports/contract/{id}", title: "계약 엑셀", icon: "download" },
      ]}
    />
  );
}