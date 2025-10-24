import { useState } from "react";
import "./App.css";
import VoiceRecorder from "./components/VoiceRecorder";
import AvatarUpload from "./components/AvatarUpload";
import AvatarAnimation from "./components/AvatarAnimation";
import AnimationsList from "./components/AnimationsList";
import type { Avatar, Animation } from "./utils/avatarAPI";

function App() {
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isVoiceCloned, setIsVoiceCloned] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<Avatar | null>(null);
  const [newAnimation, setNewAnimation] = useState<Animation | null>(null);
  const [activeTab, setActiveTab] = useState<"voice" | "avatar">("voice");

  const handleVoiceCloned = (voiceId: string) => {
    setIsVoiceCloned(true);
    setClonedVoiceId(voiceId);
  };

  const handleAvatarUploaded = (avatar: Avatar) => {
    setCurrentAvatar(avatar);
    setNewAnimation(null); // Clear previous animation when new avatar is uploaded
  };

  const handleAnimationStarted = (animation: Animation) => {
    setNewAnimation(animation);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Voise</h1>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-button ${activeTab === "voice" ? "active" : ""}`}
          onClick={() => setActiveTab("voice")}
        >
          🎤 Запись голоса
        </button>
        <button
          className={`nav-button ${activeTab === "avatar" ? "active" : ""}`}
          onClick={() => setActiveTab("avatar")}
          disabled={!isVoiceCloned}
          title={!isVoiceCloned ? "Сначала запишите и склонируйте голос" : ""}
        >
          🎭 Анимация аватара
        </button>
      </nav>

      <main className="app-main">
        {activeTab === "voice" && (
          <div className="voice-section">
            <VoiceRecorder
              onAudioRecorded={setRecordedAudio}
              onVoiceCloned={(success, voiceId) => {
                if (success && voiceId) {
                  handleVoiceCloned(voiceId);
                }
              }}
            />
            {isVoiceCloned && (
              <div className="voice-cloned-success">
                <h3>✅ Голос успешно склонирован!</h3>
                <p>Теперь вы можете анимировать аватар с вашим голосом.</p>
                <button
                  className="switch-to-avatar-btn"
                  onClick={() => setActiveTab("avatar")}
                >
                  Перейти к анимации аватара
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "avatar" && (
          <div className="avatar-section">
            {!isVoiceCloned ? (
              <div className="avatar-disabled-message">
                <h3>📢 Сначала запишите и склонируйте свой голос</h3>
                <p>
                  Для анимации аватара необходимо сначала записать и
                  склонировать голос во вкладке "Запись голоса"
                </p>
                <button
                  className="go-to-voice-btn"
                  onClick={() => setActiveTab("voice")}
                >
                  Записать голос
                </button>
              </div>
            ) : !currentAvatar ? (
              <div className="avatar-upload-wrapper">
                <h3>📷 Загрузите фото для аватара</h3>
                <AvatarUpload onAvatarUploaded={handleAvatarUploaded} />
              </div>
            ) : (
              <>
                <div className="avatar-controls">
                  <AvatarAnimation
                    avatar={currentAvatar}
                    onAnimationStarted={handleAnimationStarted}
                    voiceId={clonedVoiceId!}
                  />

                  <button
                    className="change-avatar-button"
                    onClick={() => setCurrentAvatar(null)}
                  >
                    Изменить аватар
                  </button>
                </div>

                <AnimationsList
                  avatarId={currentAvatar.id}
                  newAnimation={newAnimation || undefined}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
