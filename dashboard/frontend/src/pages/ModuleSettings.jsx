import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import WelcomeSettings from "../components/modules/WelcomeSettings";
import AutoRoleSettings from "../components/modules/AutoRoleSettings";
import ReactionRolesSettings from "../components/modules/ReactionRolesSettings";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import GoodbyeSettings from "../components/modules/GoodbyeSettings";
import TicketsSettings from "../components/modules/TicketsSettings";
import StatusSettings from "../components/modules/StatusSettings";
import AddRoleSettings from "../components/modules/AddRoleSettings";
import CustomCommandSettings from "../components/modules/CustomCommandSettings";
import JoinLeaveSettings from "../components/modules/JoinLeaveSettings";

export default function ModuleSettings() {
  const { guildId, moduleId } = useParams();
  const navigate = useNavigate();
  const { user, guilds, loading } = useAuth();

  // Check if this is an admin module
  const isAdminModule = location.pathname.startsWith("/admin");

  const renderModuleSettings = () => {
    switch (moduleId) {
      case "welcome":
        return <WelcomeSettings guildId={guildId} user={user} />;
      case "goodbye":
        return <GoodbyeSettings guildId={guildId} user={user} />;
      case "autorole":
        return <AutoRoleSettings guildId={guildId} user={user} />;
      case "addrole":
        return <AddRoleSettings guildId={guildId} user={user} />;
      case "reactionroles":
        return <ReactionRolesSettings guildId={guildId} user={user} />;
      case "tickets":
        return <TicketsSettings guildId={guildId} user={user} />;
      case "customcommands":
        return <CustomCommandSettings guildId={guildId} user={user} />;
      case "status":
        return <StatusSettings />;
      case "joinleave":
        return <JoinLeaveSettings guildId={guildId} />;
      default:
        return (
          <div>
            <p>Unknown module: {moduleId}</p>
          </div>
        );
    }
  };

  const getModuleTitle = () => {
    const titles = {
      welcome: "Welcome Messages",
      goodbye: "Goodbye Messages",
      autorole: "Auto Role",
      reactionroles: "Reaction Roles",
      tickets: "Tickets",
      customcommands: "Custom Commands",
      status: "Status",
      joinleave: "Join Leave",
    };
    return titles[moduleId] || moduleId;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} selectedGuildId={guildId} />
      <div style={{ padding: "2rem" }}>
        <button
          className={styles.button}
          onClick={() =>
            isAdminModule
              ? navigate(guildId ? `/admin/guild/${guildId}` : `/admin`)
              : navigate(`/guild/${guildId}`)
          }
          style={{ marginBottom: "1rem" }}
        >
          ← Back to {isAdminModule ? "Admin" : "Guild"} Settings
        </button>
        <h1 style={{ marginBottom: "2rem" }}>{getModuleTitle()} Settings</h1>
        {renderModuleSettings()}
      </div>
    </div>
  );
}
