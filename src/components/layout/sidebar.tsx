"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UploadCloud, Settings, FileText, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    color: "text-sky-500",
  },
  {
    label: 'Upload Invoice',
    icon: UploadCloud,
    href: '/upload',
    color: "text-violet-500",
  },
  {
    label: 'Reports',
    icon: PieChart,
    href: '/reports',
    color: "text-emerald-500",
  },
  {
    label: 'Clients (Profiles)',
    icon: FileText,
    href: '/clients',
    color: "text-orange-500",
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    color: "text-gray-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-gray-900 text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-4 bg-white rounded-lg flex items-center justify-center shadow-sm">
             <FileText className="text-blue-600 w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Tax OCR Pro
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <div className="px-6 py-4 border-t border-white/10">
        <div className="flex items-center bg-white/5 p-3 rounded-lg">
           <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-tr from-blue-500 to-purple-500 mr-3"></div>
           <div>
             <p className="text-sm font-medium">Accounting Firm</p>
             <p className="text-xs text-zinc-400">Pro Plan</p>
           </div>
        </div>
      </div>
    </div>
  );
}
