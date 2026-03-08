import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

export async function getGuideReviews(guideId: string) {
  const response = await fetch(`${API_URL}/api/reviews/guide/${guideId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to fetch guide reviews");
  }

  return data as {
    averageRating: number;
    reviewCount: number;
    reviews: {
      id: string;
      rating: number;
      comment?: string;
      tourist?: {
        id: string;
        username?: string;
        fullName?: string;
        avatar?: string | null;
      };
      bookingId?: string;
      createdAt: string;
    }[];
  };
}

export async function canReviewGuide(guideId: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(
    `${API_URL}/api/reviews/guide/${guideId}/can-review`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to check review eligibility");
  }

  return data as {
    canReview: boolean;
    hasExistingReview?: boolean;
    reason?: string;
    bookingId?: string;
    bookingStatus?: string;
    bookingEndDate?: string;
  };
}

export async function getMyGuideReview(guideId: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(
    `${API_URL}/api/reviews/guide/${guideId}/my-review`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to fetch guide review");
  }

  return (data.review || null) as
    | {
        id: string;
        rating: number;
        comment?: string;
        bookingId?: string;
        createdAt: string;
      }
    | null;
}

export async function submitGuideReview(
  guideId: string,
  rating: number,
  comment: string
) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Not logged in");
  }

  const response = await fetch(`${API_URL}/api/reviews/guide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ guideId, rating, comment }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.msg || "Failed to submit guide review");
  }

  return data.review as {
    id: string;
    rating: number;
    comment?: string;
    bookingId?: string;
    createdAt: string;
  };
}

