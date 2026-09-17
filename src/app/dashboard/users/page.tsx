import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function UsersPage() {
  return <ResourceWrapper resource="users" headerActions={<ResourceExcelActions resource="users" />} />;
}