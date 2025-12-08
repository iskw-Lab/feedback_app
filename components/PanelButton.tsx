"use client";

import React from "react";

interface PanelButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

export function PanelButton({ icon, title, onClick }: PanelButtonProps) {
  return (
    <button
      onClick={onClick}
      // ★★★ 変更点: 赤色系(bg-[#B94046])から緑色系(bg-green-600)に変更 ★★★
      className="group flex flex-col items-center justify-center space-y-3 p-6 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 hover:shadow-lg transition-transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
    >
      <div className="transition-transform group-hover:scale-110">
        {React.cloneElement(icon as React.ReactElement, { className: "w-10 h-10" })}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
    </button>
  );
}