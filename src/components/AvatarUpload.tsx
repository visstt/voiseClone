import React, { useState, useRef } from "react";
import { uploadAvatar } from "../utils/avatarAPI";
import type { Avatar } from "../utils/avatarAPI";
import "./AvatarUpload.css";

interface AvatarUploadProps {
  onAvatarUploaded: (avatar: Avatar) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ onAvatarUploaded }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError("Please select a JPG or PNG image");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile || !name.trim()) {
      setError("Please select a photo and enter a name");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const avatar = await uploadAvatar({
        image: selectedFile,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      onAvatarUploaded(avatar);

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setName("");
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="avatar-upload">
      <h3>Upload Face Photo</h3>

      <form onSubmit={handleUpload} className="avatar-upload-form">
        <div className="file-upload-section">
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              id="avatar-file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="avatar-file" className="file-input-label">
              {selectedFile ? "Change Photo" : "Choose Photo"}
            </label>
          </div>

          {previewUrl && (
            <div className="preview-section">
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <button
                type="button"
                onClick={clearSelection}
                className="clear-button"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="form-fields">
          <div className="field">
            <label htmlFor="avatar-name">Avatar Name *</label>
            <input
              type="text"
              id="avatar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter avatar name"
              maxLength={50}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="avatar-description">Description (optional)</label>
            <textarea
              id="avatar-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              maxLength={200}
              rows={3}
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="upload-button"
          disabled={!selectedFile || !name.trim() || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Avatar"}
        </button>
      </form>

      <div className="upload-requirements">
        <p>
          <strong>Requirements:</strong>
        </p>
        <ul>
          <li>Clear face photo (JPG or PNG)</li>
          <li>Maximum file size: 5MB</li>
          <li>Face should be well-lit and centered</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarUpload;
