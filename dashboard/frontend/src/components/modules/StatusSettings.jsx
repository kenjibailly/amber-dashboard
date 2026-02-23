import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";

export default function StatusSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    statusMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/api/admin/modules/status`, {
        withCredentials: true,
      });

      if (response.data.settings && response.data.settings.statusMessage) {
        setSettings(response.data.settings);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch status settings:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await axios.put(
        `/api/admin/modules/status/settings/`,
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
        <label htmlFor="statusMessage" className={styles.label}>
          Status Message
        </label>
        <textarea
          id="statusMessage"
          name="statusMessage"
          value={settings.statusMessage}
          onChange={handleChange}
          placeholder="Enter your status message here."
          rows={6}
          className={styles.textarea}
        />
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
