"use client";

import { useRef, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { SpaceIcon } from "@/components/SpaceIcon";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";

type Space = {
  _id: Id<"focusAreas">;
  name: string;
  description?: string;
  icon?: string;
};

interface AdditionalSpacesPickerProps {
  spaces: Space[] | undefined;
  selectedSpaces: Id<"focusAreas">[];
  onSelectionChange: (selected: Id<"focusAreas">[]) => void;
  excludeSpaceId?: Id<"focusAreas"> | null;
}

export function AdditionalSpacesPicker({
  spaces,
  selectedSpaces,
  onSelectionChange,
  excludeSpaceId,
}: AdditionalSpacesPickerProps) {
  const chipsRef = useRef<HTMLDivElement | null>(null);

  const availableSpaces = useMemo(() => {
    if (!spaces) return [];
    return spaces.filter((s) => s._id !== excludeSpaceId);
  }, [spaces, excludeSpaceId]);

  const spaceMap = useMemo(() => {
    const map = new Map<string, Space>();
    for (const s of availableSpaces) {
      map.set(s._id as string, s);
    }
    return map;
  }, [availableSpaces]);

  const selectedSpaceObjects = useMemo(
    () =>
      selectedSpaces
        .map((id) => spaceMap.get(id as string))
        .filter((s): s is Space => s !== undefined),
    [selectedSpaces, spaceMap]
  );

  return (
    <Combobox
      items={availableSpaces}
      multiple
      value={selectedSpaceObjects}
      onValueChange={(selected) =>
        onSelectionChange((selected as Space[]).map((s) => s._id))
      }
      itemToStringValue={(space) => (space as Space).name}
    >
      <ComboboxChips ref={chipsRef}>
        <ComboboxValue>
          {selectedSpaceObjects.map((space) => (
            <ComboboxChip key={space._id}>
              <SpaceIcon icon={space.icon} name={space.name} size="sm" />
              g/{space.name}
            </ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput placeholder="Add spaces..." />
      </ComboboxChips>
      <ComboboxContent anchor={chipsRef}>
        <ComboboxEmpty>No spaces found.</ComboboxEmpty>
        <ComboboxList>
          {(space) => (
            <ComboboxItem key={(space as Space)._id} value={space as Space}>
              <SpaceIcon
                icon={(space as Space).icon}
                name={(space as Space).name}
                size="sm"
              />
              g/{(space as Space).name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
