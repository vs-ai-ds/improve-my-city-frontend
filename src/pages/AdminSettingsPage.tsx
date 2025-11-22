import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "../services/apiClient";
import { useAuth } from "../store/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToast } from "../components/toast/ToastProvider";

async function getSettings() {
  const { data } = await api.get("/admin/settings");
  return data;
}

async function updateSettings(payload: any) {
  const { data } = await api.put("/admin/settings", payload);
  return data;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: getSettings });
  const mut = useMutation({ 
    mutationFn: updateSettings, 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.show("Settings updated successfully");
    },
    onError: (err: any) => {
      toast.show(err?.response?.data?.detail || "Failed to update settings");
    }
  });

  const [form, setForm] = useState({
    allow_anonymous_reporting: false,
    require_email_verification: true,
    sla_hours: 48,
    sla_reminder_hours: 24,
    city_logo_url: "",
    support_email: "",
    website_url: "",
    auto_email_on_status_change: true,
    push_notifications_enabled: true,
    features: {
      allow_comments: true,
      show_top_contributors: true,
      enable_chat_bot: true,
      enable_web_push_citizens: false,
      enable_web_push_staff: false,
    } as Record<string, any>,
  });

  useEffect(() => {
    if (data) {
      setForm({
        allow_anonymous_reporting: data.allow_anonymous_reporting || false,
        require_email_verification: data.require_email_verification ?? true,
        sla_hours: data.sla_hours || 48,
        sla_reminder_hours: data.sla_reminder_hours || 24,
        city_logo_url: data.city_logo_url || "",
        support_email: data.support_email || "",
        website_url: data.website_url || "",
        auto_email_on_status_change: data.auto_email_on_status_change !== false,
        push_notifications_enabled: data.push_notifications_enabled !== false,
        features: data.features || {
          allow_comments: true,
          show_top_contributors: true,
          enable_chat_bot: true,
          enable_web_push_citizens: false,
          enable_web_push_staff: false,
        },
      });
    }
  }, [data]);

  const handleSave = () => {
    if (user?.role !== "super_admin") {
      toast.show("Only super admins can update settings");
      return;
    }
    mut.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-gray-600">Loading settings…</p>
      </div>
    );
  }

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Application Settings</h2>
        {data?.updated_at && (
          <span className="text-sm text-gray-500">
            Last updated: {new Date(data.updated_at).toLocaleString()}
          </span>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            Only super admins can modify settings. You can view current settings below.
          </p>
        </div>
      )}

      {/* Reporting Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Reporting</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.allow_anonymous_reporting}
            onChange={(e) => setForm({ ...form, allow_anonymous_reporting: e.target.checked })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Allow anonymous reporting</div>
            <div className="text-sm text-gray-600">
              If disabled, users must log in before submitting reports
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.require_email_verification}
            onChange={(e) => setForm({ ...form, require_email_verification: e.target.checked })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Require email verification</div>
            <div className="text-sm text-gray-600">
              Users must verify their email before logging in
            </div>
          </div>
        </label>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Notifications</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.auto_email_on_status_change}
            onChange={(e) => setForm({ ...form, auto_email_on_status_change: e.target.checked })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Auto-email on status change</div>
            <div className="text-sm text-gray-600">
              Automatically send email notifications when issue status changes
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.push_notifications_enabled}
            onChange={(e) => setForm({ ...form, push_notifications_enabled: e.target.checked })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Enable push notifications</div>
            <div className="text-sm text-gray-600">
              Allow users to receive browser push notifications
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.features.enable_web_push_citizens || false}
            onChange={(e) => setForm({
              ...form,
              features: { ...form.features, enable_web_push_citizens: e.target.checked }
            })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Enable web push for citizens</div>
            <div className="text-sm text-gray-600">
              Allow citizens to receive push notifications for issue updates
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.features.enable_web_push_staff || false}
            onChange={(e) => setForm({
              ...form,
              features: { ...form.features, enable_web_push_staff: e.target.checked }
            })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Enable web push for staff/admin</div>
            <div className="text-sm text-gray-600">
              Allow staff and admins to receive push notifications
            </div>
          </div>
        </label>
      </section>

      {/* SLA Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">SLA Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default SLA (hours)
            </label>
            <Input
              type="number"
              value={form.sla_hours}
              onChange={(e) => setForm({ ...form, sla_hours: parseInt(e.target.value) || 48 })}
              placeholder="48"
              disabled={!isSuperAdmin}
              className="w-full"
              min="1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Default time to resolve issues (in hours)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SLA Reminder (hours before)
            </label>
            <Input
              type="number"
              value={form.sla_reminder_hours}
              onChange={(e) => setForm({ ...form, sla_reminder_hours: parseInt(e.target.value) || 24 })}
              placeholder="24"
              disabled={!isSuperAdmin}
              className="w-full"
              min="1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Send reminder X hours before SLA breach
            </p>
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City Logo URL
            </label>
            <Input
              type="url"
              value={form.city_logo_url}
              onChange={(e) => setForm({ ...form, city_logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              disabled={!isSuperAdmin}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL to your city logo image
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support Email
            </label>
            <Input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              placeholder="support@example.com"
              disabled={!isSuperAdmin}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Support contact email for users
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <Input
              type="url"
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder="https://example.com"
              disabled={!isSuperAdmin}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Official city website URL
            </p>
          </div>
        </div>
      </section>

      {/* Region Management */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Region Management</h3>
        <p className="text-sm text-gray-600">
          Region management is handled in the Users & Staff page. Assign regions to staff members to enable auto-assignment of issues.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> To manage regions, go to Users & Staff page and click on a staff member's region count to assign/unassign regions.
          </p>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Feature Flags</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.features.allow_comments !== false}
            onChange={(e) => setForm({
              ...form,
              features: { ...form.features, allow_comments: e.target.checked }
            })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="font-medium text-gray-900">Allow comments on issues</div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.features.show_top_contributors !== false}
            onChange={(e) => setForm({
              ...form,
              features: { ...form.features, show_top_contributors: e.target.checked }
            })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="font-medium text-gray-900">Show top contributors</div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.features.enable_chat_bot !== false}
            onChange={(e) => setForm({
              ...form,
              features: { ...form.features, enable_chat_bot: e.target.checked }
            })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="font-medium text-gray-900">Enable chat bot</div>
        </label>
      </section>

      {isSuperAdmin && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={mut.isPending}
            className="px-6 py-2.5"
          >
            {mut.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
