// Avatar API types
export interface Avatar {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  createdAt: string;
}

export interface Animation {
  id: number;
  avatarId: number;
  audioUrl?: string;
  videoUrl?: string;
  text: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}

export interface AnimationRequest {
  avatarId: number;
  text: string;
  voiceId: string;
}

export interface UploadAvatarRequest {
  image: File;
  name: string;
  description?: string;
}

// API base URL - you can change this to your backend URL
const API_BASE = "http://localhost:3000";

/**
 * Upload a face photo to create an avatar
 */
export const uploadAvatar = async (
  data: UploadAvatarRequest
): Promise<Avatar> => {
  const formData = new FormData();
  formData.append("image", data.image);
  formData.append("name", data.name);
  if (data.description) {
    formData.append("description", data.description);
  }

  const response = await fetch(`${API_BASE}/avatar/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload avatar");
  }

  return response.json();
};

/**
 * Start animation for an avatar
 */
export const animateAvatar = async (
  data: AnimationRequest
): Promise<Animation> => {
  const response = await fetch(`${API_BASE}/avatar/animate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to start animation");
  }

  return response.json();
};

/**
 * Get all animations for an avatar
 */
export const getAvatarAnimations = async (
  avatarId: number
): Promise<Animation[]> => {
  const response = await fetch(`${API_BASE}/avatar/${avatarId}/animations`);

  if (!response.ok) {
    throw new Error("Failed to fetch animations");
  }

  return response.json();
};

/**
 * Get animation status by ID
 */
export const getAnimationStatus = async (
  animationId: number
): Promise<Animation> => {
  const response = await fetch(
    `${API_BASE}/avatar/animations/${animationId}/status`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch animation status");
  }

  return response.json();
};

/**
 * Poll animation status until completion
 */
export const pollAnimationStatus = async (
  animationId: number,
  onUpdate: (animation: Animation) => void,
  pollInterval: number = 2000
): Promise<Animation> => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const animation = await getAnimationStatus(animationId);
        onUpdate(animation);

        if (animation.status === "completed" || animation.status === "failed") {
          resolve(animation);
        } else {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
};
