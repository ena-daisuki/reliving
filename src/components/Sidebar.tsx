"use client";

//import { getCookie } from "@/lib/cookies";
import { Home, Mail, Video, Heart, Menu, X, LogOut } from "lucide-react"; // Settings,
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Mail, label: "Letters", href: "/letters" },
  { icon: Video, label: "Vlogs", href: "/vlogs" },
  { icon: Heart, label: "Memories", href: "/memories" },
  // { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  //const userType = getCookie("user-type");
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden absolute top-4 right-4 z-50 p-2 rounded-lg bg-white/90 text-purple-600"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transform transition-transform duration-200 ease-in-out absolute md:fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-40 flex flex-col`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-purple-600">Reliving</h1>
          <p className="text-sm text-gray-500 mt-1">Our Time Together</p>
        </div>
        {/* <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-purple-200" />
            <div>
              <p className="font-medium text-gray-900">
                {userType === "special" ? "Ena" : "Katsuo"}
              </p>
              <p className="text-sm text-gray-500">View Profile</p>
            </div>
          </div>
        </div> */}
        <nav className="flex-1 p-4">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
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
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
