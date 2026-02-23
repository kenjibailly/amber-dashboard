import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import ModuleCard from "../components/ModuleCard";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import moduleCardStyles from "../styles/ModuleCard.module.css";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, guilds, loading } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      if (user.id == import.meta.env.VITE_DISCORD_ADMIN_ID) {
        setHasPermission(true);
        fetchModules();
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate]);

  const fetchModules = async () => {
    try {
      const response = await axios.get(`/api/admin/modules`, {
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
        `/api/admin/modules/${moduleId}/toggle`,
        {
          enabled: newState,
        },
        { withCredentials: true }
      );
      setModules(
        modules.map((m) =>
          m.id === moduleId ? { ...m, enabled: newState } : m
        )
      );
    } catch (err) {
      console.error("Failed to toggle module:", err);
      throw err;
    }
  };

  const adminModules = modules.filter((m) => m.category === "admin");

  if (loading) {
    return <div>Loading user data...</div>;
  }

  if (!hasPermission) {
    return <div>Checking permissions...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} />
      <div style={{ padding: "2rem" }}>
        <h1>Admin Settings</h1>

        {modulesLoading ? (
          <div>Loading modules...</div>
        ) : (
          <>
            <h2 style={{ marginBottom: "1rem", marginTop: "2rem" }}>Admin</h2>
            <div className={moduleCardStyles.cards}>
              {adminModules.length === 0 ? (
                <div>No admin modules available</div>
              ) : (
                adminModules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    moduleId={module.id}
                    title={module.title}
                    description={module.description}
                    enabled={module.enabled}
                    onToggle={(newState) =>
                      handleModuleToggle(module.id, newState)
                    }
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
