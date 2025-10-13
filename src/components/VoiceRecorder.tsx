import { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import axios from "axios";
import "./VoiceRecorder.css";

interface VoiceRecorderProps {
  onAudioRecorded: (audio: Blob) => void;
  onVoiceCloned: (cloned: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onVoiceCloned,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clonedAudioData, setClonedAudioData] = useState<{
    id: number;
    originalUrl: string;
    clonedUrl: string;
    voiceId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatResponses, setChatResponses] = useState<
    {
      id: number;
      question: string;
      audioUrl: string;
    }[]
  >([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showChatSection, setShowChatSection] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const realtimeCanvasRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const timerRef = useRef<number | null>(null);

  // Для работы с реальным временем
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Функция для остановки анимации
  const stopAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // Функция для рисования волны в реальном времени
  const drawRealTimeWave = useCallback(() => {
    if (!analyserRef.current || !realtimeCanvasRef.current) {
      return;
    }

    const canvas = realtimeCanvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isAnimatingRef.current = true;

    const draw = () => {
      if (!isAnimatingRef.current) {
        // Очищаем canvas при остановке записи
        canvasCtx.fillStyle = "#141414";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      animationIdRef.current = requestAnimationFrame(draw);

      // Получаем данные времени (лучше для визуализации голоса в реальном времени)
      analyser.getByteTimeDomainData(dataArray);

      // Очищаем канвас
      canvasCtx.fillStyle = "#141414";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Рисуем волну как вертикальные полоски (как в WaveSurfer)
      const barWidth = 4; // Увеличиваем ширину полосок
      const barGap = 1;
      const totalBars = Math.floor(canvas.width / (barWidth + barGap));
      const step = Math.floor(bufferLength / totalBars);

      let hasAudio = false;

      // Создаем массив высот для интерполяции
      const barHeights: number[] = [];

      // Сначала вычисляем все высоты
      for (let i = 0; i < totalBars; i++) {
        const dataIndex = i * step;
        const value = dataArray[dataIndex];

        // Для временных данных: нормализуем от центра (128)
        const normalizedValue = Math.abs(value - 128) / 128.0;

        if (normalizedValue > 0.01) hasAudio = true;

        // Создаем более чувствительную и выразительную визуализацию
        // Уменьшаем базовую линию и увеличиваем чувствительность к звуку
        const baseHeight = 4; // Уменьшенная базовая линия
        const amplifiedValue = Math.pow(normalizedValue, 0.7) * 2.5; // Увеличиваем чувствительность
        const barHeight = Math.max(
          baseHeight,
          amplifiedValue * canvas.height * 0.8
        );

        barHeights.push(barHeight);
      }

      // Применяем сглаживание к высотам для более плавных переходов
      const smoothedHeights: number[] = [];
      for (let i = 0; i < barHeights.length; i++) {
        let sum = barHeights[i];
        let count = 1;

        // Усредняем с соседними значениями для плавности
        if (i > 0) {
          sum += barHeights[i - 1];
          count++;
        }
        if (i < barHeights.length - 1) {
          sum += barHeights[i + 1];
          count++;
        }

        smoothedHeights.push(sum / count);
      }

      // Теперь рисуем с плавными высотами
      for (let i = 0; i < totalBars; i++) {
        const barHeight = smoothedHeights[i];

        const x = i * (barWidth + barGap);
        const y = (canvas.height - barHeight) / 2;

        // Создаем градиент для красивого эффекта
        const gradient = canvasCtx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#7C3AED");
        gradient.addColorStop(0.5, "#4F46E5");
        gradient.addColorStop(1, "#3B82F6");

        canvasCtx.fillStyle = gradient;

        // Рисуем закругленный прямоугольник для более плавного вида
        const radius = Math.min(barWidth / 2, 2); // Радиус закругления
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, barHeight, radius);
        canvasCtx.fill();
      }

      // Логируем только если есть изменения в аудио
      if (hasAudio) {
        // Audio activity detected
      }
    };

    // Начинаем цикл анимации
    draw();
  }, []);

  // Инициализация аудио контекста для визуализации в реальном времени
  const initRealtimeVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Увеличиваем для большей детализации
      analyser.smoothingTimeConstant = 0.8; // Увеличиваем сглаживание для более плавной визуализации
      analyser.minDecibels = -90; // Увеличиваем чувствительность к тихим звукам
      analyser.maxDecibels = -10; // Расширяем динамический диапазон
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Создаем MediaRecorder для записи
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onAudioRecorded(audioBlob);
        audioChunks.length = 0;
      };

      return true;
    } catch {
      return false;
    }
  }, [onAudioRecorded]);

  useEffect(() => {
    // Cleanup при размонтировании компонента
    return () => {
      stopAnimation();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stopAnimation]);

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
      // Инициализируем визуализацию в реальном времени
      const initialized = await initRealtimeVisualization();
      if (!initialized) {
        alert("Не удалось инициализировать визуализацию");
        return;
      }

      // Начинаем запись с MediaRecorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingTime(0);

        // Запускаем визуализацию
        drawRealTimeWave();

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
      }
    } catch (error) {
      alert("Не удалось получить доступ к микрофону: " + error);
    }
  };

  const stopRecording = () => {
    // Останавливаем анимацию
    stopAnimation();

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Очищаем ресурсы
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
  const uploadAudio = async () => {
    if (!audioURL) {
      setError("No audio to upload");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setShowChatSection(true); // Показываем секцию чата сразу после нажатия
      setIsLoadingResponses(true); // Включаем индикатор загрузки

      // Получаем blob из URL
      const response = await fetch(audioURL);
      const audioBlob = await response.blob();

      // Конвертируем в MP3 (пока просто используем оригинальный blob)
      const mp3Blob = await convertToMp3(audioBlob);

      // Создаем FormData для отправки
      const formData = new FormData();
      formData.append("file", mp3Blob, "recording.wav"); // Изменили с "audio" на "file"

      // Отправляем на сервер
      const uploadResponse = await axios.post(
        "http://localhost:3000/audio/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadResult = uploadResponse.data;
      const audioId = uploadResult.id;

      // Начинаем проверку статуса
      pollAudioStatus(audioId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  // Функция для проверки статуса обработки
  const pollAudioStatus = async (id: number) => {
    try {
      setIsProcessing(true);

      const checkStatus = async (): Promise<void> => {
        const response = await axios.get(
          `http://localhost:3000/audio/status/${id}`
        );

        const data = response.data;

        if (data.status === "completed") {
          setClonedAudioData(data);
          setIsUploading(false);
          setIsProcessing(false);
          onVoiceCloned(true);

          // Ждем 10 секунд перед загрузкой готовых голосовых ответов
          // чтобы сервер успел их сгенерировать
          console.log(
            "⏳ Waiting 25 seconds for voice responses to be generated..."
          );
          setTimeout(() => {
            loadChatResponses(data.voiceId);
          }, 25000);
        } else if (data.status === "failed") {
          throw new Error("Voice cloning failed");
        } else {
          // Если еще обрабатывается, проверяем снова через 2 секунды
          setTimeout(checkStatus, 2000);
        }
      };

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Функция для загрузки готовых голосовых ответов
  const loadChatResponses = async (voiceId: string) => {
    try {
      console.log(`🔄 Loading chat responses for voiceId: ${voiceId}`);

      setIsLoadingResponses(true);
      setError(null);

      // Делаем простой запрос
      const response = await axios.get(
        `http://localhost:3000/audio/chat-responses?voiceId=${voiceId}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const responses = response.data;
      console.log(
        `📥 Received ${
          Array.isArray(responses) ? responses.length : 0
        } responses`
      );

      // Проверяем результат и обновляем состояние
      if (responses && Array.isArray(responses) && responses.length > 0) {
        console.log(
          `✅ Successfully loaded ${responses.length} chat responses`
        );
        responses.forEach(
          (
            item: { id: number; question: string; audioUrl: string },
            index: number
          ) => {
            console.log(`   ${index + 1}. "${item.question}" (ID: ${item.id})`);
          }
        );
        setChatResponses(responses);
      } else {
        console.log(`⚠️ No responses available yet`);
        setChatResponses([]);
      }

      setIsLoadingResponses(false);
    } catch (err) {
      console.log(`💥 Error loading responses:`, err);
      setError(
        err instanceof Error ? err.message : "Failed to load chat responses"
      );
      setIsLoadingResponses(false);
    }
  };

  // Функция для воспроизведения голосового ответа
  const playChatResponse = (responseId: number, audioUrl: string) => {
    // Останавливаем текущее воспроизведение если есть
    if (currentlyPlaying !== null) {
      setCurrentlyPlaying(null);
    }

    try {
      const audio = new Audio(audioUrl);

      audio.onplay = () => {
        setCurrentlyPlaying(responseId);
      };

      audio.onended = () => {
        setCurrentlyPlaying(null);
      };

      audio.onerror = () => {
        setCurrentlyPlaying(null);
        setError("Failed to play chat response");
      };

      // Устанавливаем CORS режим
      audio.crossOrigin = "anonymous";

      audio.play().catch(() => {
        setCurrentlyPlaying(null);

        // Fallback через fetch
        fetch(audioUrl)
          .then((response) => response.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const newAudio = new Audio(blobUrl);
            newAudio.onplay = () => setCurrentlyPlaying(responseId);
            newAudio.onended = () => setCurrentlyPlaying(null);
            newAudio.play().catch((fallbackErr) => {
              setCurrentlyPlaying(null);
              setError(`Failed to play chat response: ${fallbackErr.message}`);
            });
          })
          .catch((fetchErr) => {
            setCurrentlyPlaying(null);
            setError(`Failed to load chat response audio: ${fetchErr.message}`);
          });
      });
    } catch {
      setCurrentlyPlaying(null);
      setError("Failed to create audio player for chat response");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder">
      <div className="app-header">
        <div className="app-icon">🎙️</div>
        <h1 className="app-title">VoiceClone</h1>
      </div>

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
                onClick={uploadAudio}
                className="action-button secondary"
                disabled={isUploading || isProcessing}
              >
                {isUploading
                  ? "⏳ Загрузка..."
                  : isProcessing
                  ? "🔄 Обработка..."
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
              ) : (
                <p>Нажмите на кнопку, чтобы прослушать ответ</p>
              )}
            </div>

            {chatResponses.length > 0 ? (
              <div className="responses-grid">
                {chatResponses.map((response) => (
                  <div key={response.id} className="response-item">
                    <div className="response-question">
                      <h4>"{response.question}"</h4>
                    </div>

                    <button
                      onClick={() =>
                        playChatResponse(response.id, response.audioUrl)
                      }
                      className={`response-play-button ${
                        currentlyPlaying === response.id ? "playing" : ""
                      }`}
                      disabled={currentlyPlaying === response.id}
                    >
                      {currentlyPlaying === response.id
                        ? "🔄 Играет..."
                        : "▶️ Прослушать"}
                    </button>
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
