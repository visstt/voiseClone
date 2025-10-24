import React, { useState, useEffect, useCallback } from "react";
import { getAvatarAnimations, pollAnimationStatus } from "../utils/avatarAPI";
import type { Animation } from "../utils/avatarAPI";
import "./AnimationsList.css";

interface AnimationsListProps {
  avatarId: number;
  newAnimation?: Animation;
}

const AnimationsList: React.FC<AnimationsListProps> = ({
  avatarId,
  newAnimation,
}) => {
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingAnimations, setPollingAnimations] = useState<Set<number>>(
    new Set()
  );

  const loadAnimations = useCallback(async () => {
    try {
      setError(null);
      const animationsList = await getAvatarAnimations(avatarId);
      setAnimations(animationsList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load animations"
      );
    } finally {
      setLoading(false);
    }
  }, [avatarId]);

  const startPolling = useCallback((animation: Animation) => {
    if (animation.status === "completed" || animation.status === "failed") {
      return;
    }

    setPollingAnimations((prev) => new Set(prev).add(animation.id));

    pollAnimationStatus(animation.id, (updatedAnimation) => {
      setAnimations((prev) =>
        prev.map((anim) =>
          anim.id === updatedAnimation.id ? updatedAnimation : anim
        )
      );
    })
      .then((finalAnimation) => {
        setPollingAnimations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(finalAnimation.id);
          return newSet;
        });
      })
      .catch((err) => {
        console.error("Polling error:", err);
        setPollingAnimations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(animation.id);
          return newSet;
        });
      });
  }, []);

  // Load animations on mount
  useEffect(() => {
    loadAnimations();
  }, [loadAnimations]);

  // Handle new animation
  useEffect(() => {
    if (newAnimation) {
      setAnimations((prev) => [newAnimation, ...prev]);
      startPolling(newAnimation);
    }
  }, [newAnimation, startPolling]);

  // Start polling for pending/processing animations
  useEffect(() => {
    animations.forEach((animation) => {
      if (
        (animation.status === "pending" || animation.status === "processing") &&
        !pollingAnimations.has(animation.id)
      ) {
        startPolling(animation);
      }
    });
  }, [animations, pollingAnimations, startPolling]);

  const getStatusIcon = (status: Animation["status"]) => {
    switch (status) {
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      case "processing":
        return "⚙️";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getStatusText = (status: Animation["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "processing":
        return "Processing...";
      case "pending":
        return "Pending...";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="animations-list loading">
        <div className="loading-spinner"></div>
        <p>Loading animations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animations-list error">
        <p>Error: {error}</p>
        <button onClick={loadAnimations} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="animations-list">
      <div className="animations-header">
        <h3>Avatar Animations</h3>
        <button onClick={loadAnimations} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {animations.length === 0 ? (
        <div className="no-animations">
          <p>No animations yet. Create your first animation!</p>
        </div>
      ) : (
        <div className="animations-grid">
          {animations.map((animation) => (
            <div
              key={animation.id}
              className={`animation-card ${animation.status}`}
            >
              <div className="animation-header">
                <div className="status-indicator">
                  <span className="status-icon">
                    {getStatusIcon(animation.status)}
                  </span>
                  <span className="status-text">
                    {getStatusText(animation.status)}
                  </span>
                </div>
                <div className="animation-date">
                  {formatDate(animation.createdAt)}
                </div>
              </div>

              <div className="animation-text">
                <p>"{animation.text}"</p>
              </div>

              {animation.status === "completed" && (
                <div className="animation-media">
                  {animation.audioUrl && (
                    <div className="media-item">
                      <label>Audio:</label>
                      <audio controls src={animation.audioUrl}>
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {animation.videoUrl && (
                    <div className="media-item">
                      <label>Video:</label>
                      <video
                        controls
                        src={animation.videoUrl}
                        className="animation-video"
                      >
                        Your browser does not support the video element.
                      </video>
                    </div>
                  )}
                </div>
              )}

              {(animation.status === "pending" ||
                animation.status === "processing") && (
                <div className="progress-indicator">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                  <p>Please wait while we process your animation...</p>
                </div>
              )}

              {animation.status === "failed" && (
                <div className="error-indicator">
                  <p>Animation failed to process. Please try again.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimationsList;
