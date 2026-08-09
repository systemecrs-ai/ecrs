import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Database, FileText, LayoutDashboard, Package } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Products', href: '/admin/products', icon: Package, exact: false },
  { name: 'Data Ingestion', href: '/admin/ingestion', icon: Database, exact: false },
  { name: 'Documents', href: '/admin/docs', icon: FileText, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
        <Image
          src="/logo.jpg"
          alt="CartContext Logo"
          width={24}
          height={24}
          className="object-contain"
        />
        <div className="text-lg">
          <span className="font-semibold text-white tracking-tight">cart</span>
          <span className="font-light text-slate-300 tracking-tight">context</span>
          <span className="ml-2 text-sm text-white/50 font-normal">Admin</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-white/40'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 p-4 border border-indigo-500/20">
          <p className="text-xs font-medium text-indigo-300">System Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs text-white/70">All services operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
