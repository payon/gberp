import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function SettlementsPage() {
  return <ResourceWrapper resource="settlements" headerActions={<ResourceExcelActions resource="settlements" />} />;
}