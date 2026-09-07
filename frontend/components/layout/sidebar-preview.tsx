import { Edit3, Search } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";

export function SidebarPreview() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="text-xl font-semibold tracking-tight">Signal</h1>
        <IconButton label="New message">
          <Edit3 size={19} />
        </IconButton>
      </header>
      <label className="relative mx-4 block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input
          aria-label="Search conversations"
          className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
          placeholder="Search"
          type="search"
        />
      </label>
      <div className="grid flex-1 place-items-center px-8 text-center">
        <p className="text-sm leading-6 text-slate-500">Your conversations will appear here.</p>
      </div>
    </div>
  );
}
