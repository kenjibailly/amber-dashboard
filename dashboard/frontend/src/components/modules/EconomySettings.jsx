import { useState, useEffect, useRef } from "react";
import axios from "axios";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import styles from "../../styles/ModuleSettings.module.css";
import ecoStyles from "../../styles/EconomySettings.module.css";
import editorStyles from "../../styles/EditorStyles.module.css";
import defaultTrollMissions from "../../../config/trollMissions.json";

const REWARDS = [
  { id: "changeNickname", label: "Change your nickname" },
  { id: "changeOtherNickname", label: "Change someone's nickname" },
  { id: "addEmoji", label: "Add a custom server emoji" },
  { id: "addRole", label: "Add a custom role name and color" },
  { id: "addChannel", label: "Add a custom channel" },
  { id: "trollSomeone", label: "Troll someone" },
];

const defaultReward = { price: "", time: "", enabled: false };

const defaultFormData = {
  rewards: Object.fromEntries(REWARDS.map((r) => [r.id, { ...defaultReward }])),
  allRewards: { price: "", time: "" },
  wallet: {
    tokenEmoji: { emoji: "", emojiName: "", isCustom: false },
    extraCurrency: {
      enabled: false,
      tokenEmoji: { emoji: "", emojiName: "", isCustom: false },
    },
  },
  channelName: {
    useEmojiPrefix: false,
    useSeparator: false,
    separator: "",
  },
  rewardChannelId: "",
  trollMissions: [],
};

function EmojiPickerField({ value, onChange, guildEmojis = [], label }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("standard");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleStandard = (emojiData) => {
    onChange({
      emoji: emojiData.emoji,
      emojiName: emojiData.names?.[0] || emojiData.emoji,
      isCustom: false,
    });
    setOpen(false);
  };

  const handleCustom = (customEmoji) => {
    onChange({
      emoji: customEmoji.id,
      emojiName: customEmoji.name,
      isCustom: true,
    });
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange({ emoji: "", emojiName: "", isCustom: false });
  };

  return (
    <div className={ecoStyles.emojiField} ref={ref}>
      {label && <label className={styles.label}>{label}</label>}
      <button
        type="button"
        className={ecoStyles.emojiTrigger}
        onClick={() => setOpen((v) => !v)}
      >
        {value.emoji ? (
          <>
            {value.isCustom ? (
              <img
                src={`https://cdn.discordapp.com/emojis/${value.emoji}.png`}
                alt={value.emojiName}
                className={ecoStyles.emojiImg}
              />
            ) : (
              <span className={ecoStyles.emojiNative}>{value.emoji}</span>
            )}
            <span className={ecoStyles.emojiName}>{value.emojiName}</span>
            <span className={ecoStyles.emojiClear} onClick={clear}>
              ✕
            </span>
          </>
        ) : (
          <span className={ecoStyles.emojiPlaceholder}>Select emoji…</span>
        )}
      </button>

      {open && (
        <div className={ecoStyles.emojiDropdown}>
          {guildEmojis.length > 0 && (
            <div className={ecoStyles.emojiTabs}>
              <button
                type="button"
                className={tab === "standard" ? ecoStyles.activeTab : ""}
                onClick={() => setTab("standard")}
              >
                Standard
              </button>
              <button
                type="button"
                className={tab === "custom" ? ecoStyles.activeTab : ""}
                onClick={() => setTab("custom")}
              >
                Server
              </button>
            </div>
          )}
          {tab === "standard" || guildEmojis.length === 0 ? (
            <EmojiPicker
              onEmojiClick={handleStandard}
              theme={Theme.DARK}
              width="100%"
              height={350}
              previewConfig={{ showPreview: false }}
              emojiStyle={EmojiStyle.TWITTER}
            />
          ) : (
            <div className={ecoStyles.customEmojiGrid}>
              {guildEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  type="button"
                  onClick={() => handleCustom(emoji)}
                  className={ecoStyles.customEmojiBtn}
                  title={emoji.name}
                >
                  <img
                    src={`https://cdn.discordapp.com/emojis/${emoji.id}.png`}
                    alt={emoji.name}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EconomySettings({ guildId, user }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [channels, setChannels] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchChannels(), fetchEmojis()]).finally(() =>
      setLoading(false),
    );
  }, [guildId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/modules/economy`, {
        withCredentials: true,
      });
      if (
        response.data.settings &&
        Object.keys(response.data.settings).length > 0
      ) {
        const settings = response.data.settings;
        // If no custom troll missions saved, use the JSON defaults
        if (!settings.trollMissions || settings.trollMissions.length === 0) {
          settings.trollMissions = defaultTrollMissions.map((m) => ({ ...m }));
        }
        setFormData((prev) => ({ ...prev, ...settings }));
      } else {
        // No settings at all — still load default missions
        setFormData((prev) => ({
          ...prev,
          trollMissions: defaultTrollMissions.map((m) => ({ ...m })),
        }));
      }
    } catch (err) {
      console.error("Failed to fetch economy settings:", err);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/channels`, {
        withCredentials: true,
      });
      setChannels(response.data.channels || []);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  };

  const fetchEmojis = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/emojis`, {
        withCredentials: true,
      });
      setEmojis(response.data.emojis || []);
    } catch (err) {
      console.error("Failed to fetch emojis:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await axios.put(
        `/guilds/${guildId}/modules/economy/settings/${user.id}/@${user.username}`,
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

  const setReward = (rewardId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rewards: {
        ...prev.rewards,
        [rewardId]: { ...prev.rewards[rewardId], [field]: value },
      },
    }));
  };

  const setAllRewards = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      allRewards: { ...prev.allRewards, [field]: value },
    }));
  };

  const setWalletEmoji = (emojiVal) => {
    setFormData((prev) => ({
      ...prev,
      wallet: { ...prev.wallet, tokenEmoji: emojiVal },
    }));
  };

  const setExtraCurrency = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        extraCurrency: { ...prev.wallet.extraCurrency, [field]: value },
      },
    }));
  };

  const setExtraEmoji = (emojiVal) => {
    setFormData((prev) => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        extraCurrency: { ...prev.wallet.extraCurrency, tokenEmoji: emojiVal },
      },
    }));
  };

  const setChannelName = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      channelName: { ...prev.channelName, [field]: value },
    }));
  };

  const addMission = () => {
    const missions = formData.trollMissions || [];
    const nextId =
      missions.length > 0
        ? String(Math.max(...missions.map((m) => parseInt(m.id) || 0)) + 1)
        : "1";
    setFormData((prev) => ({
      ...prev,
      trollMissions: [
        ...(prev.trollMissions || []),
        { id: nextId, title: "", description: "" },
      ],
    }));
  };

  const updateMission = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.trollMissions || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, trollMissions: updated };
    });
  };

  const removeMission = (index) => {
    setFormData((prev) => {
      const updated = [...(prev.trollMissions || [])];
      updated.splice(index, 1);
      return { ...prev, trollMissions: updated };
    });
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className={styles.settingsForm}>
      {/* ── INDIVIDUAL REWARDS ── */}
      <section className={editorStyles.section}>
        <h2>Rewards</h2>
        <p className={ecoStyles.sectionDesc}>
          Configure each reward individually. These settings are overridden if
          "All Rewards" is configured.
        </p>
        {REWARDS.map((reward) => {
          const r = formData.rewards[reward.id] || defaultReward;
          return (
            <div
              key={reward.id}
              className={editorStyles.input}
              style={{ marginBottom: "20px" }}
            >
              <div className={ecoStyles.rewardHeader}>
                <span className={ecoStyles.rewardLabel}>{reward.label}</span>
                <label className={ecoStyles.toggle}>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) =>
                      setReward(reward.id, "enabled", e.target.checked)
                    }
                  />
                  <span className={ecoStyles.toggleSlider} />
                </label>
              </div>
              {r.enabled && (
                <div className={ecoStyles.rewardFields}>
                  <div className={ecoStyles.fieldGroup}>
                    <label>Price</label>
                    <input
                      type="number"
                      min="0"
                      value={r.price}
                      onChange={(e) =>
                        setReward(reward.id, "price", e.target.value)
                      }
                      placeholder="0"
                      className={styles.input}
                    />
                  </div>
                  <div className={ecoStyles.fieldGroup}>
                    <label>Duration (days)</label>
                    <input
                      type="number"
                      min="0"
                      value={r.time}
                      onChange={(e) =>
                        setReward(reward.id, "time", e.target.value)
                      }
                      placeholder="0 = permanent"
                      className={styles.input}
                    />
                    <small>Days before reward is removed. 0 = permanent.</small>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ── ALL REWARDS ── */}
      <section className={editorStyles.section}>
        <h2 className={ecoStyles.sectionTitle}>All Rewards</h2>
        <p className={ecoStyles.sectionDesc}>
          Overrides the individual settings above and applies these values to
          every reward.
        </p>
        <div className={ecoStyles.rewardFields}>
          <div className={ecoStyles.fieldGroup}>
            <label className={styles.label}>Price</label>
            <input
              type="number"
              min="0"
              value={formData.allRewards.price}
              onChange={(e) => setAllRewards("price", e.target.value)}
              placeholder="Leave empty to use individual prices"
              className={editorStyles.input}
            />
          </div>
          <div className={ecoStyles.fieldGroup}>
            <label className={styles.label}>Duration (days)</label>
            <input
              type="number"
              min="0"
              value={formData.allRewards.time}
              onChange={(e) => setAllRewards("time", e.target.value)}
              placeholder="Leave empty to use individual durations"
              className={editorStyles.input}
            />
            <small className={styles.hint}>
              Days before reward is removed. 0 = permanent.
            </small>
          </div>
        </div>
      </section>

      {/* ── WALLET CONFIG ── */}
      <section className={editorStyles.section}>
        <h2 className={ecoStyles.sectionTitle}>Wallet Config</h2>
        <p className={ecoStyles.sectionDesc}>
          Default emoji have been set if none configured.
        </p>
        <div className={editorStyles.formGroup}>
          <EmojiPickerField
            label="Token Emoji"
            value={formData.wallet.tokenEmoji}
            onChange={setWalletEmoji}
            guildEmojis={emojis}
          />
          <small className={styles.hint}>
            The emoji shown next to the currency in wallets.
          </small>
        </div>
        <div className={editorStyles.input}>
          <div className={ecoStyles.rewardHeader}>
            <span className={ecoStyles.rewardLabel}>Extra Currency</span>
            <label className={ecoStyles.toggle}>
              <input
                type="checkbox"
                checked={formData.wallet.extraCurrency.enabled}
                onChange={(e) => setExtraCurrency("enabled", e.target.checked)}
              />
              <span className={ecoStyles.toggleSlider} />
            </label>
          </div>
          {formData.wallet.extraCurrency.enabled && (
            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
              <EmojiPickerField
                label="Extra Currency Token Emoji"
                value={formData.wallet.extraCurrency.tokenEmoji}
                onChange={setExtraEmoji}
                guildEmojis={emojis}
              />
              <small className={styles.hint}>
                The emoji for the secondary currency.
              </small>
            </div>
          )}
        </div>
      </section>

      {/* ── CHANNEL NAME CONFIG ── */}
      <section className={editorStyles.section}>
        <h2 className={ecoStyles.sectionTitle}>Channel Name Configuration</h2>
        <p className={ecoStyles.sectionDesc}>
          Control how the economy channel name is formatted.
        </p>
        <div className={editorStyles.input}>
          <div className={ecoStyles.rewardHeader}>
            <span className={ecoStyles.rewardLabel}>Emoji Prefix</span>
            <label className={ecoStyles.toggle}>
              <input
                type="checkbox"
                checked={formData.channelName.useEmojiPrefix}
                onChange={(e) =>
                  setChannelName("useEmojiPrefix", e.target.checked)
                }
              />
              <span className={ecoStyles.toggleSlider} />
            </label>
          </div>
        </div>
        <div className={editorStyles.input} style={{ marginTop: "1rem" }}>
          <div className={ecoStyles.rewardHeader}>
            <span className={ecoStyles.rewardLabel}>Separator</span>
            <label className={ecoStyles.toggle}>
              <input
                type="checkbox"
                checked={formData.channelName.useSeparator}
                onChange={(e) =>
                  setChannelName("useSeparator", e.target.checked)
                }
              />
              <span className={ecoStyles.toggleSlider} />
            </label>
          </div>
          {formData.channelName.useSeparator && (
            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
              <label className={styles.label}>Separator Character</label>
              <input
                type="text"
                value={formData.channelName.separator}
                onChange={(e) => setChannelName("separator", e.target.value)}
                placeholder="e.g. │ or ·"
                className={styles.input}
                maxLength={5}
              />
              <small className={styles.hint}>
                Character placed between the emoji prefix and channel name.
              </small>
            </div>
          )}
        </div>
      </section>

      {/* ── REWARD CHANNEL ── */}
      <section className={editorStyles.section}>
        <h2 className={ecoStyles.sectionTitle}>Reward Channel</h2>
        <div className={styles.formGroup}>
          <label htmlFor="rewardChannelId" className={styles.label}>
            Channel
          </label>
          <select
            id="rewardChannelId"
            value={formData.rewardChannelId}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                rewardChannelId: e.target.value,
              }))
            }
            className={styles.select}
          >
            <option value="">Select a channel…</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                # {channel.name}
              </option>
            ))}
          </select>
          <small className={styles.hint}>
            Reward updates and notifications will be posted here.
          </small>
        </div>
      </section>

      {/* ── TROLL MISSIONS ── */}
      <section className={editorStyles.section}>
        <h2 className={ecoStyles.sectionTitle}>Troll Missions</h2>
        <p className={ecoStyles.sectionDesc}>
          Customize the troll missions users must complete. The default missions
          are pre-loaded — edit, remove, or add as needed.
        </p>

        {(formData.trollMissions || []).map((mission, index) => (
          <div
            key={index}
            className={editorStyles.input}
            style={{ marginBottom: "16px" }}
          >
            <div className={editorStyles.entryHeader}>
              <span className={editorStyles.entryType}>
                Mission {index + 1}
              </span>
              <button
                type="button"
                className={editorStyles.removeButton}
                onClick={() => removeMission(index)}
                style={{ float: "right" }}
              >
                Remove
              </button>
            </div>
            <div className={editorStyles.entryFields}>
              <div
                className={ecoStyles.fieldGroup}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                <label className={styles.label}>Title</label>
                <input
                  type="text"
                  value={mission.title}
                  onChange={(e) =>
                    updateMission(index, "title", e.target.value)
                  }
                  placeholder="Mission title"
                  className={styles.input}
                />
              </div>
              <div className={ecoStyles.fieldGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  value={mission.description || ""}
                  onChange={(e) =>
                    updateMission(index, "description", e.target.value)
                  }
                  placeholder="Optional description"
                  className={styles.input}
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMission}
          className={styles.saveButton}
          style={{ marginTop: "8px" }}
        >
          + Add Mission
        </button>
      </section>

      {/* ── SAVE ── */}
      <div className={styles.buttonGroup}>
        <button type="submit" disabled={saving} className={styles.saveButton}>
          {saving ? "Saving…" : "Save Settings"}
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
