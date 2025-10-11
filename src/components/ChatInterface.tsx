import { useState } from "react";
import "./ChatInterface.css";

interface ChatInterfaceProps {
  recordedAudio: Blob | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChatInterface: React.FC<ChatInterfaceProps> = ({ recordedAudio }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  const questions = [
    {
      id: 1,
      text: "Как дела?",
      response: "У меня всё отлично! А как у тебя дела?",
    },
    {
      id: 2,
      text: "Расскажи историю",
      response:
        "Однажды я встретил удивительного человека, который научил меня понимать красоту в простых вещах...",
    },
    {
      id: 3,
      text: "Какая сегодня погода?",
      response:
        "Сегодня прекрасный день! Солнце светит ярко, и настроение отличное.",
    },
    {
      id: 4,
      text: "Что ты думаешь о будущем?",
      response:
        "Будущее полно возможностей! Технологии развиваются, и мир становится всё более удивительным.",
    },
    {
      id: 5,
      text: "Расскажи анекдот",
      response:
        "Программист приходит домой, а жена говорит: 'Дорогой, сходи в магазин за хлебом, а если будут яйца - купи десяток'. Программист возвращается с десятью буханками хлеба. 'Зачем столько?' - спрашивает жена. 'Ну, яйца же были!'",
    },
  ];

  const handleQuestionClick = async (question: (typeof questions)[0]) => {
    if (isPlaying) return;

    setCurrentQuestion(question.text);
    setIsPlaying(true);

    // Симуляция генерации и воспроизведения ответа клонированным голосом
    await simulateVoiceResponse(question.response);

    setIsPlaying(false);
    setCurrentQuestion(null);
  };

  const simulateVoiceResponse = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      // Симуляция времени генерации и воспроизведения голоса
      const duration = Math.max(3000, text.length * 50); // минимум 3 секунды
      setTimeout(resolve, duration);
    });
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>🗣️ Чат с вашим голосовым двойником</h2>
        <p>Выберите вопрос, и ваш цифровой двойник ответит вашим голосом</p>
      </div>

      <div className="questions-grid">
        {questions.map((question) => (
          <button
            key={question.id}
            className={`question-btn ${
              isPlaying && currentQuestion === question.text ? "playing" : ""
            }`}
            onClick={() => handleQuestionClick(question)}
            disabled={isPlaying}
          >
            {isPlaying && currentQuestion === question.text ? (
              <div className="playing-indicator">
                <div className="audio-waves">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>Воспроизведение...</span>
              </div>
            ) : (
              <>
                <span className="question-icon">💬</span>
                <span className="question-text">{question.text}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {isPlaying && (
        <div className="status-message">
          <div className="status-content">
            <div className="loading-spinner"></div>
            <span>Генерируется ответ вашим голосом...</span>
          </div>
        </div>
      )}

      <div className="info-box">
        <h3>ℹ️ Как это работает</h3>
        <ul>
          <li>Ваш голос был записан и обработан</li>
          <li>ИИ создал модель вашего голоса</li>
          <li>Теперь система может отвечать вашим голосом на любые вопросы</li>
          <li>Выберите любой вопрос выше, чтобы услышать ответ</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatInterface;
