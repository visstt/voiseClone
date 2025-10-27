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
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - now supporting both images and videos
    const isImage = file.type.match(/^image\/(jpeg|jpg|png)$/);
    const isVideo = file.type.match(/^video\/(mp4|webm|ogg|avi|mov)$/);

    if (!isImage && !isVideo) {
      setError(
        "Пожалуйста, выберите изображение (JPG, PNG) или видео (MP4, WebM, OGG, AVI, MOV)"
      );
      return;
    }

    // No client-side size limits anymore (server accepts large files)

    setSelectedFile(file);
    setFileType(isVideo ? "video" : "image");
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
      setError("Пожалуйста, выберите файл и введите название");
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
      <h3>Загрузка фото или видео</h3>

      <form onSubmit={handleUpload} className="avatar-upload-form">
        <div className="file-upload-section">
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              id="avatar-file"
              accept="image/jpeg,image/jpg,image/png,video/mp4,video/webm,video/ogg,video/avi,video/mov"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="avatar-file" className="file-input-label">
              {selectedFile ? "Изменить файл" : "Выбрать фото/видео"}
            </label>
          </div>

          {previewUrl && (
            <div className="preview-section">
              {fileType === "video" ? (
                <video
                  src={previewUrl}
                  className="preview-video"
                  controls
                  muted
                  preload="metadata"
                />
              ) : (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="clear-button"
              >
                Удалить
              </button>
            </div>
          )}
        </div>

        <div className="form-fields">
          <div className="field">
            <label htmlFor="avatar-name">Название аватара *</label>
            <input
              type="text"
              id="avatar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название аватара"
              maxLength={50}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="avatar-description">Описание (необязательно)</label>
            <textarea
              id="avatar-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание"
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
          {isUploading ? "Загрузка..." : "Загрузить аватар"}
        </button>
      </form>

      <div className="upload-requirements">
        <p>
          <strong>Требования:</strong>
        </p>
        <ul>
          <li>Четкое фото лица (JPG, PNG) или видео (MP4, WebM, MOV)</li>
          <li>
            Ограничений по размеру со стороны клиента нет (сервер поддерживает
            большие файлы)
          </li>
          <li>Лицо должно быть хорошо освещено и центрировано</li>
          <li>Для видео: желательно несколько секунд без движения головы</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarUpload;
