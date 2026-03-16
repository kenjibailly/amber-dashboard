import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";
import editorStyles from "../../styles/EditorStyles.module.css";

const defaultFormData = {
  currencyLimit: {
    type: "flat",
    period: "day",
    amount: 0,
  },
  extraCurrencyLimit: {
    type: "flat",
    period: "day",
    amount: 0,
  },
  announcementChannelId: "",
};

export default function GiftSettings({ guildId, user }) {
  const [formData, setFormData] = useState(defaultFormData);
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
      const res = await axios.get(`/guilds/${guildId}/modules/gift`, {
        withCredentials: true,
      });
      if (res.data.settings) {
        setFormData({
          ...defaultFormData,
          ...res.data.settings,
          currencyLimit: {
            ...defaultFormData.currencyLimit,
            ...res.data.settings.currencyLimit,
          },
          extraCurrencyLimit: {
            ...defaultFormData.extraCurrencyLimit,
            ...res.data.settings.extraCurrencyLimit,
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch gift settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`/guilds/${guildId}/channels`, {
        withCredentials: true,
      });
      setChannels(res.data.channels || []);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  };

  const setLimit = (key, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(
        `/guilds/${guildId}/modules/gift/settings/${user.id}/@${user.username}`,
        { settings: formData },
        { withCredentials: true },
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save gift settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  const renderLimitSection = (label, key) => (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}</label>
      <div className={editorStyles.inlineRow}>
        <select
          value={formData[key].type}
          onChange={(e) => setLimit(key, "type", e.target.value)}
          className={styles.select}
        >
          <option value="flat">Flat amount</option>
          <option value="percent">Percentage of wallet</option>
        </select>
        <select
          value={formData[key].period}
          onChange={(e) => setLimit(key, "period", e.target.value)}
          className={styles.select}
        >
          <option value="day">Per day</option>
          <option value="month">Per month</option>
        </select>
        <input
          type="number"
          min="0"
          value={formData[key].amount}
          onChange={(e) =>
            setLimit(key, "amount", parseInt(e.target.value) || 0)
          }
          className={styles.input}
          placeholder={
            formData[key].type === "percent" ? "e.g. 50 (%)" : "e.g. 100"
          }
        />
      </div>
      <small className={styles.hint}>
        {formData[key].type === "percent"
          ? `User can gift up to ${formData[key].amount}% of their wallet per ${formData[key].period}. Set to 0 for no limit.`
          : `User can gift up to ${formData[key].amount} per ${formData[key].period}. Set to 0 for no limit.`}
      </small>
    </div>
  );

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      {renderLimitSection("Currency Gift Limit", "currencyLimit")}
      {renderLimitSection("Extra Currency Gift Limit", "extraCurrencyLimit")}

      <div className={styles.formGroup}>
        <label className={styles.label}>Announcement Channel</label>
        <select
          value={formData.announcementChannelId}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              announcementChannelId: e.target.value,
            }))
          }
          className={styles.select}
        >
          <option value="">Same channel as command (default)</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              # {channel.name}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          Where to post the gift announcement. Leave empty to post in the same
          channel the command was used.
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
