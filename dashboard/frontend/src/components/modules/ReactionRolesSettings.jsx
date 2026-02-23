import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../../styles/ReactionRoles.module.css";

export default function ReactionRolesSettings({ guildId, user }) {
  const [reactionRoles, setReactionRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReactionRoles();
  }, [guildId]);

  const fetchReactionRoles = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/reaction-roles`, {
        withCredentials: true,
      });

      setReactionRoles(response.data.reactionRoles || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch reaction roles:", err);
      setLoading(false);
    }
  };

  const handleDelete = async (reactionRoleId) => {
    if (
      !confirm(
        "Are you sure you want to delete this reaction role? This will remove all reactions from the message."
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `/guilds/${guildId}/reaction-roles/${reactionRoleId}/${user.id}/@${user.username}`,
        {
          withCredentials: true,
        }
      );

      setReactionRoles(reactionRoles.filter((rr) => rr._id !== reactionRoleId));
    } catch (err) {
      console.error("Failed to delete reaction role:", err);
      alert("Failed to delete reaction role");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Reaction Roles</h2>
        <button
          className={styles.createButton}
          onClick={() =>
            navigate(`/guild/${guildId}/module/reactionroles/create/`)
          }
        >
          + Create New
        </button>
      </div>

      {reactionRoles.length === 0 ? (
        <div className={styles.empty}>
          <p>No reaction roles configured yet.</p>
          <p>Click "Create New" to set up your first reaction role!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {reactionRoles.map((rr) => (
            <div key={rr._id} className={styles.card}>
              <div className={styles.cardContent}>
                <h3>{rr.name}</h3>
                <p className={styles.info}>
                  <strong>Message:</strong>{" "}
                  <a
                    href={rr.messageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Message
                  </a>
                </p>
                <p className={styles.info}>
                  <strong>Reactions:</strong> {rr.reactions.length}
                </p>
                <p className={styles.info}>
                  <strong>Type:</strong>{" "}
                  {rr.type === "normal"
                    ? "Normal"
                    : rr.type === "add_only"
                    ? "Add Only"
                    : "Remove Only"}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.editButton}
                  onClick={() =>
                    navigate(
                      `/guild/${guildId}/module/reactionroles/edit/${rr._id}/`
                    )
                  }
                >
                  Edit
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(rr._id)}
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
