import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function GuidesPage() {
  return <ResourceWrapper resource="guides" headerActions={<ResourceExcelActions resource="guides" />} />;
}