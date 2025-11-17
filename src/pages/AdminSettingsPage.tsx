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
    admin_open_registration: false,
    email_from: "",
    email_from_name: "",
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
        admin_open_registration: data.admin_open_registration || false,
        email_from: data.email_from || "",
        email_from_name: data.email_from_name || "",
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

      {/* Admin Access */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Admin Access</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.admin_open_registration}
            onChange={(e) => setForm({ ...form, admin_open_registration: e.target.checked })}
            disabled={!isSuperAdmin}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="font-medium text-gray-900">Open admin registration</div>
            <div className="text-sm text-gray-600">
              If enabled, anyone can request admin access. Otherwise, only super admins can promote users.
            </div>
          </div>
        </label>
      </section>

      {/* Email Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Email Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sender Name
            </label>
            <Input
              type="text"
              value={form.email_from_name}
              onChange={(e) => setForm({ ...form, email_from_name: e.target.value })}
              placeholder="Improve My City"
              disabled={!isSuperAdmin}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Display name for email sender
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sender Email Address
            </label>
            <Input
              type="email"
              value={form.email_from}
              onChange={(e) => setForm({ ...form, email_from: e.target.value })}
              placeholder="noreply@example.com"
              disabled={!isSuperAdmin}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email address for sending
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          All transactional emails (verification, reset, status updates) will use these settings
        </p>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Notifications</h3>
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
