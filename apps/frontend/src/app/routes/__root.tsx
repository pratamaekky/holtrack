import { createRootRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Package, Warehouse } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { AppProviders } from "@/app/providers";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRoute({
	component: RootLayout,
});

interface NavigationItem {
	icon: ComponentType<{ className?: string }>;
	label: string;
	to: string;
}

interface NavigationSection {
	items: NavigationItem[];
	label: string;
}

const navigationSections: NavigationSection[] = [
	{
		label: "Master Data",
		items: [
			{ icon: Package, label: "Items", to: "/items" },
			{ icon: Warehouse, label: "Warehouses", to: "/warehouses" },
		],
	},
];

function RootLayout() {
	const location = useLocation();
	const sidebarSections = useMemo(() => getSidebarSections(location.pathname), [location.pathname]);

	return (
		<AppProviders>
			<TooltipProvider>
				<SidebarProvider>
					<Sidebar collapsible="icon">
						<SidebarHeader className="px-4 py-4">
							<h1 className="text-base font-semibold tracking-tight">Mini WMS</h1>
						</SidebarHeader>
						<SidebarContent>{sidebarSections}</SidebarContent>
					</Sidebar>
					<SidebarInset>
						<header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
							<SidebarTrigger />
							<span className="font-semibold">Mini WMS</span>
						</header>
						<main className="grid gap-4 p-4 md:p-8">
							<Outlet />
						</main>
					</SidebarInset>
					<Toaster />
				</SidebarProvider>
			</TooltipProvider>
		</AppProviders>
	);
}

function getSidebarSections(pathname: string) {
	return navigationSections.map((section) => (
		<SidebarGroup key={section.label}>
			<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>{getSidebarItems(section.items, pathname)}</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	));
}

function getSidebarItems(items: NavigationItem[], pathname: string) {
	return items.map((item) => {
		const Icon = item.icon;
		const isActive = isActivePath(pathname, item.to);

		return (
			<SidebarMenuItem key={item.to}>
				<SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
					<Link to={item.to}>
						<Icon aria-hidden="true" />
						<span>{item.label}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	});
}

function isActivePath(pathname: string, itemPath: string) {
	return pathname.startsWith(itemPath);
}
