"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface LinkItem {
  url: string;
  label: string;
}

interface LinksEditorProps {
  links: LinkItem[];
  onChange: (links: LinkItem[]) => void;
  disabled?: boolean;
}

export function LinksEditor({ links, onChange, disabled }: LinksEditorProps) {
  const updateLink = (index: number, field: keyof LinkItem, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const addLink = () => {
    onChange([...links, { url: "", label: "" }]);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">
        Links <span className="text-xs text-zinc-500">(optional)</span>
      </label>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(index, "url", e.target.value)}
                placeholder="https://example.com"
                disabled={disabled}
              />
              <Input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                placeholder="Label (optional, e.g. GitHub Repo)"
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
            {links.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-zinc-400 hover:text-zinc-600"
                onClick={() => removeLink(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={addLink}
        disabled={disabled}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add link
      </Button>
    </div>
  );
}
