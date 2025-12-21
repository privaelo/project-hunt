"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { signOut } from "@workos-inc/authkit-nextjs";
import { LogOut } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";


export function Header() {
  const { user } = useAuth();
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
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/submit" prefetch={false}>
                      Submit Project
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    {user?.firstName ?? "Profile"}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-2 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link 
                            href="/my-projects" 
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">My Projects</div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <button
                          onClick={() => signOut()}
                          className="flex w-full select-none items-center gap-2 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="text-sm font-medium leading-none">Log Out</span>
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
