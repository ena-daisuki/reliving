"use client";

import {
  Home,
  Book,
  BarChart2,
  Mail,
  Video,
  Heart,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Book, label: "Journal", href: "/journal" },
  { icon: Mail, label: "Letters", href: "/letters" },
  { icon: Video, label: "Vlogs", href: "/vlogs" },
  { icon: Heart, label: "Memories", href: "/memories" },
  { icon: BarChart2, label: "Progress", href: "/progress" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex flex-col w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600">Reliving</h1>
        <p className="text-sm text-gray-500 mt-1">Our Journey Together</p>
      </div>
      <nav className="flex-1 p-4">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-purple-200" />
          <div>
            <p className="font-medium text-gray-900">Your Name</p>
            <p className="text-sm text-gray-500">View Profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
