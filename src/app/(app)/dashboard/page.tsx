"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, Video, Heart, Send, Upload, BarChart2 } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

const quickActions = [
  {
    icon: Mail,
    label: "Read Letters",
    href: "letters/read",
    color: "text-pink-500",
  },
  { icon: Video, label: "Watch Vlogs", href: "vlogs", color: "text-blue-500" },
  {
    icon: Heart,
    label: "View Memories",
    href: "memories",
    color: "text-red-500",
  },
  {
    icon: Send,
    label: "Write a Letter",
    href: "letters/write",
    color: "text-purple-500",
  },
  {
    icon: Upload,
    label: "Upload a Vlog",
    href: "vlogs/upload",
    color: "text-indigo-500",
  },
  {
    icon: BarChart2,
    label: "See Progress",
    href: "progress",
    color: "text-green-500",
  },
];

const recentActivity = [
  {
    type: "letter",
    title: "Morning Love Letter",
    date: "2 hours ago",
    icon: "📜",
  },
  {
    type: "vlog",
    title: "Our Weekend Together",
    date: "Yesterday",
    icon: "🎥",
  },
  {
    type: "memory",
    title: "Beach Day Photos",
    date: "3 days ago",
    icon: "📸",
  },
];

export default function Dashboard() {
  const { userType } = useAuth();
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleAction = (action: string) => {
    // Strip out everything after the first slash
    const basePath = action.split("/")[0];
    router.push(`/${basePath}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <PageTitle>
          Welcome Back, {userType === "owner" ? "Love" : "Special One"} 💖
        </PageTitle>
        <p className="text-white/80 -mt-4">{today}</p>
      </div>

      {/* Featured Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-white/90 hover:bg-white transition-colors cursor-pointer">
          <h3 className="font-semibold mb-2">Latest Letter 💌</h3>
          <p className="text-gray-600 line-clamp-3">
            Click to read your latest love letter...
          </p>
        </Card>
        <Card className="p-6 bg-white/90 hover:bg-white transition-colors cursor-pointer">
          <h3 className="font-semibold mb-2">Latest Vlog 🎥</h3>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-6 bg-white/90 hover:bg-white transition-colors cursor-pointer">
          <h3 className="font-semibold mb-2">Latest Memory 📸</h3>
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <Heart className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              onClick={() => handleAction(action.href)}
              className="h-24 flex-col bg-white/90 hover:bg-white text-gray-800 transition-all hover:scale-105"
            >
              <action.icon className={`w-6 h-6 ${action.color}`} />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Recent Activity
        </h2>
        <Card className="bg-white/90">
          <div className="divide-y">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="p-4 flex items-center space-x-4 hover:bg-gray-50 cursor-pointer"
              >
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium">{activity.title}</h3>
                  <p className="text-sm text-gray-500">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Motivational Message */}
      <Card className="p-6 bg-white/90 text-center">
        <p className="text-lg text-gray-700">
          &quot;Hey, remember our first date? That nervous excitement, those
          butterflies... Every moment with you still feels just as special. 💖
          &quot;
        </p>
      </Card>
    </div>
  );
}
