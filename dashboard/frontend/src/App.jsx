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

console.log("VITE ENV:", import.meta.env); // move it here

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
        path="/admin/module/:moduleId"
        element={
          <ProtectedRoute>
            <ModuleSettings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
