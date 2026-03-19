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
  ComboboxSeparator,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { SpaceIcon } from "@/components/SpaceIcon";
import { CreateFocusAreaDialog } from "@/components/CreateFocusAreaDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Space = {
  _id: Id<"focusAreas">;
  name: string;
  description?: string;
  icon?: string;
};

type SpaceOption = {
  id: Id<"focusAreas"> | "personal";
  label: string;
  description?: string;
  icon?: string;
  name: string;
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
        label: "None",
        name: currentUserName,
        description: "Your personal space",
      });
    }

    if (spaces) {
      for (const space of spaces) {
        options.push({
          id: space._id,
          label: `g/${space.name}`,
          name: space.name,
          description: space.description,
          icon: space.icon,
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
      >
        {selectedOption && selectedOption.id !== "personal" && (
          <InputGroupAddon align="inline-start">
            <SpaceIcon icon={selectedOption.icon} name={selectedOption.name} size="sm" />
          </InputGroupAddon>
        )}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>No spaces found.</ComboboxEmpty>
        <ComboboxList>
          {allOptions.map((option) => (
            <ComboboxItem key={option.id} value={option}>
              <div className="flex items-center gap-2">
                {option.id !== "personal" && (
                  <SpaceIcon icon={option.icon} name={option.name} size="sm" />
                )}
                <span>{option.label}</span>
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxSeparator />
        <div className="p-1">
          <CreateFocusAreaDialog>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Plus className="h-4 w-4" />
              Create new space
            </Button>
          </CreateFocusAreaDialog>
        </div>
      </ComboboxContent>
    </Combobox>
  );
}
