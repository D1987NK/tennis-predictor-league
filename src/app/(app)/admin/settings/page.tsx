import { getCutoff } from "@/lib/services/settings";
import { CutoffSettingsForm } from "@/components/admin/cutoff-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const cutoff = await getCutoff();
  return (
    <div className="animate-fade-in">
      <CutoffSettingsForm enabled={cutoff.enabled} time={cutoff.time} />
    </div>
  );
}
