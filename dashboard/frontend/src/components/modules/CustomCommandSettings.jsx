import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../../styles/ReactionRoles.module.css";

export default function CustomCommandsSettings({ guildId, user }) {
  const [customCommands, setCustomCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomCommands();
  }, [guildId]);

  const fetchCustomCommands = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/custom-commands`, {
        withCredentials: true,
      });

      setCustomCommands(response.data.customCommands || []);
      setLoading(false);
    } catch (ecc) {
      console.eccor("Failed to fetch custom commands:", ecc);
      setLoading(false);
    }
  };

  const handleDelete = async (customCommandId) => {
    if (!confirm("Are you sure you want to delete this custom command?")) {
      return;
    }

    try {
      await axios.delete(
        `/guilds/${guildId}/custom-commands/${customCommandId}/${user.id}/@${user.username}`,
        {
          withCredentials: true,
        }
      );

      setCustomCommands(
        customCommands.filter((cc) => cc._id !== customCommandId)
      );
    } catch (ecc) {
      console.error("Failed to delete custom command:", ecc);
      alert("Failed to delete custom command");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Custom Commands</h2>
        <button
          className={styles.createButton}
          onClick={() =>
            navigate(`/guild/${guildId}/module/customcommands/create/`)
          }
        >
          + Create New
        </button>
      </div>

      {customCommands.length === 0 ? (
        <div className={styles.empty}>
          <p>No custom commands configured yet.</p>
          <p>Click "Create New" to set up your first custom command!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {customCommands.map((cc) => (
            <div key={cc._id} className={styles.card}>
              <div className={styles.cardContent}>
                <h3>{cc.name}</h3>
                <p className={styles.info}>
                  <strong>Type:</strong> /{cc.command}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.editButton}
                  onClick={() =>
                    navigate(
                      `/guild/${guildId}/module/customcommands/edit/${cc._id}/`
                    )
                  }
                >
                  Edit
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(cc._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
