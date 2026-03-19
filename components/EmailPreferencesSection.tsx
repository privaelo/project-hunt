"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PREFERENCES = [
  {
    key: "weeklyDigest" as const,
    label: "Weekly digest",
    description: "A weekly summary of activity across the platform",
  },
  {
    key: "spaceActivity" as const,
    label: "Space activity",
    description: "New projects and threads posted in spaces you follow",
  },
  {
    key: "projectActivity" as const,
    label: "Project activity",
    description: "Comments on your tools, and updates from tools you follow",
  },
];

export function EmailPreferencesSection() {
  const prefs = useQuery(api.emails.getEmailPreferences);
  const updatePrefs = useMutation(api.emails.updateEmailPreferences);

  if (!prefs) return null;

  const handleToggle = async (
    key: "weeklyDigest" | "spaceActivity" | "projectActivity",
    checked: boolean
  ) => {
    try {
      await updatePrefs({ [key]: checked });
      toast.success("Email preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900">
        Email notifications
      </h2>
      <Card className="border-zinc-200 bg-zinc-200/80 shadow-none">
        <CardContent className="divide-y divide-zinc-200 px-6 py-2">
          {PREFERENCES.map((pref) => (
            <div
              key={pref.key}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor={pref.key}
                  className="text-sm font-medium text-zinc-900"
                >
                  {pref.label}
                </Label>
                <p className="text-sm text-zinc-500">{pref.description}</p>
              </div>
              <Switch
                id={pref.key}
                checked={prefs[pref.key]}
                onCheckedChange={(checked) => handleToggle(pref.key, checked)}
                className="data-[state=unchecked]:bg-zinc-400"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
