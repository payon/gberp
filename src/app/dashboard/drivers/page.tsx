import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function DriversPage() {
  return <ResourceWrapper resource="drivers" headerActions={<ResourceExcelActions resource="drivers" />} />;
}