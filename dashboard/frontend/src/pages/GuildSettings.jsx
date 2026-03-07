import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import ModuleCard from "../components/ModuleCard";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import moduleCardStyles from "../styles/ModuleCard.module.css";

export default function GuildSettings() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { user, guilds, loading } = useAuth();
  const [guild, setGuild] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && guilds.length > 0) {
      const foundGuild = guilds.find((g) => g.id === guildId);

      if (foundGuild) {
        const MANAGE_GUILD = 0x20;
        const hasManagePermission =
          (parseInt(foundGuild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;

        if (hasManagePermission) {
          setGuild(foundGuild);
          setHasPermission(true);
          fetchModules();
        } else {
          alert("You don't have permission to manage this server");
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    }
  }, [guildId, guilds, loading, navigate]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post(
        `/guilds/${guildId}/sync-commands`,
        {},
        { withCredentials: true },
      );
      alert("Commands synced successfully!");
    } catch (err) {
      console.error("Failed to sync commands:", err);
      alert("Failed to sync commands. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules`, {
        withCredentials: true,
      });
      setModules(response.data.modules);
      setModulesLoading(false);
    } catch (err) {
      console.error("Failed to fetch modules:", err);
      setModulesLoading(false);
    }
  };

  const handleModuleToggle = async (moduleId, newState) => {
    try {
      await axios.post(
        `/guilds/${guildId}/modules/${moduleId}/toggle/${user.id}/@${user.username}`,
        {
          enabled: newState,
        },
        { withCredentials: true },
      );

      setModules(
        modules.map((m) =>
          m.id === moduleId ? { ...m, enabled: newState } : m,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle module:", err);
      throw err;
    }
  };

  const getGuildIconUrl = (guild) => {
    if (!guild || !guild.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  };

  const generalModules = modules.filter((m) => m.category === "general");
  const brawlStarsModules = modules.filter((m) => m.category === "brawlstars");

  if (loading || !guild || !hasPermission) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} selectedGuildId={guildId} />
      <button
        style={{ marginTop: "20px", marginLeft: "20px" }}
        className={styles.button}
        onClick={() => navigate(`/guild/${guildId}/change-logs`)}
      >
        Change Logs
      </button>
      <button
        style={{ marginTop: "20px", marginLeft: "20px" }}
        className={styles.button}
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? "Syncing..." : "Sync"}
      </button>
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "2rem",
          }}
        >
          {getGuildIconUrl(guild) && (
            <img
              src={getGuildIconUrl(guild)}
              alt={guild.name}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
              }}
            />
          )}
          <h1>{guild.name} Settings</h1>
        </div>

        {modulesLoading ? (
          <div>Loading modules...</div>
        ) : (
          <>
            {/* General Discord Modules */}
            <h2 style={{ marginBottom: "1rem", marginTop: "2rem" }}>
              General Modules
            </h2>
            <div className={moduleCardStyles.cards}>
              <div className={moduleCardStyles.card}>
                <a onClick={() => navigate(`/guild/${guildId}/embed-builder`)}>
                  <div className={moduleCardStyles.content}>
                    <div className={moduleCardStyles.info}>
                      <h3 className={moduleCardStyles.title}>Embed Builder</h3>
                      <p className={moduleCardStyles.description}>
                        Create your own embed or edit an existing one.
                      </p>
                    </div>
                  </div>
                </a>
              </div>
              {generalModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  moduleId={module.id}
                  title={module.title}
                  description={module.description}
                  enabled={module.enabled}
                  onToggle={(newState) =>
                    handleModuleToggle(module.id, newState)
                  }
                  guildId={guildId}
                />
              ))}
            </div>

            {/* Blue Protocol Modules */}
            <h2 style={{ marginBottom: "1rem", marginTop: "2rem" }}>
              Brawl Stars Modules
            </h2>
            <div className={moduleCardStyles.cards}>
              {brawlStarsModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  moduleId={module.id}
                  title={module.title}
                  description={module.description}
                  enabled={module.enabled}
                  onToggle={(newState) =>
                    handleModuleToggle(module.id, newState)
                  }
                  guildId={guildId}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
