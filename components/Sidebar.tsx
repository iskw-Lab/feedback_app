"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Home, Users, BookUser, Settings, Upload, ClipboardCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

// ★★★ 変更点(1): onClose関数をpropsとして受け取るように変更 ★★★
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin') {
          setIsAdmin(true);
        } else {
          const { data: staffProfile } = await supabase.from('staff_profiles').select('id').eq('user_id', user.id).single();
          if (staffProfile) {
            setUserProfileId(staffProfile.id);
          }
        }
      }
    };
    checkUserRole();
  }, [supabase]);

  const adminLinks: NavLink[] = [
    { href: "/feedback", label: "スタッフ情報", icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/resident-info", label: "利用者情報", icon: <BookUser className="h-5 w-5" /> },
    { href: "/admin", label: "スタッフ管理", icon: <Settings className="h-5 w-5" /> },
    { href: "/recipients", label: "利用者管理", icon: <Users className="h-5 w-5" /> },
    { href: "/upload", label: "ファイルアップロード", icon: <Upload className="h-5 w-5" /> },
  ];

  const staffLinks: NavLink[] = [
    { href: "/my-feedback", label: "スタッフ情報", icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/resident-info", label: "利用者情報", icon: <BookUser className="h-5 w-5" /> },
    { href: userProfileId ? `/checklist/${userProfileId}` : "#", label: "チェック表", icon: <ClipboardCheck className="h-5 w-5" /> },
  ];
  
  const linksToRender = isAdmin ? adminLinks : staffLinks;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gray-100">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-700">メニュー</h2>
      </div>
      <nav className="flex-1 space-y-2 px-2">
        {linksToRender.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            // ★★★ 変更点(2): リンククリック時にonCloseを実行 ★★★
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900",
              pathname === link.href && "bg-green-200 text-green-900"
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}