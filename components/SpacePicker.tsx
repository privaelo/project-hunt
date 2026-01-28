"use client";

import { useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type Space = {
  _id: Id<"focusAreas">;
  name: string;
  description?: string;
};

type SpaceOption = {
  id: Id<"focusAreas"> | "personal";
  label: string;
  description?: string;
};

interface SpacePickerProps {
  spaces: Space[] | undefined;
  selectedSpace: Id<"focusAreas"> | "personal" | null;
  onSelectionChange: (selected: Id<"focusAreas"> | "personal" | null) => void;
  currentUserName?: string;
}

export function SpacePicker({
  spaces,
  selectedSpace,
  onSelectionChange,
  currentUserName,
}: SpacePickerProps) {
  const allOptions = useMemo(() => {
    const options: SpaceOption[] = [];

    if (currentUserName) {
      options.push({
        id: "personal",
        label: `u/${currentUserName}`,
        description: "Your personal space",
      });
    }

    if (spaces) {
      for (const space of spaces) {
        options.push({
          id: space._id,
          label: `g/${space.name}`,
          description: space.description,
        });
      }
    }

    return options;
  }, [spaces, currentUserName]);

  const selectedOption = useMemo(
    () => allOptions.find((opt) => opt.id === selectedSpace) ?? null,
    [allOptions, selectedSpace]
  );

  return (
    <Combobox
      items={allOptions}
      itemToStringValue={(option: SpaceOption | null) => option?.label ?? ""}
      value={selectedOption}
      onValueChange={(option: SpaceOption | null) => {
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
          {allOptions.map((option) => (
            <ComboboxItem key={option.id} value={option}>
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
