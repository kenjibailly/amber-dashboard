import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";
import editorStyles from "../../styles/ReactionRoleEditor.module.css";
import UserPicker from "../UserPicker";

export default function JoinLeaveSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    statusMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    user: "",
    command: "",
    channelId: "",
    extraChannels: [],
  });

  useEffect(() => {
    fetchSettings();
    fetchChannels();
    fetchUsers();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `/api/admin/guilds/${guildId}/modules/joinleave`,
        {
          withCredentials: true,
        },
      );
      console.log("response.data.settings: ");
      console.log(response.data.settings);

      if (response.data.settings) {
        setFormData({
          user: response.data.settings.user || "",
          command: response.data.settings.command || "",
          channelId: response.data.settings.channelId || "",
          extraChannels: response.data.settings.extraChannels || [],
        });
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch status settings:", err);
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

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/users`, {
        withCredentials: true,
      });

      setUsers(response.data.users || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await axios.put(
        `/api/admin/guilds/${guildId}/modules/joinleave/settings/`,
        { settings: formData },
        { withCredentials: true },
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <label className={styles.label}>User</label>
        <UserPicker
          users={users}
          value={formData.user}
          onChange={(userId) =>
            setFormData((prev) => ({ ...prev, user: userId }))
          }
        />
        <small className={styles.hint}>Search and select a user.</small>
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="channelId" className={styles.label}>
          Join Leave Main Channel
        </label>
        <select
          id="channelId"
          name="channelId"
          value={formData.channelId}
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
          Select the main channel for Join Leave, success messages will also be
          sent here.
        </small>
      </div>

      <div className={editorStyles.formGroup}>
        <label htmlFor="command">Secret Command</label>
        <input
          type="text"
          id="command"
          name="command"
          value={formData.command}
          onChange={handleChange}
          className={styles.input}
        />
        <small className={styles.hint}>
          Enter a secret command, preferrably with a special sign before it. On
          this text, the command will fire. Example: *secret
        </small>
      </div>

      <div className={editorStyles.formGroup}>
        <label>Extra Channels</label>
        <select
          multiple
          onChange={(e) => {
            const selectedOptions = Array.from(
              e.target.selectedOptions,
              (option) => option.value,
            );
            setFormData((prev) => ({
              ...prev,
              extraChannels: selectedOptions,
            }));
          }}
          className={editorStyles.multiSelect}
          size={Math.min(channels.length, 10)}
        >
          {channels.map((channel) => (
            <option
              key={channel.id}
              value={channel.id}
              selected={formData.extraChannels?.includes(channel.id)}
            >
              {channel.name}
            </option>
          ))}
        </select>
        <small>Leave empty for no extra channels.</small>
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
