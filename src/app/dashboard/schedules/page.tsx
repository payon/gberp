import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function SchedulesPage() {
  return <ResourceWrapper resource="schedules" headerActions={<ResourceExcelActions resource="schedules" />} />;
}