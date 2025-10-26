import { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import "./VoiceRecorder.css";
import {
  useUploadAudio,
  useAudioStatus,
  useChatResponses,
  useAudioPlayer,
  useAudioVisualization,
} from "../hooks";

interface VoiceRecorderProps {
  onAudioRecorded: (audio: Blob) => void;
  onVoiceCloned: (success: boolean, voiceId?: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onVoiceCloned,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showChatSection, setShowChatSection] = useState(false);

  // Используем кастомные хуки для работы с API
  const { uploadAudio, isUploading, error: uploadError } = useUploadAudio();
  const {
    pollAudioStatus,
    isProcessing,
    error: processingError,
  } = useAudioStatus();
  const {
    loadChatResponses,
    setLoadingState,
    isLoadingResponses,
    chatResponses,
    error: chatError,
  } = useChatResponses();
  const {
    playChatResponse,
    currentlyPlaying,
    error: playerError,
  } = useAudioPlayer();

  // Объединенная ошибка
  const error =
    uploadError || processingError || chatError || playerError || null;

  const waveformRef = useRef<HTMLDivElement>(null);
  const realtimeCanvasRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const timerRef = useRef<number | null>(null);

  // Callback для обработки записанного аудио
  const handleRecordingStop = useCallback(
    (audioBlob: Blob) => {
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      onAudioRecorded(audioBlob);
    },
    [onAudioRecorded]
  );

  // Используем хук для визуализации аудио
  const { startVisualization, stopVisualization } = useAudioVisualization({
    canvasRef: realtimeCanvasRef,
    onRecordingStop: handleRecordingStop,
  });

  useEffect(() => {
    // Cleanup при размонтировании компонента
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Настройка canvas размеров
  useEffect(() => {
    if (realtimeCanvasRef.current) {
      const canvas = realtimeCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  useEffect(() => {
    // Инициализация WaveSurfer для воспроизведения записанного аудио
    if (waveformRef.current && audioURL) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#4F46E5",
        progressColor: "#7C3AED",
        cursorColor: "#EC4899",
        barWidth: 3,
        barRadius: 3,
        height: 80,
        normalize: true,
      });

      wavesurferRef.current.load(audioURL);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      // Инициализируем визуализацию в реальном времени через хук
      const initialized = await startVisualization();
      if (!initialized) {
        alert("Не удалось инициализировать визуализацию");
        return;
      }

      setIsRecording(true);
      setRecordingTime(0);

      // Таймер записи (максимум 60 секунд)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      alert("Не удалось получить доступ к микрофону: " + error);
    }
  };

  const stopRecording = () => {
    // Останавливаем визуализацию через хук
    stopVisualization();

    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const playRecording = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.play();
    }
  };

  // Функция для конвертации WAV в MP3
  const convertToMp3 = async (audioBlob: Blob): Promise<Blob> => {
    // Для простоты, пока отправляем WAV файл напрямую
    // В реальном проекте можно использовать библиотеку как lamejs для конвертации
    return audioBlob;
  };

  // Функция для загрузки аудио на сервер
  const handleUploadAudio = async () => {
    if (!audioURL || isUploading || isProcessing || isLoadingResponses) {
      return; // Предотвращаем множественные клики
    }

    try {
      setShowChatSection(true); // Показываем секцию чата сразу после нажатия
      setLoadingState(true); // Включаем состояние загрузки сразу

      // Получаем blob из URL
      const response = await fetch(audioURL);
      const audioBlob = await response.blob();

      // Конвертируем в MP3 (пока просто используем оригинальный blob)
      const mp3Blob = await convertToMp3(audioBlob);

      // Отправляем на сервер используя хук
      const audioId = await uploadAudio(mp3Blob);

      if (audioId) {
        // Начинаем проверку статуса с callback для загрузки ответов
        pollAudioStatus(audioId, (data) => {
          onVoiceCloned(true, data.voiceId);
          loadChatResponses(data.voiceId);
        });
      } else {
        // Если загрузка не удалась, отключаем состояние загрузки
        setLoadingState(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setLoadingState(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder">
      <div className="app-main">
        <div className="recording-interface">
          <div className="record-button-wrapper">
            <button
              className={`record-button ${isRecording ? "recording" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              🎙️
            </button>
            <p className="record-status">
              {isRecording ? "Запись..." : "Начать запись"}
            </p>
          </div>

          <div
            className={`audio-visualizer ${isRecording ? "visible" : "hidden"}`}
          >
            <canvas
              ref={realtimeCanvasRef}
              className="realtime-waveform"
              width={800}
              height={120}
              style={{
                width: "100%",
                height: "120px",
                backgroundColor: "#141414",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
            />
            {isRecording && (
              <div className="recording-timer">
                {formatTime(recordingTime)} / 1:00
              </div>
            )}
          </div>
        </div>

        {audioURL && !isRecording && (
          <div className="audio-result">
            <div className="result-info">
              <p>Аудио записано и готово к воспроизведению</p>
              {error && (
                <div
                  className="error-message"
                  style={{ color: "#ff6b6b", marginTop: "10px" }}
                >
                  Ошибка: {error}
                </div>
              )}
            </div>

            <div className="result-actions">
              <button onClick={playRecording} className="action-button primary">
                ▶️ Прослушать запись
              </button>

              <button
                onClick={handleUploadAudio}
                className="action-button secondary"
                disabled={isUploading || isProcessing || isLoadingResponses}
              >
                {isUploading
                  ? "⏳ Загрузка..."
                  : isProcessing
                  ? "🔄 Обработка..."
                  : isLoadingResponses
                  ? "⏳ Генерация ответов..."
                  : "🚀 Клонировать голос"}
              </button>
            </div>

            <div className="waveform-container">
              <div ref={waveformRef} className="waveform"></div>
            </div>
          </div>
        )}

        {showChatSection && (
          <div className="chat-responses">
            <div className="responses-header">
              <h3>💬 Чат с вашим голосовым двойником</h3>
              {isLoadingResponses ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">
                    🎙️ Обработка вашего голоса и генерация ответов...
                  </p>
                  <p className="loading-subtext">Это займет около 25 секунд</p>
                </div>
              ) : chatResponses.length > 0 ? (
                <p className="chat-description">
                  🎯 Ваш голос готов! Нажмите на вопрос, чтобы прослушать ответ
                  вашего голосового двойника
                </p>
              ) : (
                <p className="chat-description">
                  ⏳ Голосовые ответы готовятся. Попробуйте обновить страницу
                  через несколько секунд.
                </p>
              )}
            </div>

            {chatResponses.length > 0 ? (
              <div className="responses-grid">
                {chatResponses.map((response) => (
                  <div key={response.id} className="response-item">
                    <div className="response-content">
                      <div className="response-question">
                        <span className="question-icon">💭</span>
                        <h4>{response.question}</h4>
                      </div>

                      <button
                        onClick={() =>
                          playChatResponse(response.id, response.audioUrl)
                        }
                        className={`response-play-button ${
                          currentlyPlaying === response.id ? "playing" : ""
                        }`}
                      >
                        {currentlyPlaying === response.id ? (
                          <>
                            <span className="play-icon">⏸️</span>
                            Остановить
                          </>
                        ) : (
                          <>
                            <span className="play-icon">▶️</span>
                            Прослушать
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoadingResponses ? (
              <div className="no-responses">
                <p>
                  Ответы пока недоступны. Попробуйте обновить страницу через
                  несколько секунд.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
