import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";

export default function GoodbyeSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    goodbyeMessage: "",
    channelId: "",
  });
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchChannels();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules/goodbye`, {
        withCredentials: true,
      });

      if (response.data.settings && response.data.settings.goodbyeMessage) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch goodbye settings:", err);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await axios.put(
        `/guilds/${guildId}/modules/goodbye/settings/${user.id}/@${user.username}`,
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
        <label htmlFor="goodbyeMessage" className={styles.label}>
          Goodbye Message
        </label>
        <textarea
          id="goodbyeMessage"
          name="goodbyeMessage"
          value={settings.goodbyeMessage}
          onChange={handleChange}
          placeholder="Enter your goodbye message here. Use {user} to mention the new member, {server} for server name."
          rows={6}
          className={styles.textarea}
        />
        <small className={styles.hint}>
          Available placeholders: {"{user}"} (mentions the user), {"{username}"}{" "}
          (user's name), {"{server}"} (server name)
        </small>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="channelId" className={styles.label}>
          Goodbye Channel
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
          Select the channel where goodbye messages will be sent
        </small>
      </div>

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
