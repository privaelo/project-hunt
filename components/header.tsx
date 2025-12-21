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
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { signOut } from "@workos-inc/authkit-nextjs";
import { Bell, LogOut, User } from "lucide-react";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
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
    const projectName = notification.projectName ?? "your project";
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
      return `${notification.actorName} adopted ${projectName}`;
    }

    const verb = notification.isReply ? "replied on" : "commented on";
    return `${notification.actorName} ${verb} ${projectName}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Garden Logo/Name */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl font-semibold text-zinc-900 hover:text-zinc-700 transition-colors"
          >
            Garden
          </Link>
        </div>

        {/* Center: Search Bar */}
        <Authenticated>
          <div className="hidden md:flex flex-1 max-w-md mx-8 justify-center">
            <SearchBar className="w-full" />
          </div>
        </Authenticated>

        {/* Right: Navigation Menu & Auth Buttons */}
        <div className="flex items-center gap-3">
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/about" prefetch={false}>
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

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
                    <PopoverContent align="end" className="w-80 p-0">
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
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/submit" prefetch={false}>
                      Submit Project
                    </Link>
                  </NavigationMenuLink>
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

      {/* Mobile Search Bar - show only if authenticated */}
      <Authenticated>
        <div className="md:hidden border-t border-zinc-200 px-4 py-3 bg-white">
          <SearchBar className="w-full" />
        </div>
      </Authenticated>
    </header>
  );
}
