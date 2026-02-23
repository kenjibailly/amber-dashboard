import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";

export default function TicketsSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    ticketsMessage: "",
    channelId: "",
  });
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchChannels();
    fetchRoles();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules/tickets`, {
        withCredentials: true,
      });

      if (response.data.settings && response.data.settings.ticketsMessage) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch tickets settings:", err);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/channels`, {
        withCredentials: true,
      });

      setChannels(response.data.channels || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/roles`, {
        withCredentials: true,
      });
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

  const getRoleColor = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.color === 0) return "#99aab5";
    return `#${role.color.toString(16).padStart(6, "0")}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await axios.put(
        `/guilds/${guildId}/modules/tickets/settings/${user.id}/@${user.username}`,
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

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <label htmlFor="ticketsMessage" className={styles.label}>
          Tickets Message
        </label>
        <textarea
          id="ticketsMessage"
          name="ticketsMessage"
          value={settings.ticketsMessage}
          onChange={handleChange}
          placeholder="Enter your tickets message here."
          rows={6}
          className={styles.textarea}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="channelId" className={styles.label}>
          Tickets Channel
        </label>
        <select
          id="channelId"
          name="channelId"
          value={settings.channelId}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="">Select a channel...</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              # {channel.name}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          Select the channel where tickets messages will be sent
        </small>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="roleId">Staff Role (Optional)</label>
        <select
          id="roleId"
          name="roleId"
          value={settings.roleId}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="">No role</option>
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
        <small>Select a your staff role, or leave empty if no staff.</small>
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
        <button type="submit" disabled={saving} className={styles.saveButton}>
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
