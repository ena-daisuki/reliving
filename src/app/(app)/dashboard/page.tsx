import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";

export default function Dashboard() {
  return (
    <div className="pb-16">
      <header className="bg-purple-600 text-white p-4">
        <h1 className="text-2xl font-bold">Welcome back, User!</h1>
      </header>
      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Journal</CardTitle>
          </CardHeader>
          <CardContent>
            <p>How are you feeling today?</p>
            {/* Add a quick journal entry form here */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You&apos;ve been smoke-free for 7 days!</p>
            {/* Add a progress visualization here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Memories</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add a list or grid of recent memories here */}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
