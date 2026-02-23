import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import editorStyles from "../styles/ReactionRoleEditor.module.css";

export default function ReactionRoleEditor() {
  const { guildId, reactionRoleId } = useParams();
  const navigate = useNavigate();
  const { user, guilds, loading: authLoading } = useAuth();
  const isEdit = !!reactionRoleId;
  const pickerRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    messageLink: "",
    reactions: [{ emoji: "", emojiName: "", isCustom: false, roleIds: [] }],
    type: "normal",
    allowedRoles: [],
    ignoredRoles: [],
    allowMultiple: true,
    keepCounterAtOne: false,
  });

  const [roles, setRoles] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      fetchRoles();
      fetchEmojis();
      if (isEdit) {
        fetchReactionRole();
      } else {
        setLoading(false);
      }
    }
  }, [guildId, reactionRoleId, authLoading]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(null);
      }
    };

    if (showEmojiPicker !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/roles`, {
        withCredentials: true,
      });
      const assignableRoles = (response.data.roles || []).filter(
        (role) => !role.managed
      );
      setRoles(assignableRoles);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
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

  const fetchReactionRole = async () => {
    try {
      const response = await axios.get(
        `/guilds/${guildId}/reaction-roles/${reactionRoleId}`,
        {
          withCredentials: true,
        }
      );

      if (
        !response.data ||
        typeof response.data !== "object" ||
        Array.isArray(response.data)
      ) {
        console.error("Invalid response format:", response.data);
        alert("Failed to load reaction role. Invalid response from server.");
        navigate(`/guild/${guildId}/module/reactionroles`);
        return;
      }

      const data = response.data;
      if (!data.reactions || !Array.isArray(data.reactions)) {
        data.reactions = [
          { emoji: "", emojiName: "", isCustom: false, roleIds: [] },
        ];
      }

      setFormData(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch reaction role:", err);
      alert("Failed to load reaction role. Please try again.");
      navigate(`/guild/${guildId}/module/reactionroles`);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
  };

  const addReaction = () => {
    setFormData((prev) => ({
      ...prev,
      reactions: [
        ...prev.reactions,
        { emoji: "", emojiName: "", isCustom: false, roleIds: [] },
      ],
    }));
  };

  const removeReaction = (index) => {
    setFormData((prev) => ({
      ...prev,
      reactions: prev.reactions.filter((_, i) => i !== index),
    }));
  };

  const updateReaction = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      reactions: prev.reactions.map((reaction, i) =>
        i === index ? { ...reaction, [field]: value } : reaction
      ),
    }));
  };

  const handleEmojiSelect = (index, emojiData) => {
    updateReaction(index, "emoji", emojiData.emoji);
    updateReaction(index, "emojiName", emojiData.names?.[0] || emojiData.emoji);
    updateReaction(index, "isCustom", false);
    setShowEmojiPicker(null);
  };

  const handleCustomEmojiSelect = (index, customEmoji) => {
    updateReaction(index, "emoji", customEmoji.id);
    updateReaction(index, "emojiName", customEmoji.name);
    updateReaction(index, "isCustom", true);
    setShowEmojiPicker(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a name");
      return;
    }

    if (!formData.messageLink.trim()) {
      alert("Please enter a message link");
      return;
    }

    if (formData.reactions.some((r) => !r.emoji || r.roleIds.length === 0)) {
      alert("All reactions must have an emoji and at least one role selected");
      return;
    }

    setSaving(true);

    try {
      if (isEdit) {
        await axios.put(
          `/guilds/${guildId}/reaction-roles/${reactionRoleId}/${user.id}/@${user.username}`,
          formData,
          {
            withCredentials: true,
          }
        );
      } else {
        await axios.post(`/guilds/${guildId}/reaction-roles/${user.id}/@${user.username}`, formData, {
          withCredentials: true,
        });
      }

      navigate(`/guild/${guildId}/module/reactionroles`);
    } catch (err) {
      console.error("Failed to save reaction role:", err);
      alert(err.response?.data?.error || "Failed to save reaction role");
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} selectedGuildId={guildId} />

      <div style={{ padding: "2rem" }}>
        <button
          className={styles.button}
          onClick={() => navigate(`/guild/${guildId}/module/reactionroles`)}
          style={{ marginBottom: "1rem" }}
        >
          ← Back to Reaction Roles
        </button>

        <h1>{isEdit ? "Edit" : "Create"} Reaction Role</h1>

        <form onSubmit={handleSave} className={editorStyles.form}>
          {/* Message Settings */}
          <section className={editorStyles.section}>
            <h2>Message Settings</h2>

            <div className={editorStyles.formGroup}>
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Role Selection Menu"
                required
              />
            </div>

            <div className={editorStyles.formGroup}>
              <label htmlFor="messageLink">
                Message Link *
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="Right-click a message in Discord and select 'Copy Message Link'"
                >
                  ⓘ
                </span>
              </label>
              <input
                id="messageLink"
                name="messageLink"
                type="text"
                value={formData.messageLink}
                onChange={handleChange}
                placeholder="https://discord.com/channels/..."
                required
              />
              <small>
                Right-click a message in Discord and select "Copy Message Link"
              </small>
            </div>
          </section>

          {/* Reaction Settings */}
          <section className={editorStyles.section}>
            <h2>Reaction Settings</h2>

            {formData.reactions.map((reaction, index) => (
              <div key={index} className={editorStyles.reactionBlock}>
                <div className={editorStyles.reactionHeader}>
                  <h3>Reaction {index + 1}</h3>
                  {formData.reactions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReaction(index)}
                      className={editorStyles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className={editorStyles.formGroup}>
                  <label>Emoji *</label>
                  <div className={editorStyles.emojiSelector}>
                    {reaction.emoji ? (
                      <div className={editorStyles.selectedEmoji}>
                        {reaction.isCustom ? (
                          <img
                            src={`https://cdn.discordapp.com/emojis/${reaction.emoji}.png`}
                            alt={reaction.emojiName}
                            className={editorStyles.emojiImage}
                          />
                        ) : (
                          <span className={editorStyles.emojiNative}>
                            {reaction.emoji}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            updateReaction(index, "emoji", "");
                            updateReaction(index, "emojiName", "");
                            updateReaction(index, "isCustom", false);
                          }}
                          className={editorStyles.clearEmoji}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(index)}
                        className={editorStyles.selectEmojiButton}
                      >
                        Select Emoji
                      </button>
                    )}

                    {showEmojiPicker === index && (
                      <div
                        ref={pickerRef}
                        className={editorStyles.emojiPickerWrapper}
                      >
                        <EmojiPicker
                          onEmojiClick={(emojiData) =>
                            handleEmojiSelect(index, emojiData)
                          }
                          theme={Theme.DARK}
                          width="100%"
                          height={400}
                          previewConfig={{ showPreview: false }}
                          emojiStyle={EmojiStyle.TWITTER}
                        />

                        {/* Custom Discord Emojis Section */}
                        {emojis.length > 0 && (
                          <div className={editorStyles.customEmojis}>
                            <div className={editorStyles.customEmojisHeader}>
                              Custom Discord Emojis
                            </div>
                            <div className={editorStyles.customEmojiGrid}>
                              {emojis.map((emoji) => (
                                <button
                                  key={emoji.id}
                                  type="button"
                                  onClick={() =>
                                    handleCustomEmojiSelect(index, emoji)
                                  }
                                  className={editorStyles.customEmojiButton}
                                  title={emoji.name}
                                >
                                  <img
                                    src={`https://cdn.discordapp.com/emojis/${emoji.id}.png`}
                                    alt={emoji.name}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={editorStyles.formGroup}>
                  <label>Roles *</label>
                  <select
                    multiple
                    onChange={(e) => {
                      const selectedOptions = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      updateReaction(index, "roleIds", selectedOptions);
                    }}
                    className={editorStyles.multiSelect}
                    size={Math.min(roles.length, 10)}
                    required
                  >
                    {roles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                        selected={reaction.roleIds?.includes(role.id)}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple roles</small>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addReaction}
              className={editorStyles.addButton}
            >
              + Add Reaction
            </button>
          </section>

          {/* Options */}
          <section className={editorStyles.section}>
            <h2>Options</h2>

            <div className={editorStyles.formGroup}>
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="normal">Normal</option>
                <option value="add_only">Add Only</option>
                <option value="remove_only">Remove Only</option>
              </select>
              <small>
                {formData.type === "normal" &&
                  "Reaction adds role, removing reaction removes role"}
                {formData.type === "add_only" &&
                  "Reaction only adds role, never removes it"}
                {formData.type === "remove_only" &&
                  "Reaction only removes role"}
              </small>
            </div>

            <div className={editorStyles.formGroup}>
              <label>
                Allowed Roles
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="Only members with these roles can receive reaction roles. Leave empty to allow all members."
                >
                  ⓘ
                </span>
              </label>
              <select
                multiple
                onChange={(e) => {
                  const selectedOptions = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFormData((prev) => ({
                    ...prev,
                    allowedRoles: selectedOptions,
                  }));
                }}
                className={editorStyles.multiSelect}
                size={Math.min(roles.length, 10)}
              >
                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                    selected={formData.allowedRoles?.includes(role.id)}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
              <small>
                Leave empty to allow all members. Hold Ctrl/Cmd for multiple
              </small>
            </div>

            <div className={editorStyles.formGroup}>
              <label>
                Ignored Roles
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="Members with these roles will be ignored and won't receive any reaction roles."
                >
                  ⓘ
                </span>
              </label>
              <select
                multiple
                onChange={(e) => {
                  const selectedOptions = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFormData((prev) => ({
                    ...prev,
                    ignoredRoles: selectedOptions,
                  }));
                }}
                className={editorStyles.multiSelect}
                size={Math.min(roles.length, 10)}
              >
                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                    selected={formData.ignoredRoles?.includes(role.id)}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
              <small>Hold Ctrl/Cmd to select multiple roles</small>
            </div>

            <div className={editorStyles.formGroup}>
              <label className={editorStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="allowMultiple"
                  checked={formData.allowMultiple}
                  onChange={handleChange}
                />
                Allow members to get multiple roles
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="When disabled, members can only react to one reaction at a time. Their previous reaction will be removed."
                >
                  ⓘ
                </span>
              </label>
            </div>

            <div className={editorStyles.formGroup}>
              <label className={editorStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="keepCounterAtOne"
                  checked={formData.keepCounterAtOne}
                  onChange={handleChange}
                />
                Keep reaction counter at 1
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="Instantly remove reactions after reacting (but still give the role). Useful for verification menus."
                >
                  ⓘ
                </span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className={editorStyles.saveButton}
          >
            {saving
              ? "Saving..."
              : isEdit
              ? "Update Reaction Role"
              : "Create Reaction Role"}
          </button>
        </form>
      </div>
    </div>
  );
}
