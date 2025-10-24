import React, { useState } from "react";
import { animateAvatar } from "../utils/avatarAPI";
import type { Avatar, Animation } from "../utils/avatarAPI";
import "./AvatarAnimation.css";

interface AvatarAnimationProps {
  avatar: Avatar;
  onAnimationStarted: (animation: Animation) => void;
  voiceId: string;
}

const AvatarAnimation: React.FC<AvatarAnimationProps> = ({
  avatar,
  onAnimationStarted,
  voiceId,
}) => {
  const [text, setText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!text.trim()) {
      setError("Пожалуйста, введите текст для анимации");
      return;
    }

    setIsAnimating(true);
    setError(null);

    try {
      const animation = await animateAvatar({
        avatarId: avatar.id,
        text: text.trim(),
        voiceId: voiceId,
      });

      onAnimationStarted(animation);

      // Clear form
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при запуске анимации"
      );
    } finally {
      setIsAnimating(false);
    }
  };

  const maxLength = 500;
  const remainingChars = maxLength - text.length;

  return (
    <div className="avatar-animation">
      <div className="avatar-info">
        <img
          src={avatar.imageUrl}
          alt={avatar.name}
          className="avatar-preview"
        />
        <div className="avatar-details">
          <h3>{avatar.name}</h3>
          {avatar.description && (
            <p className="avatar-description">{avatar.description}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="animation-form">
        <div className="field">
          <label htmlFor="animation-text">
            Текст для анимации *
            <span className="char-counter">
              Осталось символов: {remainingChars}
            </span>
          </label>
          <textarea
            id="animation-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Введите текст, который будет произносить ваш аватар..."
            maxLength={maxLength}
            rows={4}
            required
            className={remainingChars < 50 ? "warning" : ""}
          />
        </div>

        <div className="voice-info">
          <p>🎤 Будет использован ваш склонированный голос</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="animate-button"
          disabled={!text.trim() || isAnimating}
        >
          {isAnimating ? (
            <>
              <span className="spinner"></span>
              Создание анимации...
            </>
          ) : (
            "Запустить анимацию"
          )}
        </button>
      </form>

      <div className="animation-info">
        <h4>Процесс анимации:</h4>
        <ol>
          <li>Текст будет озвучен вашим склонированным голосом</li>
          <li>Аватар будет анимирован для произнесения текста</li>
          <li>
            Обработка может занять некоторое время, в зависимости от длины текста
          </li>
          <li>Вы увидите обновление статуса в реальном времени</li>
        </ol>
      </div>
    </div>
  );
};

export default AvatarAnimation;
