"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit,
  HelpCircle,
  PlusCircle,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// Type Definition
type Recipient = {
  id: string;
  name: string;
  floor: string;
  careplan: string;
};

export default function RecipientsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newName, setNewName] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newCareplan, setNewCareplan] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [careplanText, setCareplanText] = useState("");
  
  // ★★★ 追加: 一括削除用のState ★★★
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();

  const fetchRecipients = async () => {
    try {
      const response = await fetch("/api/recipients");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAllRecipients(data);
    } catch (error: any) {
      setError(`利用者一覧の取得に失敗しました: ${error.message}`);
    }
  };

  useEffect(() => {
    const checkUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        await fetchRecipients();
        setLoading(false);
      }
    };
    checkUserAndData();
  }, [router, supabase]);

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newFloor) {
      setError("利用者名とフロアを入力してください。");
      return;
    }
    const isDuplicate = allRecipients.some(recipient => recipient.name.trim() === newName.trim());
    if (isDuplicate) {
      setError(`「${newName}」さんは既に登録されています。`);
      return;
    }
    setIsProcessing(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          floor: newFloor,
          careplan: newCareplan,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setSuccessMessage(`「${newName}」さんを追加しました。`);
      setNewName("");
      setNewFloor("");
      setNewCareplan("");
      await fetchRecipients();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // ★★★ 追加: 一括削除処理 ★★★
  const handleBulkDelete = async () => {
    if (selectedRecipientIds.length === 0) return;
    setIsProcessing(true);
    setError("");
    setSuccessMessage("");
    try {
      // APIがIDの配列を受け取れるように改修されている想定
      const response = await fetch("/api/recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRecipientIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccessMessage(`${selectedRecipientIds.length}名の利用者を削除しました。`);
      setSelectedRecipientIds([]);
      await fetchRecipients();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCareplan = async () => {
    if (!editingRecipient) return;
    setIsProcessing(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecipient.id,
          careplan: careplanText,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccessMessage(`「${editingRecipient.name}」さんのケアプランを更新しました。`);
      setEditingRecipient(null);
      await fetchRecipients();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEditModal = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setCareplanText(recipient.careplan || "");
  };

  const availableFloors = useMemo(
    () => ["all", ...new Set(allRecipients.map((s) => s.floor))].filter(Boolean),
    [allRecipients]
  );

  const filteredRecipients = useMemo(() => {
    return allRecipients
      .filter((r) => selectedFloor === "all" || r.floor === selectedFloor)
      .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allRecipients, selectedFloor, searchQuery]);
  
  // ★★★ 追加: チェックボックス関連のハンドラ ★★★
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecipientIds(filteredRecipients.map((r) => r.id));
    } else {
      setSelectedRecipientIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRecipientIds((prev) =>
      checked ? [...prev, id] : prev.filter((rid) => rid !== id)
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <main className="container mx-auto max-w-5xl py-8 space-y-6">
      <Dialog open={!!editingRecipient} onOpenChange={(isOpen) => !isOpen && setEditingRecipient(null)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <PlusCircle className="w-5 h-5 mr-2" />
              新規利用者登録
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRecipient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="利用者名 (必須)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Select value={newFloor} onValueChange={setNewFloor}>
                  <SelectTrigger>
                    <SelectValue placeholder="フロアを選択 (必須)" />
                  </SelectTrigger>
                  <SelectContent>
                    {["1F", "2F", "小規模多機能"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="new-careplan">ケアプラン (任意)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>複数のケアプランはカンマ（,）で区切って入力</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="new-careplan"
                  placeholder="例：トイレ動作は声掛けで自立, 運動の誘いを拒否"
                  value={newCareplan}
                  onChange={(e) => setNewCareplan(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? <LoadingSpinner /> : "登録する"}
              </Button>
            </form>
            {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Users className="w-5 h-5 mr-2" />
              利用者一覧
            </CardTitle>
            <CardDescription>登録されている利用者情報の一覧です。</CardDescription>
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
                  {availableFloors.map((f: string) => (
                    <SelectItem key={f} value={f}>
                      {f === "all" ? "すべてのフロア" : f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRecipientIds.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      選択した{selectedRecipientIds.length}名を削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        選択した{selectedRecipientIds.length}名の利用者データを完全に削除します。この操作は元に戻せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>削除</AlertDialogAction>
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
                        selectedRecipientIds.length > 0 &&
                        selectedRecipientIds.length === filteredRecipients.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>氏名</TableHead>
                  <TableHead>フロア</TableHead>
                  <TableHead>ケアプラン</TableHead>
                  <TableHead className="text-right">ケアプラン編集</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>
                       <Checkbox
                        checked={selectedRecipientIds.includes(recipient.id)}
                        onCheckedChange={(checked) => handleSelectRow(recipient.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-500" />
                        {recipient.name}
                      </div>
                    </TableCell>
                    <TableCell>{recipient.floor}</TableCell>
                    <TableCell className="text-gray-500 truncate max-w-xs">
                      {recipient.careplan ? `${recipient.careplan.substring(0, 30)}...` : "未設定"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenEditModal(recipient)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>「{editingRecipient?.name}」さんのケアプラン編集</DialogTitle>
            <DialogDescription>利用者のケアプランを編集・更新します。</DialogDescription>
          </DialogHeader>
          <Textarea
            value={careplanText}
            onChange={(e) => setCareplanText(e.target.value)}
            className="min-h-[200px] text-base"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingRecipient(null)}>キャンセル</Button>
            <Button onClick={handleUpdateCareplan} disabled={isProcessing}>
              {isProcessing ? <LoadingSpinner /> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}