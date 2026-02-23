import { useState, useEffect, useRef } from "react";
import axios from "axios";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import styles from "../../styles/EmbedEditor.module.css";

export default function EmbedEditor({ embedData, setEmbedData, guildId }) {
  const [showColorPicker, setShowColorPicker] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    "embed-0": true,
    "author-0": false,
    "body-0": true,
    "fields-0": false,
    "images-0": false,
    "footer-0": false,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [customEmojis, setCustomEmojis] = useState([]);
  const pickerRef = useRef(null);

  useEffect(() => {
    fetchEmojis();
  }, [guildId]);

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

  const fetchEmojis = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/emojis`, {
        withCredentials: true,
      });
      setCustomEmojis(response.data.emojis || []);
    } catch (err) {
      console.error("Failed to fetch emojis:", err);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateEmbedAtIndex = (embedIndex, path, value) => {
    setEmbedData((prev) => {
      const newData = { ...prev };
      const newEmbeds = [...newData.embeds];
      const embed = { ...newEmbeds[embedIndex] };

      const keys = path.split(".");
      let current = embed;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      newEmbeds[embedIndex] = embed;
      newData.embeds = newEmbeds;

      return newData;
    });
  };

  const removeEmbed = (embedIndex) => {
    setEmbedData((prev) => ({
      ...prev,
      embeds: prev.embeds.filter((_, i) => i !== embedIndex),
    }));
  };

  const hexToDecimal = (hex) => {
    return parseInt(hex.replace("#", ""), 16);
  };

  const decimalToHex = (decimal) => {
    return "#" + (decimal || 0).toString(16).padStart(6, "0");
  };

  const addField = (embedIndex) => {
    const embed = embedData.embeds[embedIndex];
    const newFields = [
      ...(embed.fields || []),
      { name: "Field name", value: "Field value", inline: false },
    ];
    updateEmbedAtIndex(embedIndex, "fields", newFields);
  };

  const removeField = (embedIndex, fieldIndex) => {
    const embed = embedData.embeds[embedIndex];
    const newFields = embed.fields.filter((_, i) => i !== fieldIndex);
    updateEmbedAtIndex(embedIndex, "fields", newFields);
  };

  const updateField = (embedIndex, fieldIndex, key, value) => {
    const embed = embedData.embeds[embedIndex];
    const newFields = [...embed.fields];
    newFields[fieldIndex] = { ...newFields[fieldIndex], [key]: value };
    updateEmbedAtIndex(embedIndex, "fields", newFields);
  };

  const addImageToGallery = (embedIndex) => {
    const embed = embedData.embeds[embedIndex];
    const newImages = [...(embed.images || []), { url: "" }];
    updateEmbedAtIndex(embedIndex, "images", newImages);
  };

  const removeImageFromGallery = (embedIndex, imageIndex) => {
    const embed = embedData.embeds[embedIndex];
    const newImages = embed.images.filter((_, i) => i !== imageIndex);
    updateEmbedAtIndex(embedIndex, "images", newImages);
  };

  const updateGalleryImage = (embedIndex, imageIndex, value) => {
    const embed = embedData.embeds[embedIndex];
    const newImages = [...embed.images];
    newImages[imageIndex] = { url: value };
    updateEmbedAtIndex(embedIndex, "images", newImages);
  };

  const addEmbed = () => {
    const newIndex = embedData.embeds.length;
    setEmbedData((prev) => ({
      ...prev,
      embeds: [
        ...prev.embeds,
        {
          author: { name: "", url: "", icon_url: "" },
          title: "",
          url: "",
          description: "",
          color: 5814783,
          fields: [],
          thumbnail: { url: "" },
          image: { url: "" },
          images: [],
          footer: { text: "", icon_url: "" },
          timestamp: "",
        },
      ],
    }));

    // Auto-expand the new embed
    setExpandedSections((prev) => ({
      ...prev,
      [`embed-${newIndex}`]: true,
      [`body-${newIndex}`]: true,
    }));
  };

  const addLinkButton = () => {
    setEmbedData((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Button label",
              url: "https://example.com",
              emoji: null,
            },
          ],
        },
      ],
    }));
  };

  const updateButton = (rowIndex, buttonIndex, key, value) => {
    setEmbedData((prev) => {
      const newComponents = [...prev.components];
      newComponents[rowIndex].components[buttonIndex] = {
        ...newComponents[rowIndex].components[buttonIndex],
        [key]: value,
      };
      return { ...prev, components: newComponents };
    });
  };

  const removeButton = (rowIndex, buttonIndex) => {
    setEmbedData((prev) => {
      const newComponents = [...prev.components];
      newComponents[rowIndex].components.splice(buttonIndex, 1);
      if (newComponents[rowIndex].components.length === 0) {
        newComponents.splice(rowIndex, 1);
      }
      return { ...prev, components: newComponents };
    });
  };

  const handleEmojiSelect = (rowIndex, buttonIndex, emojiData) => {
    // Standard emoji from emoji-picker-react
    updateButton(rowIndex, buttonIndex, "emoji", {
      name: emojiData.emoji,
    });
    setShowEmojiPicker(null);
  };

  const handleCustomEmojiSelect = (rowIndex, buttonIndex, customEmoji) => {
    // Custom Discord emoji
    updateButton(rowIndex, buttonIndex, "emoji", {
      id: customEmoji.id,
      name: customEmoji.name,
    });
    setShowEmojiPicker(null);
  };

  return (
    <div className={styles.editor}>
      {/* Content */}
      <div className={styles.section}>
        <label>Content</label>
        <textarea
          value={embedData.content}
          onChange={(e) =>
            setEmbedData((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="Message content (outside embed)"
          rows={3}
        />
      </div>

      {/* Embeds */}
      {embedData.embeds.map((embed, embedIndex) => (
        <div key={embedIndex} className={styles.collapsible}>
          <div className={styles.header}>
            <span onClick={() => toggleSection(`embed-${embedIndex}`)}>
              {expandedSections[`embed-${embedIndex}`] !== false ? "▼" : "▶"}{" "}
              Embed {embedIndex + 1}
            </span>
            {embedData.embeds.length > 1 && (
              <button
                className={styles.trashButton}
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmbed(embedIndex);
                }}
              >
                🗑️
              </button>
            )}
          </div>

          {expandedSections[`embed-${embedIndex}`] !== false && (
            <div className={styles.content}>
              {/* Author */}
              <div className={styles.collapsible}>
                <div
                  className={styles.header}
                  onClick={() => toggleSection(`author-${embedIndex}`)}
                >
                  <span>
                    {expandedSections[`author-${embedIndex}`] ? "▼" : "▶"}{" "}
                    Author
                  </span>
                </div>

                {expandedSections[`author-${embedIndex}`] && (
                  <div className={styles.content}>
                    <div className={styles.fieldWithButton}>
                      <div className={styles.field}>
                        <label>
                          Name{" "}
                          <span className={styles.charCount}>
                            {embed.author?.name?.length || 0}/256
                          </span>
                        </label>
                        <input
                          type="text"
                          value={embed.author?.name || ""}
                          onChange={(e) =>
                            updateEmbedAtIndex(
                              embedIndex,
                              "author.name",
                              e.target.value
                            )
                          }
                          maxLength={256}
                          placeholder="Author name"
                        />
                      </div>
                      <button
                        className={styles.addUrlButton}
                        onClick={() => {
                          const hasUrl = embed.author?.url;
                          if (!hasUrl) {
                            updateEmbedAtIndex(
                              embedIndex,
                              "author.url",
                              "https://"
                            );
                          } else {
                            updateEmbedAtIndex(embedIndex, "author.url", "");
                          }
                        }}
                      >
                        {embed.author?.url ? "✕" : "🔗"}
                      </button>
                    </div>

                    {embed.author?.url && (
                      <div className={styles.field}>
                        <label>Author URL</label>
                        <input
                          type="url"
                          value={embed.author.url}
                          onChange={(e) =>
                            updateEmbedAtIndex(
                              embedIndex,
                              "author.url",
                              e.target.value
                            )
                          }
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    <div className={styles.field}>
                      <label>Icon URL</label>
                      <input
                        type="url"
                        value={embed.author?.icon_url || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "author.icon_url",
                            e.target.value
                          )
                        }
                        placeholder="https://example.com/icon.png"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className={styles.collapsible}>
                <div
                  className={styles.header}
                  onClick={() => toggleSection(`body-${embedIndex}`)}
                >
                  <span>
                    {expandedSections[`body-${embedIndex}`] ? "▼" : "▶"} Body
                  </span>
                </div>

                {expandedSections[`body-${embedIndex}`] && (
                  <div className={styles.content}>
                    <div className={styles.fieldWithButton}>
                      <div className={styles.field}>
                        <label>
                          Title{" "}
                          <span className={styles.charCount}>
                            {embed.title?.length || 0}/256
                          </span>
                        </label>
                        <input
                          type="text"
                          value={embed.title || ""}
                          onChange={(e) =>
                            updateEmbedAtIndex(
                              embedIndex,
                              "title",
                              e.target.value
                            )
                          }
                          maxLength={256}
                          placeholder="Embed title"
                        />
                      </div>
                      <button
                        className={styles.addUrlButton}
                        onClick={() => {
                          const hasUrl = embed.url;
                          if (!hasUrl) {
                            updateEmbedAtIndex(embedIndex, "url", "https://");
                          } else {
                            updateEmbedAtIndex(embedIndex, "url", "");
                          }
                        }}
                      >
                        {embed.url ? "✕" : "🔗"}
                      </button>
                    </div>

                    {embed.url && (
                      <div className={styles.field}>
                        <label>Title URL</label>
                        <input
                          type="url"
                          value={embed.url}
                          onChange={(e) =>
                            updateEmbedAtIndex(
                              embedIndex,
                              "url",
                              e.target.value
                            )
                          }
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    <div className={styles.fieldWithButton}>
                      <div className={styles.field}>
                        <label>Sidebar Color</label>
                        <input
                          type="text"
                          value={decimalToHex(embed.color || 0)}
                          onChange={(e) => {
                            const hex = e.target.value;
                            if (/^#[0-9A-F]{6}$/i.test(hex)) {
                              updateEmbedAtIndex(
                                embedIndex,
                                "color",
                                hexToDecimal(hex)
                              );
                            }
                          }}
                          placeholder="#58b9ff"
                        />
                      </div>
                      <button
                        className={styles.colorPickerButton}
                        onClick={() =>
                          setShowColorPicker((prev) => ({
                            ...prev,
                            [embedIndex]: !prev[embedIndex],
                          }))
                        }
                      >
                        🎨
                      </button>
                    </div>

                    {showColorPicker[embedIndex] && (
                      <input
                        type="color"
                        value={decimalToHex(embed.color || 0)}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "color",
                            hexToDecimal(e.target.value)
                          )
                        }
                        className={styles.colorPicker}
                      />
                    )}

                    <div className={styles.field}>
                      <label>
                        Description{" "}
                        <span className={styles.charCount}>
                          {embed.description?.length || 0}/4096
                        </span>
                      </label>
                      <textarea
                        value={embed.description || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "description",
                            e.target.value
                          )
                        }
                        maxLength={4096}
                        rows={6}
                        placeholder="Embed description"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className={styles.collapsible}>
                <div
                  className={styles.header}
                  onClick={() => toggleSection(`fields-${embedIndex}`)}
                >
                  <span>
                    {expandedSections[`fields-${embedIndex}`] ? "▼" : "▶"}{" "}
                    Fields
                  </span>
                </div>

                {expandedSections[`fields-${embedIndex}`] && (
                  <div className={styles.content}>
                    {(embed.fields || []).map((field, fieldIndex) => (
                      <div key={fieldIndex} className={styles.collapsible}>
                        <div className={styles.header}>
                          <span>Field {fieldIndex + 1}</span>
                          <button
                            className={styles.trashButton}
                            onClick={() => removeField(embedIndex, fieldIndex)}
                          >
                            🗑️
                          </button>
                        </div>
                        <div className={styles.content}>
                          <div className={styles.fieldWithCheckbox}>
                            <div className={styles.field}>
                              <label>
                                Name{" "}
                                <span className={styles.charCount}>
                                  {field.name?.length || 0}/256
                                </span>
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) =>
                                  updateField(
                                    embedIndex,
                                    fieldIndex,
                                    "name",
                                    e.target.value
                                  )
                                }
                                maxLength={256}
                                placeholder="Field name"
                              />
                            </div>
                            <label className={styles.inlineCheckbox}>
                              <input
                                type="checkbox"
                                checked={field.inline || false}
                                onChange={(e) =>
                                  updateField(
                                    embedIndex,
                                    fieldIndex,
                                    "inline",
                                    e.target.checked
                                  )
                                }
                              />
                              Inline
                            </label>
                          </div>

                          <div className={styles.field}>
                            <label>
                              Value{" "}
                              <span className={styles.charCount}>
                                {field.value?.length || 0}/1024
                              </span>
                            </label>
                            <textarea
                              value={field.value}
                              onChange={(e) =>
                                updateField(
                                  embedIndex,
                                  fieldIndex,
                                  "value",
                                  e.target.value
                                )
                              }
                              maxLength={1024}
                              rows={3}
                              placeholder="Field value"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      className={styles.addButton}
                      onClick={() => addField(embedIndex)}
                    >
                      + Add Field
                    </button>
                  </div>
                )}
              </div>

              {/* Images */}
              <div className={styles.collapsible}>
                <div
                  className={styles.header}
                  onClick={() => toggleSection(`images-${embedIndex}`)}
                >
                  <span>
                    {expandedSections[`images-${embedIndex}`] ? "▼" : "▶"}{" "}
                    Images
                  </span>
                </div>

                {expandedSections[`images-${embedIndex}`] && (
                  <div className={styles.content}>
                    <div className={styles.field}>
                      <label>Image URL</label>
                      <input
                        type="url"
                        value={embed.image?.url || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "image.url",
                            e.target.value
                          )
                        }
                        placeholder="https://example.com/image.png"
                      />
                      <small>Single large image displayed in the embed</small>
                    </div>

                    <div className={styles.field}>
                      <label>Thumbnail URL</label>
                      <input
                        type="url"
                        value={embed.thumbnail?.url || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "thumbnail.url",
                            e.target.value
                          )
                        }
                        placeholder="https://example.com/thumbnail.png"
                      />
                      <small>
                        Small image displayed in the top right corner
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={styles.collapsible}>
                <div
                  className={styles.header}
                  onClick={() => toggleSection(`footer-${embedIndex}`)}
                >
                  <span>
                    {expandedSections[`footer-${embedIndex}`] ? "▼" : "▶"}{" "}
                    Footer
                  </span>
                </div>

                {expandedSections[`footer-${embedIndex}`] && (
                  <div className={styles.content}>
                    <div className={styles.field}>
                      <label>
                        Text{" "}
                        <span className={styles.charCount}>
                          {embed.footer?.text?.length || 0}/2048
                        </span>
                      </label>
                      <textarea
                        value={embed.footer?.text || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "footer.text",
                            e.target.value
                          )
                        }
                        maxLength={2048}
                        rows={3}
                        placeholder="Footer text"
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Icon URL</label>
                      <input
                        type="url"
                        value={embed.footer?.icon_url || ""}
                        onChange={(e) =>
                          updateEmbedAtIndex(
                            embedIndex,
                            "footer.icon_url",
                            e.target.value
                          )
                        }
                        placeholder="https://example.com/icon.png"
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Timestamp</label>
                      <input
                        type="datetime-local"
                        value={
                          embed.timestamp
                            ? new Date(
                                new Date(embed.timestamp).getTime() -
                                  new Date().getTimezoneOffset() * 60000
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            // Convert local time to UTC
                            const localDate = new Date(e.target.value);
                            updateEmbedAtIndex(
                              embedIndex,
                              "timestamp",
                              localDate.toISOString()
                            );
                          } else {
                            updateEmbedAtIndex(embedIndex, "timestamp", "");
                          }
                        }}
                      />
                      <small>
                        Time will be displayed in viewer's local timezone
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Menu */}
      <div className={styles.addMenu}>
        <div className={styles.menuLabel}>Add</div>
        <button className={styles.menuButton} onClick={addEmbed}>
          + Embed
        </button>
        <button className={styles.menuButton} onClick={addLinkButton}>
          + Link Button
        </button>
      </div>

      {/* Components (Buttons) */}
      {embedData.components.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.componentRow}>
          {row.components.map((button, buttonIndex) => (
            <div key={buttonIndex} className={styles.buttonComponent}>
              <div className={styles.componentHeader}>
                <span>Link Button {buttonIndex + 1}</span>
                <button
                  className={styles.trashButton}
                  onClick={() => removeButton(rowIndex, buttonIndex)}
                >
                  🗑️
                </button>
              </div>

              <div className={styles.field}>
                <label>
                  Label{" "}
                  <span className={styles.charCount}>
                    {button.label?.length || 0}/80
                  </span>
                </label>
                <input
                  type="text"
                  value={button.label}
                  onChange={(e) =>
                    updateButton(rowIndex, buttonIndex, "label", e.target.value)
                  }
                  maxLength={80}
                  placeholder="Button label"
                />
              </div>

              <div className={styles.field}>
                <label>URL</label>
                <input
                  type="url"
                  value={button.url}
                  onChange={(e) =>
                    updateButton(rowIndex, buttonIndex, "url", e.target.value)
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className={styles.field}>
                <label>Emoji (optional)</label>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={styles.emojiButton}
                    onClick={() =>
                      setShowEmojiPicker(
                        showEmojiPicker === `${rowIndex}-${buttonIndex}`
                          ? null
                          : `${rowIndex}-${buttonIndex}`
                      )
                    }
                  >
                    {button.emoji
                      ? button.emoji.id
                        ? `<:${button.emoji.name}:${button.emoji.id}>`
                        : button.emoji.name
                      : "Select Emoji"}
                  </button>

                  {showEmojiPicker === `${rowIndex}-${buttonIndex}` && (
                    <div ref={pickerRef} className={styles.emojiPickerWrapper}>
                      <EmojiPicker
                        onEmojiClick={(emojiData) =>
                          handleEmojiSelect(rowIndex, buttonIndex, emojiData)
                        }
                        theme={Theme.DARK}
                        width="100%"
                        height={400}
                        previewConfig={{ showPreview: false }}
                        emojiStyle={EmojiStyle.TWITTER}
                      />

                      {/* Custom Discord Emojis Section */}
                      {customEmojis.length > 0 && (
                        <div className={styles.customEmojis}>
                          <div className={styles.customEmojisHeader}>
                            Custom Discord Emojis
                          </div>
                          <div className={styles.customEmojiGrid}>
                            {customEmojis.map((emoji) => (
                              <button
                                key={emoji.id}
                                type="button"
                                onClick={() =>
                                  handleCustomEmojiSelect(
                                    rowIndex,
                                    buttonIndex,
                                    emoji
                                  )
                                }
                                className={styles.customEmojiButton}
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
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
