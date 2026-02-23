import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/ModuleCard.module.css";

export default function ModuleCard({
  moduleId,
  title,
  description,
  enabled,
  onToggle,
  guildId, // Optional - only provided for guild modules
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isToggling, setIsToggling] = useState(false);
  const navigate = useNavigate();

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isToggling) return;
    setIsToggling(true);
    const newState = !isEnabled;
    try {
      await onToggle(newState);
      setIsEnabled(newState);
    } catch (err) {
      console.error("Failed to toggle module:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCardClick = () => {
    // If guildId is provided, it's a guild module
    // Otherwise, it's an admin module
    if (guildId) {
      navigate(`/guild/${guildId}/module/${moduleId}`);
    } else {
      navigate(`/admin/module/${moduleId}`);
    }
  };

  return (
    <div className={styles.card} onClick={handleCardClick}>
      <div className={styles.content}>
        <div className={styles.info}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
        <div
          className={styles.toggleWrapper}
          onClick={(e) => e.stopPropagation()}
        >
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              disabled={isToggling}
            />
            <span className={styles.slider}></span>
          </label>
          <span className={styles.status}>
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}
