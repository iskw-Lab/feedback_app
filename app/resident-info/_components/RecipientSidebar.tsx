import React from "react";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DrawerClose } from "@/components/ui/drawer";
import { Recipient } from "../types"; // 型定義を利用

// Propsの型定義（引数が多いのでinterfaceで見やすくします）
interface RecipientSidebarProps {
  filteredRecipients: Recipient[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedFloor: string;
  setSelectedFloor: (floor: string) => void;
  availableFloors: string[];
  selectedRecipient: Recipient | null;
  onRecipientSelect: (recipient: Recipient) => void;
  isMobile: boolean;
}

export const RecipientSidebar: React.FC<RecipientSidebarProps> = ({
  filteredRecipients,
  searchQuery,
  setSearchQuery,
  selectedFloor,
  setSelectedFloor,
  availableFloors,
  selectedRecipient,
  onRecipientSelect,
  isMobile,
}) => {
  return (
    <>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="名前で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={selectedFloor} onValueChange={setSelectedFloor}>
          <SelectTrigger>
            <SelectValue placeholder="フロアを選択" />
          </SelectTrigger>
          <SelectContent>
            {availableFloors.map((f) => (
              <SelectItem key={f} value={f}>
                {f === "all" ? "すべてのフロア" : f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto border-t">
        <nav className="p-2 space-y-1">
          {filteredRecipients.map((r) => {
            const itemContent = (
              <div
                key={r.id}
                onClick={() => onRecipientSelect(r)}
                className={`w-full text-left flex items-center p-2 rounded-md transition-colors cursor-pointer ${
                  selectedRecipient?.id === r.id
                    ? "bg-green-100 text-green-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-4 h-4 mr-3 flex-shrink-0" />
                <div className="flex-1 flex justify-between items-center">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="outline" className="text-xs font-normal">
                    {r.floor}
                  </Badge>
                </div>
              </div>
            );

            if (isMobile) {
              return <DrawerClose asChild key={r.id}>{itemContent}</DrawerClose>;
            }
            return itemContent;
          })}
        </nav>
      </div>
    </>
  );
};