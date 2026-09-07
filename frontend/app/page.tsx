import { LockKeyhole } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SidebarPreview } from "@/components/layout/sidebar-preview";

export default function HomePage() {
  return (
    <AppShell sidebar={<SidebarPreview />}>
      <section className="grid place-items-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-blue-100 text-blue-600">
            <LockKeyhole size={28} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome to Signal</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Select a conversation to start messaging securely.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
