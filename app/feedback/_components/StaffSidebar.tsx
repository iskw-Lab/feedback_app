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
import { StaffMember } from "../types";

// Propsの型定義
interface StaffSidebarProps {
  filteredStaffList: StaffMember[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterFloor: string;
  setFilterFloor: (floor: string) => void;
  availableFloors: string[];
  selectedStaffId: string;
  onStaffSelect: (staff: StaffMember) => void;
  isMobile: boolean;
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
  filteredStaffList,
  searchQuery,
  setSearchQuery,
  filterFloor,
  setFilterFloor,
  availableFloors,
  selectedStaffId,
  onStaffSelect,
  isMobile,
}) => {
  return (
    <>
      <div className="p-4 space-y-4 border-b md:border-b-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger>
            <SelectValue placeholder="フロアで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのフロア</SelectItem>
            {availableFloors.map((floor) => (
              <SelectItem key={floor} value={floor}>
                {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-2 space-y-1">
          {filteredStaffList.map((staff) => {
            const button = (
              <button
                key={staff.id}
                onClick={() => onStaffSelect(staff)}
                className={`w-full text-left flex items-center p-2 text-sm font-medium rounded-md transition-colors ${
                  selectedStaffId === staff.id
                    ? "bg-green-100 text-green-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                <span className="flex-1">{staff.name}</span>
                <Badge variant="outline" className="text-xs">
                  {staff.floor}
                </Badge>
              </button>
            );

            if (isMobile) {
              return <DrawerClose asChild key={staff.id}>{button}</DrawerClose>;
            }
            return button;
          })}
        </nav>
      </div>
    </>
  );
};