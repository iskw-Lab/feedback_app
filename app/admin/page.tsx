"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  PlusCircle,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Staff = {
  id: string;
  name: string;
  floor: string;
  profile_id: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("all");

  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // ★★★ ここからが修正箇所 ★★★
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // 1. ログイン状態を確認
      const { data: { user } } = await supabase.auth.getUser();

      // 2. ログインしていなければトップページにリダイレクト
      if (!user) {
        router.push('/');
        return;
      }
      
      // 3. ログインしていれば、スタッフ情報を取得
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_member")
        .select(`
          id,
          floor,
          profile_id:staff_profiles (id, name)
        `);

      if (error) {
        setError("スタッフ情報の取得に失敗しました。");
        console.error(error);
      } else if (data) {
        const formattedData = data.map((item) => {
          const profile = Array.isArray(item.profile_id)
            ? item.profile_id[0]
            : item.profile_id;
          return {
            id: item.id,
            floor: item.floor,
            profile_id: profile?.id || "",
            name: profile?.name || "名前不明",
          };
        }).filter((staff) => staff.profile_id);

        setAllStaff(formattedData);
      }
      setLoading(false);
    };

    checkAuthAndFetch();
  }, [supabase, router]);
  // ★★★ ここまでが修正箇所 ★★★

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newFloor) {
      setError("スタッフ名とフロアの両方を入力してください。");
      return;
    }
    const isDuplicate = allStaff.some((staff) =>
      staff.name.trim() === newName.trim()
    );
    if (isDuplicate) {
      setError(`「${newName}」さんは既に登録されています。`);
      return;
    }
    setIsProcessing(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, floor: newFloor }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "スタッフの追加に失敗しました。");
      }
      setSuccessMessage(`「${newName}」さんを登録しました。`);
      setNewName("");
      setNewFloor("");
      // Refresh staff list
      const { data } = await supabase.from("staff_member").select(`id,floor,profile_id:staff_profiles (id, name)`);
      if (data) {
          const formattedData = data.map((item: any) => ({
              id: item.id,
              floor: item.floor,
              profile_id: item.profile_id?.id || "",
              name: item.profile_id?.name || "名前不明",
          })).filter((staff: any) => staff.profile_id);
          setAllStaff(formattedData);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProfileIds.length === 0) return;
    setIsProcessing(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_ids: selectedProfileIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "スタッフの削除に失敗しました。");
      }
      setSuccessMessage(
        `${selectedProfileIds.length}名のスタッフを削除しました。`,
      );
      setSelectedProfileIds([]);
      // Refresh staff list
       const { data } = await supabase.from("staff_member").select(`id,floor,profile_id:staff_profiles (id, name)`);
      if (data) {
          const formattedData = data.map((item: any) => ({
              id: item.id,
              floor: item.floor,
              profile_id: item.profile_id?.id || "",
              name: item.profile_id?.name || "名前不明",
          })).filter((staff: any) => staff.profile_id);
          setAllStaff(formattedData);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigateToFeedback = (staffMember: Staff) => {
    router.push(
      `/feedback?floor=${staffMember.floor}&staffId=${staffMember.id}&staffName=${staffMember.name}&profileId=${staffMember.profile_id}`,
    );
  };

  const filteredStaff = useMemo(() => {
    return allStaff
      .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter((s) => selectedFloor === "all" || s.floor === selectedFloor);
  }, [allStaff, searchQuery, selectedFloor]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfileIds(filteredStaff.map((s) => s.id));
    } else {
      setSelectedProfileIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProfileIds((prev) => [...prev, id]);
    } else {
      setSelectedProfileIds((prev) =>
        prev.filter((profileId) => profileId !== id)
      );
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <PlusCircle className="w-5 h-5 mr-2" />
            新規スタッフ登録
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                placeholder="名前 (必須)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Select value={newFloor} onValueChange={setNewFloor}>
                <SelectTrigger>
                  <SelectValue placeholder="フロアを選択 (必須)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1F">1F</SelectItem>
                  <SelectItem value="2F">2F</SelectItem>
                  <SelectItem value="小規模多機能">小規模多機能</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <LoadingSpinner /> : "登録する"}
              </Button>
            </div>
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Users className="w-5 h-5 mr-2" />
            スタッフ一覧
          </CardTitle>
          <CardDescription>登録されているスタッフの一覧です。</CardDescription>
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="名前で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="フロアで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのフロア</SelectItem>
                <SelectItem value="1F">1F</SelectItem>
                <SelectItem value="2F">2F</SelectItem>
                <SelectItem value="小規模多機能">小規模多機能</SelectItem>
              </SelectContent>
            </Select>

            {selectedProfileIds.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    選択した{selectedProfileIds.length}名を削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      {selectedProfileIds.length}
                      名のスタッフデータを完全に削除します。この操作は元に戻せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      削除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedProfileIds.length > 0 &&
                      selectedProfileIds.length === filteredStaff.length
                    }
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>フロア</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow
                  key={staff.id}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="w-[50px]"
                  >
                    <Checkbox
                      checked={selectedProfileIds.includes(staff.id)}
                      onCheckedChange={(checked) =>
                        handleSelectRow(staff.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell onClick={() => handleNavigateToFeedback(staff)}>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      {staff.name}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleNavigateToFeedback(staff)}>
                    {staff.floor}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}