"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// shadcn/uiコンポーネントをインポート
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Mail, Lock } from "lucide-react"; // MailとLockアイコンをインポート

// --- LoginFormコンポーネント ---
const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("メールアドレスまたはパスワードが間違っています。");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          {/* ★★★ ここからが変更箇所 ★★★ */}
          <Label htmlFor="email" className="flex items-center font-semibold text-gray-700">
            {/* mr-2クラスを削除 */}
            <Mail className="h-4 w-4" />
            メールアドレス
          </Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="h-11 text-base rounded-md border-gray-300"
          />
        </div>
        <div className="space-y-2">
          {/* ★★★ ここからが変更箇所 ★★★ */}
          <Label htmlFor="password" className="flex items-center font-semibold text-gray-700">
            {/* mr-2クラスを削除 */}
            <Lock className="h-4 w-4" />
            パスワード
          </Label>
          <Input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="h-11 text-base rounded-md border-gray-300"
          />
        </div>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        
        <div className="flex items-center justify-center pt-2">
            <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 h-9 px-5 py-2 text-sm rounded-md shadow"
                disabled={isLoading}
            >
                {isLoading ? <LoadingSpinner /> : "ログイン"}
            </Button>
        </div>
      </form>
    </div>
  );
};

// --- 新しいホームページ ---
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      {/* ロゴ部分 */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-green-700">
          ログイン
        </h1>
      </div>

      {/* ログインフォームのボックス */}
      <main className="w-full max-w-sm bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <LoginForm />
      </main>
    </div>
  );
}

