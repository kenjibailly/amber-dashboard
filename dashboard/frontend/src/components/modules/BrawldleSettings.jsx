import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";
import editorStyles from "../../styles/EditorStyles.module.css";

const DEFAULT_PLACE = { currency: 0, extraCurrency: 0 };

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default function BrawldleSettings({ guildId, user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [channels, setChannels] = useState([]);

  const [formData, setFormData] = useState({
    channelId: "",
    rewardPlaces: 3,
    rewards: [
      { currency: 0, extraCurrency: 0 },
      { currency: 0, extraCurrency: 0 },
      { currency: 0, extraCurrency: 0 },
    ],
  });

  useEffect(() => {
    fetchSettings();
    fetchChannels();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`/guilds/${guildId}/modules/brawldle`, {
        withCredentials: true,
      });
      if (res.data.settings) {
        const s = res.data.settings;
        setFormData({
          channelId: s.channelId || "",
          rewardPlaces: s.rewardPlaces || 3,
          rewards: s.rewards || [
            { currency: 0, extraCurrency: 0 },
            { currency: 0, extraCurrency: 0 },
            { currency: 0, extraCurrency: 0 },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to fetch Brawldle settings:", err);
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

  const handlePlacesChange = (e) => {
    const count = parseInt(e.target.value);
    const current = formData.rewards;
    const updated = Array.from(
      { length: count },
      (_, i) => current[i] || { currency: 0, extraCurrency: 0 },
    );
    setFormData((prev) => ({ ...prev, rewardPlaces: count, rewards: updated }));
  };

  const handleRewardChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.rewards];
      updated[index] = { ...updated[index], [field]: parseInt(value) || 0 };
      return { ...prev, rewards: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(
        `/guilds/${guildId}/modules/brawldle/settings/${user.id}/@${user.username}`,
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

  if (loading) return <div>Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      {/* Reward channel */}
      <div className={styles.formGroup}>
        <label htmlFor="channelId" className={styles.label}>
          Monthly Reward Channel
        </label>
        <select
          id="channelId"
          value={formData.channelId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, channelId: e.target.value }))
          }
          className={styles.select}
        >
          <option value="">Select a channel...</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              # {ch.name}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          Monthly leaderboard results and rewards will be posted here.
        </small>
      </div>

      {/* Number of reward places */}
      <div className={styles.formGroup}>
        <label htmlFor="rewardPlaces" className={styles.label}>
          Number of Reward Places
        </label>
        <select
          id="rewardPlaces"
          value={formData.rewardPlaces}
          onChange={handlePlacesChange}
          className={styles.select}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
        <small className={styles.hint}>
          How many places receive rewards at the end of the month.
        </small>
      </div>

      {/* Per-place reward config */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Place Rewards</label>
        <small
          className={styles.hint}
          style={{ marginBottom: "12px", display: "block" }}
        >
          Currency amounts added to the winner's wallet at the end of each
          month.
        </small>
        {formData.rewards.map((reward, i) => (
          <div
            key={i}
            className={editorStyles.input}
            style={{ marginBottom: "12px" }}
          >
            <div className={editorStyles.entryHeader}>
              <span className={editorStyles.entryType}>{ORDINAL[i]} Place</span>
            </div>
            <div className={editorStyles.entryFields}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Currency</label>
                <input
                  type="number"
                  min="0"
                  value={reward.currency}
                  onChange={(e) =>
                    handleRewardChange(i, "currency", e.target.value)
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Extra Currency</label>
                <input
                  type="number"
                  min="0"
                  value={reward.extraCurrency}
                  onChange={(e) =>
                    handleRewardChange(i, "extraCurrency", e.target.value)
                  }
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        ))}
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
