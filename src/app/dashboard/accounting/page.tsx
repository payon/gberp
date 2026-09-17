import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function AccountingPage() {
  return <ResourceWrapper resource="accounting" headerActions={<ResourceExcelActions resource="accounting" />} />;
}