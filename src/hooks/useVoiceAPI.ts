import { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

// Типы данных
interface ClonedAudioData {
  id: number;
  originalUrl: string;
  clonedUrl?: string;
  voiceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatResponse {
  id: number;
  question: string;
  audioUrl: string;
}

// Хук для загрузки аудио на сервер
export const useUploadAudio = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAudio = async (audioBlob: Blob): Promise<number | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.wav");

      const response = await axios.post(
        `${API_BASE_URL}/audio/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadResult = response.data;
      return uploadResult.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAudio, isUploading, error };
};

// Хук для проверки статуса обработки
export const useAudioStatus = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [clonedAudioData, setClonedAudioData] =
    useState<ClonedAudioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollAudioStatus = async (
    id: number,
    onComplete?: (data: ClonedAudioData) => void
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      setError(null);

      const checkStatus = async (): Promise<void> => {
        const response = await axios.get(`${API_BASE_URL}/audio/status/${id}`);
        const data = response.data;

        if (data.status === "completed") {
          setClonedAudioData(data);
          setIsProcessing(false);
          console.log(
            "⏳ Waiting 25 seconds for voice responses to be generated..."
          );

          // Вызываем callback после завершения
          if (onComplete) {
            setTimeout(() => {
              onComplete(data);
            }, 25000);
          }
        } else if (data.status === "failed") {
          throw new Error("Voice cloning failed");
        } else {
          // Если еще обрабатывается, проверяем снова через 2 секунды
          setTimeout(checkStatus, 2000);
        }
      };

      await checkStatus();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Processing failed";
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  return { pollAudioStatus, isProcessing, clonedAudioData, error };
};

// Хук для загрузки готовых голосовых ответов
export const useChatResponses = () => {
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [chatResponses, setChatResponses] = useState<ChatResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadChatResponses = async (voiceId: string): Promise<void> => {
    try {
      console.log(`🔄 Loading chat responses for voiceId: ${voiceId}`);

      setIsLoadingResponses(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE_URL}/audio/chat-responses?voiceId=${voiceId}`,
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

      if (responses && Array.isArray(responses) && responses.length > 0) {
        console.log(
          `✅ Successfully loaded ${responses.length} chat responses`
        );
        responses.forEach((item: ChatResponse, index: number) => {
          console.log(`   ${index + 1}. "${item.question}" (ID: ${item.id})`);
        });
        setChatResponses(responses);
      } else {
        console.log(`⚠️ No responses available yet`);
        setChatResponses([]);
      }
    } catch (err) {
      console.log(`💥 Error loading responses:`, err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load chat responses";
      setError(errorMessage);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const clearResponses = () => {
    setChatResponses([]);
    setError(null);
  };

  const setLoadingState = (loading: boolean) => {
    setIsLoadingResponses(loading);
  };

  return {
    loadChatResponses,
    clearResponses,
    setLoadingState,
    isLoadingResponses,
    chatResponses,
    error,
  };
};

// Хук для воспроизведения аудио
export const useAudioPlayer = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const stopPlaying = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setCurrentlyPlaying(null);
  };

  const playChatResponse = (responseId: number, audioUrl: string): void => {
    // Если уже играет это же аудио - останавливаем
    if (currentlyPlaying === responseId) {
      stopPlaying();
      return;
    }

    // Останавливаем текущее воспроизведение если есть
    if (currentAudio) {
      stopPlaying();
    }

    try {
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onplay = () => {
        setCurrentlyPlaying(responseId);
      };

      audio.onended = () => {
        setCurrentlyPlaying(null);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setCurrentlyPlaying(null);
        setCurrentAudio(null);
        setError("Failed to play chat response");
      };

      // Устанавливаем CORS режим
      audio.crossOrigin = "anonymous";

      audio.play().catch(() => {
        setCurrentlyPlaying(null);
        setCurrentAudio(null);

        // Fallback через fetch
        fetch(audioUrl)
          .then((response) => response.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const newAudio = new Audio(blobUrl);
            setCurrentAudio(newAudio);

            newAudio.onplay = () => setCurrentlyPlaying(responseId);
            newAudio.onended = () => {
              setCurrentlyPlaying(null);
              setCurrentAudio(null);
            };
            newAudio.play().catch((fallbackErr) => {
              setCurrentlyPlaying(null);
              setCurrentAudio(null);
              setError(`Failed to play chat response: ${fallbackErr.message}`);
            });
          })
          .catch((fetchErr) => {
            setCurrentlyPlaying(null);
            setCurrentAudio(null);
            setError(`Failed to load chat response audio: ${fetchErr.message}`);
          });
      });
    } catch {
      setCurrentlyPlaying(null);
      setCurrentAudio(null);
      setError("Failed to create audio player for chat response");
    }
  };

  return { playChatResponse, stopPlaying, currentlyPlaying, error };
};
