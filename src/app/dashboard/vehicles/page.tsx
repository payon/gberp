import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function VehiclesPage() {
  return <ResourceWrapper resource="vehicles" headerActions={<ResourceExcelActions resource="vehicles" />} />;
}