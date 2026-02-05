"use client";

import Link from "next/link";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useMutation,
  useQuery,
} from "convex/react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { signOut } from "@workos-inc/authkit-nextjs";
import { Bell, LogOut, User, Sparkles, PlusCircle } from "lucide-react";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { ChatInterface } from "./ChatInterface";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}


export function Header() {
  const { user } = useAuth();
  const { user: convexUser } = useCurrentUser();
  const notifications = useQuery(api.notifications.getNotifications, { limit: 8 }) ?? [];
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount) ?? 0;
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleNotificationsOpen = (open: boolean) => {
    if (!open || unreadCount === 0) {
      return;
    }
    void markAllRead({});
  };

  const renderNotificationText = (notification: (typeof notifications)[number]) => {
    const projectName = notification.projectName ?? "your tool";
    if (notification.type === "upvote") {
      const count = notification.count ?? 1;
      if (count > 1) {
        const others = count - 1;
        const suffix = others === 1 ? "other" : "others";
        return `${notification.actorName} and ${others} ${suffix} upvoted ${projectName}`;
      }
      return `${notification.actorName} upvoted ${projectName}`;
    }

    if (notification.type === "adoption") {
      return `${notification.actorName} is using ${projectName}`;
    }

    if (notification.type === "project_update") {
      return `${notification.actorName} updated ${projectName}`;
    }

    const verb = notification.isReply ? "replied on" : "commented on";
    return `${notification.actorName} ${verb} ${projectName}`;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Garden Logo/Name */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            style={{ fontFamily: 'var(--font-chonburi)' }}
          >
            Garden
          </Link>
        </div>

        <Authenticated>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="inline-flex h-9 w-80 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-zinc-50 px-3 text-sm font-normal text-zinc-500 shadow-sm hover:bg-zinc-100 hover:text-zinc-900 transition-all ring-2 ring-emerald-500/20"
                  aria-label="Search tools"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Find a tool</span>
                </button>
              </DialogTrigger>
              <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-3xl w-[90vw]">
                <VisuallyHidden>
                  <DialogTitle>Find Tools</DialogTitle>
                </VisuallyHidden>
                <ChatInterface />
              </DialogContent>
            </Dialog>
        </Authenticated>

        {/* Right: Navigation Menu & Auth Buttons */}
        <div className="flex items-center gap-3">
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <Authenticated>
                <NavigationMenuItem>
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/40 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                    aria-label="Share a tool"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Share</span>
                  </Link>
                </NavigationMenuItem>
              </Authenticated>
              <Authenticated>
                <NavigationMenuItem>
                  <Popover onOpenChange={handleNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`${navigationMenuTriggerStyle()} relative w-9 px-0`}
                        aria-label="Open notifications"
                      >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">
                        Notifications
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-zinc-500">
                          No notifications yet.
                        </div>
                      ) : (
                        <div className="max-h-96 divide-y divide-zinc-100 overflow-auto">
                          {notifications.map((notification) => {
                            const href = `/project/${notification.projectId}${
                              notification.type === "comment" ? "#discussion" : ""
                            }`;
                            return (
                              <Link
                                key={notification._id}
                                href={href}
                                className={`flex items-start gap-3 px-4 py-3 text-sm transition hover:bg-zinc-50 ${
                                  notification.isRead
                                    ? "text-zinc-600"
                                    : "bg-zinc-50 text-zinc-900"
                                }`}
                              >
                                <Avatar className="h-8 w-8 bg-zinc-100">
                                  <AvatarImage
                                    src={notification.actorAvatar}
                                    alt={notification.actorName}
                                  />
                                  <AvatarFallback className="text-xs font-semibold text-zinc-600">
                                    {notification.actorName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="leading-snug">
                                    {renderNotificationText(notification)}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {timeAgo(notification.lastActivityAt)}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </NavigationMenuItem>
              </Authenticated>

              <Authenticated>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    {user?.firstName ?? "Profile"}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[180px] p-1">
                      {convexUser && (
                        <li>
                          <NavigationMenuLink asChild>
                            <Link 
                              href={`/profile/${convexUser._id}`} 
                              className="flex flex-row w-full select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium leading-none text-zinc-700 no-underline outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900"
                            >
                              <User className="h-4 w-4" />
                              <span>Profile</span>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      )}
                      <li>
                        <button
                          onClick={() => signOut()}
                          className="flex w-full select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium leading-none text-zinc-700 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Log Out</span>
                        </button>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </Authenticated>
            </NavigationMenuList>
          </NavigationMenu>
          <Unauthenticated>
            <Button size="sm" asChild>
              <Link href="/sign-in" prefetch={false}>
                Sign In
              </Link>
            </Button>
            <Link href="/sign-up" prefetch={false}>
              <Button size="sm">
                Sign Up
              </Button>
            </Link>
          </Unauthenticated>

          <AuthLoading>
            <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200" />
          </AuthLoading>
        </div>
      </div>
    </header>
  );
}
