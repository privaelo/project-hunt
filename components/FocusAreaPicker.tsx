"use client";

import { useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  description?: string;
  group?: string;
};

type FocusAreasGrouped = Record<string, FocusArea[]>;

type FocusAreaOption = {
  id: Id<"focusAreas"> | "personal";
  label: string;
  description?: string;
  group: string;
};

interface FocusAreaPickerProps {
  focusAreasGrouped: FocusAreasGrouped | undefined;
  selectedFocusArea: Id<"focusAreas"> | "personal" | null;
  onSelectionChange: (selected: Id<"focusAreas"> | "personal" | null) => void;
  currentUserName?: string;
}

export function FocusAreaPicker({
  focusAreasGrouped,
  selectedFocusArea,
  onSelectionChange,
  currentUserName,
}: FocusAreaPickerProps) {
  const allOptions = useMemo(() => {
    const options: FocusAreaOption[] = [];

    if (currentUserName) {
      options.push({
        id: "personal",
        label: `u/${currentUserName}`,
        description: "Your personal space",
        group: "Personal",
      });
    }

    if (focusAreasGrouped) {
      for (const [group, areas] of Object.entries(focusAreasGrouped)) {
        for (const fa of areas) {
          options.push({
            id: fa._id,
            label: `g/${fa.name}`,
            description: fa.description,
            group,
          });
        }
      }
    }

    return options;
  }, [focusAreasGrouped, currentUserName]);

  const selectedOption = useMemo(
    () => allOptions.find((opt) => opt.id === selectedFocusArea) ?? null,
    [allOptions, selectedFocusArea]
  );

  const groupedOptions = useMemo(() => {
    const groups: Record<string, FocusAreaOption[]> = {};
    for (const opt of allOptions) {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    }
    return Object.entries(groups);
  }, [allOptions]);

  return (
    <Combobox
      items={allOptions}
      itemToStringValue={(option) => option.label}
      value={selectedOption}
      onValueChange={(option) => {
        onSelectionChange(option?.id ?? null);
      }}
    >
      <ComboboxInput
        placeholder="Select a space..."
        className="rounded-full bg-background h-11 max-w-xs"
      />
      <ComboboxContent>
        <ComboboxEmpty>No spaces found.</ComboboxEmpty>
        <ComboboxList>
          {groupedOptions.map(([group, options], i) => (
            <ComboboxGroup key={group}>
              {i > 0 && <ComboboxSeparator />}
              <ComboboxLabel>{group}</ComboboxLabel>
              {options.map((option) => (
                <ComboboxItem key={option.id} value={option}>
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
