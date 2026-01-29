"use client";

import Link from "next/link";
import { Authenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/useCurrentUser";
import { CreateFocusAreaDialog } from "./CreateFocusAreaDialog";
import { Plus, PlusCircle, Info } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

function SidebarSpaces() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const focusAreas = useQuery(
    api.users.getUserFocusAreas,
    user ? { userId: user._id } : "skip"
  );

  const loading = userLoading || focusAreas === undefined;

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel>Your Spaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading ? (
            <>
              <SidebarMenuSkeleton />
              <SidebarMenuSkeleton />
              <SidebarMenuSkeleton />
            </>
          ) : focusAreas && focusAreas.length > 0 ? (
            focusAreas.map((area) => (
              <SidebarMenuItem key={area._id}>
                <SidebarMenuButton asChild>
                  <Link href={`/space/${area._id}`}>
                    <span className="text-zinc-500 font-mono text-xs">g/</span>
                    <span>{area.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            <li className="px-2 py-3 text-xs text-zinc-400">
              You aren&apos;t following any spaces yet.
            </li>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <Authenticated>
        <SidebarHeader className="p-4">
          <SidebarMenu className="gap-0">
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link href="/submit">
                  <PlusCircle className="h-4 w-4" />
                  <span>Share a Tool</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <CreateFocusAreaDialog>
                <SidebarMenuButton size="lg">
                  <Plus className="h-4 w-4" />
                  <span>Create a Space</span>
                </SidebarMenuButton>
              </CreateFocusAreaDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-4">
          <SidebarSpaces />
        </SidebarContent>

        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/about">
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Authenticated>
    </Sidebar>
  );
}
