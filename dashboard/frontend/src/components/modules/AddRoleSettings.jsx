import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";

export default function AddRoleSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    roleId: "",
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchRoles();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules/addrole`, {
        withCredentials: true,
      });

      if (response.data.settings && response.data.settings.roleId) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch add role settings:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/roles`, {
        withCredentials: true,
      });

      // Filter out managed roles (bot roles, boosts, etc.)
      const assignableRoles = (response.data.roles || []).filter(
        (role) => !role.managed
      );
      setRoles(assignableRoles);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!settings.roleId) {
      alert("Please select a role");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      await axios.put(
        `/guilds/${guildId}/modules/addrole/settings/${user.id}/@${user.username}`,
        {
          settings,
        },
        { withCredentials: true }
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getRoleColor = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.color === 0) return "#99aab5"; // Default gray
    return `#${role.color.toString(16).padStart(6, "0")}`;
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <label htmlFor="roleId" className={styles.label}>
          Remove Role
        </label>
        <select
          id="roleId"
          name="roleId"
          value={settings.roleId}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="">Select a role...</option>
          {roles.map((role) => (
            <option
              key={role.id}
              value={role.id}
              style={{
                color: getRoleColor(role.id),
                fontWeight: "500",
              }}
            >
              {role.name}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          This role will be automatically removed when the add-role command is
          used
        </small>
      </div>

      {settings.roleId && (
        <div className={styles.preview}>
          <strong>Selected Role:</strong>
          <span
            className={styles.rolePreview}
            style={{
              color: getRoleColor(settings.roleId),
              backgroundColor: `${getRoleColor(settings.roleId)}20`,
              border: `1px solid ${getRoleColor(settings.roleId)}`,
            }}
          >
            {roles.find((r) => r.id === settings.roleId)?.name ||
              "Unknown Role"}
          </span>
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button
          type="submit"
          disabled={saving || !settings.roleId}
          className={styles.saveButton}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {saveSuccess && (
          <span className={styles.successMessage}>
            ✓ Settings saved successfully!
          </span>
        )}
      </div>
    </form>
  );
}
