import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Dashboard</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Dashboard implementation is outside the starter scope.
				</p>
			</CardContent>
		</Card>
	);
}
