import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { HeaderBar } from "./components/HeaderBar";
import { LexiconDrawer } from "./components/lexicon/LexiconDrawer";
import { ToastNotification } from "./components/ToastNotification";
import { DashboardView } from "./views/DashboardView";
import { PracticeView } from "./views/practice/PracticeView";
import { LibraryView } from "./views/library/LibraryView";
import { LeaderboardView } from "./views/LeaderboardView";
import { ProfileView } from "./views/ProfileView";
import { SettingsView } from "./views/SettingsView";
import { BattleWorldView } from "./views/tryout/BattleWorldView";
import { WarriorBattleView } from "./views/WarriorBattleView";
import "./learner-copy.css";
import { useMatch, useNavigation, useOutlet } from "react-router";
import { DashboardShell } from "./components/ui/dashboard-shell";
import { IS_DEMO_MODE } from "./lib/demo-mode";

function AppShell() {
  const { currentTab, activeSession, sidebarOpen, toggleSidebar } = useApp();
  const outlet = useOutlet();
  const navigation = useNavigation();
  const historyResult = useMatch("/dashboard/riwayat/:id");
  const immersive = !!activeSession || !!historyResult;

  const renderActiveView = () => {
    if (activeSession) {
      return <PracticeView />;
    }
    switch (currentTab) {
      case "dashboard":
        return <DashboardView />;
      case "practice":
        return <PracticeView />;
      case "warrior":
        return <WarriorBattleView />;
      case "library":
        return <LibraryView />;
      case "tryout":
        return <BattleWorldView />;
      case "leaderboard":
        return <LeaderboardView />;
      case "profile":
        return <ProfileView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <DashboardShell
      className="learner-shell"
      immersive={immersive}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={toggleSidebar}
      sidebar={!immersive && <Sidebar />}
      header={!immersive && <HeaderBar />}
      bottomNav={!immersive && <BottomNav />}
      overlays={
        <>
          <LexiconDrawer />
          <ToastNotification />
        </>
      }
    >
      {navigation.state === "loading" && (
        <div
          className="motion-skeleton h-2 w-full mb-4 rounded"
          role="status"
          aria-label="Memuat"
        />
      )}
      {IS_DEMO_MODE && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--edge)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--soft-ink)]" role="status">
          <span className="rounded-sm border border-[var(--accent-gold)] px-2 py-1 font-mono font-semibold tracking-wider text-[var(--accent-gold)]">MODE EKSPERIMEN</span>
          <span>Latihan dan progres tersimpan di browser ini; akun online dan fitur multiplayer belum aktif.</span>
        </div>
      )}
      <div key={outlet ? "outlet" : currentTab} className="motion-page-enter w-full">
        {outlet ?? renderActiveView()}
      </div>
    </DashboardShell>
  );
}

export function LatveriaOSApp() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default LatveriaOSApp;