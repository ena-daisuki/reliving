"use client";
import { Home, BarChart2, Mail, Video, Heart, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Mail, label: "Letters", href: "/letters" },
  { icon: Video, label: "Vlogs", href: "/vlogs" },
  { icon: Heart, label: "Memories", href: "/memories" },
  { icon: BarChart2, label: "Progress", href: "/progress" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center py-2 px-3 ${
                isActive ? "text-purple-600" : "text-gray-600"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
