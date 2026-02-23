import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import editorStyles from "../styles/ReactionRoleEditor.module.css";
import moduleSettingsStyles from "../styles/ModuleSettings.module.css";

export default function CustomCommandEditor() {
  const { guildId, customCommandId } = useParams();
  const navigate = useNavigate();
  const { user, guilds, loading: authLoading } = useAuth();
  const isEdit = !!customCommandId;

  const [formData, setFormData] = useState({
    name: "",
    command: "",
    replies: [],
    allowedRoles: [],
    embedColor: "",
    tagUser: false,
  });

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchRoles();
      if (isEdit) {
        fetchCustomCommands();
      } else {
        setLoading(false);
      }
    }
  }, [guildId, customCommandId, authLoading]);

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

  const fetchCustomCommands = async () => {
    try {
      const response = await axios.get(
        `/guilds/${guildId}/custom-commands/${customCommandId}`,
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
        alert("Failed to load custom command. Invalid response from server.");
        navigate(`/guild/${guildId}/module/customcommands`);
        return;
      }

      const data = response.data;

      // Ensure replies is always an array
      if (!data.replies || !Array.isArray(data.replies)) {
        data.replies = data.reply ? [data.reply] : [""]; // Handle old single reply format
      }

      // Set default embed color if not present
      if (!data.embedColor) {
        data.embedColor = "#11ff00";
      }

      setFormData(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch custom command:", err);
      alert("Failed to load custom command. Please try again.");
      navigate(`/guild/${guildId}/module/customcommands`);
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a name");
      return;
    }

    if (!formData.command.trim()) {
      alert("Please enter a command");
      return;
    }

    if (!formData.description.trim()) {
      alert("Please enter a command description");
      return;
    }

    if (!formData.embedColor) {
      formData.embedColor = "#11ff00";
    }

    if (!formData.replies[0]) {
      alert("Please enter a reply");
      return;
    }

    setSaving(true);

    try {
      if (isEdit) {
        await axios.put(
          `/guilds/${guildId}/custom-commands/${customCommandId}/${user.id}/@${user.username}`,
          formData,
          {
            withCredentials: true,
          }
        );
      } else {
        await axios.post(
          `/guilds/${guildId}/custom-commands/${user.id}/@${user.username}`,
          formData,
          {
            withCredentials: true,
          }
        );
      }

      navigate(`/guild/${guildId}/module/customcommands`);
    } catch (err) {
      console.error("Failed to save custom command:", err);
      alert(err.response?.data?.error || "Failed to save custom command");
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
          onClick={() => navigate(`/guild/${guildId}/module/customcommands`)}
          style={{ marginBottom: "1rem" }}
        >
          ← Back to Custom Commands
        </button>

        <h1>{isEdit ? "Edit" : "Create"} Custom Command</h1>

        <form onSubmit={handleSave} className={editorStyles.form}>
          {/* Message Settings */}
          <section className={editorStyles.section}>
            <h2>Command Settings</h2>

            <div className={editorStyles.formGroup}>
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                required
              />
            </div>

            <div className={editorStyles.formGroup}>
              <label htmlFor="name">Command *</label>
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "#999",
                  }}
                >
                  /
                </span>
                <input
                  id="command"
                  name="command"
                  type="text"
                  value={formData.command}
                  onChange={handleChange}
                  placeholder="Command"
                  style={{ paddingLeft: "1.5rem" }}
                  required
                />
              </div>
            </div>

            <div className={editorStyles.formGroup}>
              <label htmlFor="name">Description *</label>
              <input
                id="description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                required
              />
            </div>
          </section>

          {/* Reply Settings */}
          <section className={editorStyles.section}>
            <h2>Reply Settings</h2>

            {(formData.replies || []).map((reply, index) => (
              <div key={index} className={editorStyles.formGroup}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label htmlFor={`reply-${index}`}>Reply {index + 1} *</label>
                  {(formData.replies?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          replies: prev.replies.filter((_, i) => i !== index),
                        }));
                      }}
                      className={editorStyles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  className={moduleSettingsStyles.textarea}
                  style={{ backgroundColor: "var(--tertiary-color)" }}
                  id={`reply-${index}`}
                  name={`reply-${index}`}
                  value={reply}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      replies: prev.replies.map((r, i) =>
                        i === index ? e.target.value : r
                      ),
                    }));
                  }}
                  placeholder="Enter your reply message..."
                  rows={4}
                  required
                />
                <small
                  style={{
                    display: "block",
                    marginTop: "0.5rem",
                    color: "#999",
                  }}
                >
                  You can use placeholders: <code>{"{user}"}</code> (mentions
                  the user),
                  <code>{" {username}"}</code> (user's name),
                  <code>{" {server}"}</code> (server name)
                </small>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  replies: [...(prev.replies || []), ""],
                }));
              }}
              className={editorStyles.addButton}
              style={{ marginTop: "1rem" }}
            >
              + Add Reply Variant
            </button>

            <small
              style={{ display: "block", marginTop: "1rem", color: "#bbb" }}
            >
              💡 When multiple replies are added, one will be randomly selected
              when the command is used.
            </small>
          </section>

          {/* Options */}
          <section className={editorStyles.section}>
            <h2>Options</h2>

            <div className={editorStyles.formGroup}>
              <label>
                Allowed Roles
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="Only members with these roles can use this command. Leave empty to allow all members."
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
            <div
              className={editorStyles.formGroup}
              style={{ marginTop: "2rem" }}
            >
              <label htmlFor="embedColor">Embed Color</label>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  id="embedColor"
                  name="embedColor"
                  type="text"
                  value={formData.embedColor || "#11ff00"}
                  onChange={handleChange}
                  placeholder="#11ff00"
                  style={{
                    flex: 1,
                    backgroundColor: "var(--tertiary-color)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    padding: "0.5rem",
                  }}
                />
                <input
                  type="color"
                  value={formData.embedColor || "#11ff00"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      embedColor: e.target.value,
                    }))
                  }
                  style={{
                    width: "60px",
                    height: "38px",
                    cursor: "pointer",
                    border: "none",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <small>Color of the reply embed</small>
            </div>

            <div className={editorStyles.formGroup}>
              <label className={editorStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="tagUser"
                  checked={formData.tagUser}
                  onChange={handleChange}
                />
                Tag a user
                <span
                  className={editorStyles.tooltip}
                  data-tooltip="When enabled, you can tag a user in the command and use {user} in your replies."
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
              ? "Update Custom Command"
              : "Create Custom Command"}
          </button>
        </form>
      </div>
    </div>
  );
}
