"use client";

import { Menu, MessageCircle, Phone, Settings2, Sticker } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";

type NavigationRailProps = {
  isVisible: boolean;
  onOpenSettings: () => void;
  onPlaceholder: (feature: string) => void;
  onToggle: () => void;
};

export function NavigationRail({
  isVisible,
  onOpenSettings,
  onPlaceholder,
  onToggle,
}: NavigationRailProps) {
  return (
    <nav aria-label="Signal navigation" className="signal-rail">
      <div className="signal-rail__top">
        <IconButton label={isVisible ? "Hide tabs" : "Show tabs"} onClick={onToggle}>
          <Menu size={23} />
        </IconButton>
        <IconButton active label="Chats">
          <MessageCircle size={23} />
        </IconButton>
        <IconButton label="Calls" onClick={() => onPlaceholder("Calls")}> 
          <Phone size={23} />
        </IconButton>
        <IconButton label="Stories" onClick={() => onPlaceholder("Stories")}> 
          <Sticker size={23} />
        </IconButton>
      </div>
      <IconButton label="Settings" onClick={onOpenSettings}>
        <Settings2 size={23} />
      </IconButton>
    </nav>
  );
}
