import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../styles/ModuleSettings.module.css";
import editorStyles from "../../styles/EditorStyles.module.css";
import moduleCardStyles from "../../styles/ModuleCard.module.css";
import UserPicker from "../UserPicker";

const defaultMultiplierEntry = (type) => ({
  id: Date.now(),
  type,
  targetId: "",
  enabled: true,
  multiplier: "",
  channelIds: [],
  voiceChannelIds: [],
});

export default function LevelSettings({ guildId, user }) {
  const [settings, setSettings] = useState({
    channelId: "",
    messageCount: "",
    expPoints: "",
    reward: "",
    rewardExtra: "",
    ignoredChannels: [],
    voice: {
      kickMutedEnabled: false,
      kickUserAfter: "",
      ignoredVoiceChannels: [],
    },
    expMultiplier: {
      multiplier: "",
      limitedTime: { enabled: false, days: "" },
      channelIds: [],
      voiceChannelIds: [], // add this
    },
    expMultiplierEntries: [],
  });
  const [channels, setChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchChannels();
    fetchVoiceChannels();
    fetchRoles();
    fetchUsers();
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules/level`, {
        withCredentials: true,
      });
      if (response.data.settings) {
        const s = response.data.settings;
        setSettings({
          channelId: s.channelId || "",
          messageCount: s.messageCount || "",
          expPoints: s.expPoints || "",
          reward: s.reward || "",
          rewardExtra: s.rewardExtra || "",
          ignoredChannels: s.ignoredChannels || [],
          voice: {
            kickMutedEnabled: s.voice?.kickMutedEnabled || false,
            kickUserAfter: s.voice?.kickUserAfter || "",
            ignoredVoiceChannels: s.voice?.ignoredVoiceChannels || [],
          },
          expMultiplier: {
            multiplier: s.expMultiplier?.multiplier || "",
            limitedTime: {
              enabled: s.expMultiplier?.limitedTime?.enabled || false,
              days: s.expMultiplier?.limitedTime?.days || "",
            },
            channelIds: s.expMultiplier?.channelIds || [],
            voiceChannelIds: s.expMultiplier?.voiceChannelIds || [], // add this
          },
          expMultiplierEntries: (s.expMultiplierEntries || []).map((e) => ({
            ...e,
            voiceChannelIds: e.voiceChannelIds || [],
          })),
        });
      }
    } catch (err) {
      console.error("Failed to fetch level settings:", err);
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

  const fetchVoiceChannels = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/voicechannels`, {
        withCredentials: true,
      });
      setVoiceChannels(response.data.channels || []);
    } catch (err) {
      console.error("Failed to fetch voice channels:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/roles`, {
        withCredentials: true,
      });
      setRoles(response.data.roles || []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/users`, {
        withCredentials: true,
      });
      setUsers(response.data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(
        `/guilds/${guildId}/modules/level/settings/${user.id}/@${user.username}`,
        { settings },
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
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleVoiceChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      voice: { ...prev.voice, [field]: value },
    }));
  };

  const handleExpMultiplierChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      expMultiplier: { ...prev.expMultiplier, [field]: value },
    }));
  };

  const handleExpMultiplierLimitedTime = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      expMultiplier: {
        ...prev.expMultiplier,
        limitedTime: { ...prev.expMultiplier.limitedTime, [field]: value },
      },
    }));
  };

  const addEntry = (type) => {
    setSettings((prev) => ({
      ...prev,
      expMultiplierEntries: [
        ...prev.expMultiplierEntries,
        defaultMultiplierEntry(type),
      ],
    }));
  };

  const removeEntry = (id) => {
    setSettings((prev) => ({
      ...prev,
      expMultiplierEntries: prev.expMultiplierEntries.filter(
        (e) => e.id !== id,
      ),
    }));
  };

  const updateEntry = (id, field, value) => {
    setSettings((prev) => ({
      ...prev,
      expMultiplierEntries: prev.expMultiplierEntries.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    }));
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      {/* TEXT + VOICE */}
      <div className={editorStyles.sectionWrapper}>
        <div className={editorStyles.section}>
          <h2>Text Channels</h2>

          <div className={editorStyles.formGroup}>
            <label htmlFor="channelId" className={styles.label}>
              Level Channel
            </label>
            <select
              id="channelId"
              name="channelId"
              value={settings.channelId}
              onChange={handleChange}
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
              Select the channel where level up messages will be sent
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label htmlFor="messageCount" className={styles.label}>
              Message Count
            </label>
            <input
              id="messageCount"
              name="messageCount"
              type="number"
              min="0"
              value={settings.messageCount}
              onChange={handleChange}
              placeholder="0"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              After how many messages should a user level up?
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label htmlFor="expPoints" className={styles.label}>
              Exp Points
            </label>
            <input
              id="expPoints"
              name="expPoints"
              type="number"
              min="0"
              value={settings.expPoints}
              onChange={handleChange}
              placeholder="0"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              How many exp points should one level be?
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label htmlFor="reward" className={styles.label}>
              Reward
            </label>
            <input
              id="reward"
              name="reward"
              type="number"
              min="0"
              value={settings.reward}
              onChange={handleChange}
              placeholder="0"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              After how many levels should a coin be rewarded? Use 0 to disable.
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label htmlFor="rewardExtra" className={styles.label}>
              Reward Extra
            </label>
            <input
              id="rewardExtra"
              name="rewardExtra"
              type="number"
              min="0"
              value={settings.rewardExtra}
              onChange={handleChange}
              placeholder="0"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              After how many levels should the extra currency be rewarded? Use 0
              to disable.
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label>Ignored Channels</label>
            <select
              multiple
              defaultValue={settings.ignoredChannels}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value,
                );
                setSettings((prev) => ({ ...prev, ignoredChannels: selected }));
              }}
              className={editorStyles.multiSelect}
              size={Math.min(channels.length, 5)}
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <small>
              Hold Ctrl/Cmd to select multiple or deselect. Channels that will
              not grant exp towards the level system.
            </small>
          </div>
        </div>

        <div className={editorStyles.section}>
          <h2>Voice Channels</h2>

          <div className={editorStyles.formGroup}>
            <label>Enable Kick Muted User</label>
            <div
              className={moduleCardStyles.toggleWrapper}
              style={{ flexDirection: "unset" }}
              onClick={(e) => e.stopPropagation()}
            >
              <label className={moduleCardStyles.toggle}>
                <input
                  type="checkbox"
                  checked={settings.voice.kickMutedEnabled}
                  onChange={(e) =>
                    handleVoiceChange("kickMutedEnabled", e.target.checked)
                  }
                />
                <span className={moduleCardStyles.slider}></span>
              </label>
              <span className={moduleCardStyles.status}>
                {settings.voice.kickMutedEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <small className={styles.hint}>
              Kick a user from the voice channel who's muted.
            </small>
          </div>

          {settings.voice.kickMutedEnabled && (
            <div className={editorStyles.formGroup}>
              <label htmlFor="kickUserAfter" className={styles.label}>
                Kick User After (minutes)
              </label>
              <input
                id="kickUserAfter"
                type="number"
                min="0"
                value={settings.voice.kickUserAfter}
                onChange={(e) =>
                  handleVoiceChange("kickUserAfter", e.target.value)
                }
                placeholder="10"
                className={editorStyles.input}
              />
              <small className={styles.hint}>
                After how many minutes should a muted user be kicked? Default:
                10.
              </small>
            </div>
          )}

          <div className={editorStyles.formGroup}>
            <label htmlFor="voiceExpInterval" className={styles.label}>
              Exp Interval (minutes)
            </label>
            <input
              id="voiceExpInterval"
              type="number"
              min="1"
              value={settings.voice.voiceExpInterval}
              onChange={(e) =>
                handleVoiceChange("voiceExpInterval", e.target.value)
              }
              placeholder="1"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              How often should voice exp be given? Default: 1 minute.
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label>Ignored Voice Channels</label>
            <select
              multiple
              defaultValue={settings.voice.ignoredVoiceChannels}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value,
                );
                handleVoiceChange("ignoredVoiceChannels", selected);
              }}
              className={editorStyles.multiSelect}
              size={Math.min(voiceChannels.length, 5)}
            >
              {voiceChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <small>
              Hold Ctrl/Cmd to select multiple or deselect. Voice channels that
              will not grant exp towards the level system.
            </small>
          </div>
        </div>
      </div>

      {/* EXP MULTIPLIER - GLOBAL */}
      <div className={editorStyles.sectionWrapper}>
        <div className={editorStyles.section}>
          <h2>Exp Multiplier</h2>
          <p className={styles.hint} style={{ marginBottom: "1rem" }}>
            Global exp multiplier applied to all users. Leave empty to disable.
          </p>

          <div className={editorStyles.formGroup}>
            <label htmlFor="expMultiplierValue" className={styles.label}>
              Multiplier
            </label>
            <input
              id="expMultiplierValue"
              type="number"
              min="0"
              step="0.1"
              value={settings.expMultiplier.multiplier}
              onChange={(e) =>
                handleExpMultiplierChange("multiplier", e.target.value)
              }
              placeholder="e.g. 1.5"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              e.g. 1.5 = 1.5× exp. Leave empty to disable.
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label>Limited Time</label>
            <div
              className={moduleCardStyles.toggleWrapper}
              style={{ flexDirection: "unset" }}
              onClick={(e) => e.stopPropagation()}
            >
              <label className={moduleCardStyles.toggle}>
                <input
                  type="checkbox"
                  checked={settings.expMultiplier.limitedTime.enabled}
                  onChange={(e) =>
                    handleExpMultiplierLimitedTime("enabled", e.target.checked)
                  }
                />
                <span className={moduleCardStyles.slider}></span>
              </label>
              <span className={moduleCardStyles.status}>
                {settings.expMultiplier.limitedTime.enabled
                  ? "Enabled"
                  : "Disabled"}
              </span>
            </div>
            <small className={styles.hint}>
              Automatically disable the multiplier after a set number of days.
            </small>
          </div>

          {settings.expMultiplier.limitedTime.enabled && (
            <div className={editorStyles.formGroup}>
              <label htmlFor="limitedTimeDays" className={styles.label}>
                Duration (days)
              </label>
              <input
                id="limitedTimeDays"
                type="number"
                min="1"
                value={settings.expMultiplier.limitedTime.days}
                onChange={(e) =>
                  handleExpMultiplierLimitedTime("days", e.target.value)
                }
                placeholder="e.g. 7"
                className={editorStyles.input}
              />
              <small className={styles.hint}>
                How many days should the multiplier be active?
              </small>
            </div>
          )}

          <div className={editorStyles.formGroup}>
            <label>Channels</label>
            <select
              multiple
              defaultValue={settings.expMultiplier.channelIds}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value,
                );
                handleExpMultiplierChange("channelIds", selected);
              }}
              className={editorStyles.multiSelect}
              size={Math.min(channels.length, 5)}
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <small>
              Hold Ctrl/Cmd to select multiple or deselect. Leave empty to apply
              to all channels.
            </small>
          </div>

          <div className={editorStyles.formGroup}>
            <label>Voice Channels</label>
            <select
              multiple
              defaultValue={settings.expMultiplier.voiceChannelIds}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (o) => o.value,
                );
                handleExpMultiplierChange("voiceChannelIds", selected);
              }}
              className={editorStyles.multiSelect}
              size={Math.min(voiceChannels.length, 5)}
            >
              {voiceChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <small>Leave empty to apply to all voice channels.</small>
          </div>
        </div>

        {/* EXP MULTIPLIER - PER USER / ROLE */}
        <div className={editorStyles.section}>
          <h2>Exp Multiplier per User / Role</h2>
          <p className={styles.hint} style={{ marginBottom: "1rem" }}>
            Override the exp multiplier for specific users or roles.
          </p>

          {settings.expMultiplierEntries.map((entry) => (
            <div key={entry.id} className={editorStyles.entryBlock}>
              <div className={editorStyles.entryHeader}>
                <span className={editorStyles.entryType}>
                  {entry.type === "user" ? "👤 User" : "🏷️ Role"}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <label className={moduleCardStyles.toggle}>
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(e) =>
                        updateEntry(entry.id, "enabled", e.target.checked)
                      }
                    />
                    <span className={moduleCardStyles.slider}></span>
                  </label>
                  <span className={moduleCardStyles.status}>
                    {entry.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className={editorStyles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className={editorStyles.entryFields}>
                <div className={editorStyles.formGroup}>
                  <label className={styles.label}>
                    {entry.type === "user" ? "User" : "Role"}
                  </label>
                  {entry.type === "user" ? (
                    <UserPicker
                      users={users}
                      value={entry.targetId}
                      onChange={(userId) =>
                        updateEntry(entry.id, "targetId", userId)
                      }
                    />
                  ) : (
                    <select
                      value={entry.targetId}
                      onChange={(e) =>
                        updateEntry(entry.id, "targetId", e.target.value)
                      }
                      className={styles.select}
                    >
                      <option value="">Select a role...</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className={editorStyles.formGroup}>
                  <label className={styles.label}>Multiplier</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={entry.multiplier}
                    onChange={(e) =>
                      updateEntry(entry.id, "multiplier", e.target.value)
                    }
                    placeholder="e.g. 2.0"
                    className={editorStyles.input}
                  />
                  <small className={styles.hint}>
                    e.g. 2.0 = 2× exp for this {entry.type}.
                  </small>
                </div>

                <div className={editorStyles.formGroup}>
                  <label className={styles.label}>Channels</label>
                  <select
                    multiple
                    defaultValue={entry.channelIds}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (o) => o.value,
                      );
                      updateEntry(entry.id, "channelIds", selected);
                    }}
                    className={editorStyles.multiSelect}
                    size={Math.min(channels.length, 4)}
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                  <small>Leave empty to apply to all channels.</small>
                </div>

                <div className={editorStyles.formGroup}>
                  <label className={styles.label}>Voice Channels</label>
                  <select
                    multiple
                    defaultValue={entry.voiceChannelIds}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (o) => o.value,
                      );
                      updateEntry(entry.id, "voiceChannelIds", selected);
                    }}
                    className={editorStyles.multiSelect}
                    size={Math.min(voiceChannels.length, 4)}
                  >
                    {voiceChannels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                  <small>Leave empty to apply to all voice channels.</small>
                </div>
              </div>
            </div>
          ))}

          <div
            style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}
          >
            <button
              type="button"
              onClick={() => addEntry("user")}
              className={editorStyles.addButton}
            >
              + Add User
            </button>
            <button
              type="button"
              onClick={() => addEntry("role")}
              className={editorStyles.addButton}
            >
              + Add Role
            </button>
          </div>
        </div>
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
