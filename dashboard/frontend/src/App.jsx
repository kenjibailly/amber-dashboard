import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import GuildSettings from "./pages/GuildSettings";
import ModuleSettings from "./pages/ModuleSettings";
import ReactionRoleEditor from "./pages/ReactionRoleEditor";
import EmbedBuilder from "./pages/EmbedBuilder";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminSettings from "./pages/AdminSettings";
import ChangeLogs from "./pages/ChangeLogs";
import CustomCommandEditor from "./pages/CustomCommandEditor";
import Brawldle from "./pages/Brawldle";
import BrawldleCallback from "./pages/BrawldleCallback";
import BrawldleRedirect from "./pages/BrawldleRedirect";

const isBrawldleActivity =
  window.location.hostname === "brawldle.mindglowing.art" ||
  window.location.hostname.endsWith(".discordsays.com");

export default function App() {
  return (
    <Routes>
      {/* <Route path="/" element={<Home />} /> */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId"
        element={
          <ProtectedRoute>
            <GuildSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModuleSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/module/reactionroles/create/"
        element={
          <ProtectedRoute>
            <ReactionRoleEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/module/customcommands/create/"
        element={
          <ProtectedRoute>
            <CustomCommandEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/module/reactionroles/edit/:reactionRoleId"
        element={
          <ProtectedRoute>
            <ReactionRoleEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/module/customcommands/edit/:customCommandId"
        element={
          <ProtectedRoute>
            <CustomCommandEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/embed-builder"
        element={
          <ProtectedRoute>
            <EmbedBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guild/:guildId/change-logs"
        element={
          <ProtectedRoute>
            <ChangeLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/guild/:guildId"
        element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModuleSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/guild/:guildId/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModuleSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={isBrawldleActivity ? <BrawldleRedirect /> : <Home />}
      />
      <Route path="/brawldle" element={<Brawldle />} />
      <Route path="/brawldle/callback" element={<BrawldleCallback />} />
    </Routes>
  );
}
