import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../../constants/api";

type ActivityData = {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  photos: string[];
  duration: number;
  difficulty: string;
  equipment: string;
  guide: {
    id: string;
    username: string;
    email: string;
    expertise: string[];
  };
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  tourist: {
    id: string;
    username: string;
  };
  createdAt: string;
};

type ReviewsData = {
  averageRating: number;
  reviewCount: number;
  reviews: Review[];
};

export default function TourDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewsData | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Review eligibility state
  const [canReview, setCanReview] = useState(false);
  const [canReviewReason, setCanReviewReason] = useState("");
  const [canReviewLoading, setCanReviewLoading] = useState(false);
  const [bookingEndDate, setBookingEndDate] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchActivityDetail(id);
      fetchReviews(id);
      checkCanReview(id);
      fetchMyReview(id);
    }
  }, [id]);

  const checkCanReview = async (activityId: string) => {
    setCanReviewLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setCanReview(false);
        setCanReviewReason("Please login to write a review");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/reviews/activity/${activityId}/can-review`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (response.ok) {
        setCanReview(data.canReview);
        setCanReviewReason(data.reason);
        if (data.bookingEndDate) setBookingEndDate(data.bookingEndDate);
      } else {
        setCanReview(false);
        setCanReviewReason(data.msg || "Unable to check review eligibility");
      }
    } catch (error) {
      console.error("Can review check error:", error);
      setCanReview(false);
      setCanReviewReason("Unable to check review eligibility");
    } finally {
      setCanReviewLoading(false);
    }
  };

  const fetchActivityDetail = async (activityId: string) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/activities/${activityId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.msg || "Failed to load activity details");
        router.back();
        return;
      }

      setActivity(data.activity);
    } catch (error) {
      console.error("Activity detail error:", error);
      Alert.alert("Error", "Failed to load activity. Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (activityId: string) => {
    try {
      setReviewLoading(true);
      const response = await fetch(
        `${API_URL}/api/reviews/activity/${activityId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setReviews(data);
      }
    } catch (error) {
      console.error("Reviews fetch error:", error);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchMyReview = async (activityId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/reviews/activity/${activityId}/my-review`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok && data.review) {
        setMyReview(data.review);
        setRating(data.review.rating);
        setComment(data.review.comment || "");
        setShowReviewForm(true);
      }
    } catch (error) {
      console.error("My review fetch error:", error);
    }
  };

  const submitReview = async () => {
    if (!id || rating < 1 || rating > 5) {
      Alert.alert("Error", "Please select a rating between 1 and 5");
      return;
    }

    if (comment.length > 1000) {
      Alert.alert("Error", "Comment must be 1000 characters or less");
      return;
    }

    try {
      setSubmittingReview(true);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Authentication Required", "Please login to submit a review");
        return;
      }

      const response = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          activityId: id,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          Alert.alert("Cannot Submit Review", data.msg || "You are not eligible to review this activity");
          checkCanReview(id!);
          return;
        }
        Alert.alert("Error", data.msg || "Failed to submit review");
        return;
      }

      Alert.alert("Success", myReview ? "Review updated successfully!" : "Review submitted successfully!");
      setMyReview(data.review);
      setShowReviewForm(false);
      fetchReviews(id!);
    } catch (error) {
      console.error("Submit review error:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Activity not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photoUrls = activity.photos && activity.photos.length > 0
    ? activity.photos.map(photo => `${API_URL}${photo}`)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
    >
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {activity.name}
        </Text>
      </View>

      {/* Photo Gallery */}
      {photoUrls.length > 0 ? (
        <View style={styles.photoGalleryContainer}>
          <FlatList
            data={photoUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x /
                  event.nativeEvent.layoutMeasurement.width
              );
              setCurrentPhotoIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.photoItemContainer}>
                <Image source={{ uri: item }} style={styles.mainImage} />
              </View>
            )}
          />
          {photoUrls.length > 1 && (
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {currentPhotoIndex + 1} / {photoUrls.length}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.mainImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={50} color="#ccc" />
        </View>
      )}

      <View style={styles.infoRow}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color="#007BFF" />
          <Text style={styles.locationText}>{activity.location}</Text>
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>
            {reviews?.averageRating?.toFixed(1) || "N/A"}
          </Text>
          {reviews && reviews.reviewCount > 0 && (
            <Text style={styles.reviewCountText}>
              ({reviews.reviewCount})
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.aboutText}>{activity.description}</Text>

      <View style={styles.cardRow}>
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={30} color="#007BFF" />
          <Text style={styles.cardTitle}>{activity.duration} days</Text>
          <Text style={styles.cardSubtitle}>Duration</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="bar-chart-outline" size={30} color="#007BFF" />
          <Text style={styles.cardTitle}>{activity.difficulty}</Text>
          <Text style={styles.cardSubtitle}>Difficulty</Text>
        </View>
      </View>

      {activity.equipment && (
        <>
          <Text style={styles.sectionTitle}>Equipment Needed</Text>
          <View style={styles.equipmentList}>
            {activity.equipment
              .split("\n")
              .filter((item) => item.trim())
              .map((item, index) => (
                <View key={index} style={styles.equipmentItem}>
                  <Text style={styles.equipmentBullet}>•</Text>
                  <Text style={styles.equipmentText}>
                    {item.trim().replace(/^[•\-\*]\s*/, "")}
                  </Text>
                </View>
              ))}
          </View>
        </>
      )}

      {activity.guide && (
        <>
          <Text style={styles.sectionTitle}>Uploaded by</Text>
          <View style={styles.guideCard}>
            <Text style={styles.guideName}>{activity.guide.username}</Text>
            {activity.guide.expertise && activity.guide.expertise.length > 0 && (
              <Text style={styles.guideExpertise}>
                {activity.guide.expertise.join(", ")}
              </Text>
            )}
          </View>
        </>
      )}

      {/* Reviews Section */}
      <Text style={styles.sectionTitle}>
        Reviews {reviews && reviews.reviewCount > 0 && `(${reviews.reviewCount})`}
      </Text>

      {/* Review Form - Conditional based on eligibility */}
      {canReviewLoading ? (
        <View style={styles.reviewEligibilityContainer}>
          <ActivityIndicator size="small" color="#007BFF" />
          <Text style={styles.reviewEligibilityText}>Checking review eligibility...</Text>
        </View>
      ) : canReview ? (
        <View style={styles.reviewFormContainer}>
          <TouchableOpacity
            style={styles.reviewFormToggle}
            onPress={() => setShowReviewForm(!showReviewForm)}
          >
            <Text style={styles.reviewFormToggleText}>
              {myReview ? "Edit Your Review" : "Write a Review"}
            </Text>
            <Ionicons name={showReviewForm ? "chevron-up" : "chevron-down"} size={20} color="#007BFF" />
          </TouchableOpacity>

          {showReviewForm && (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormLabel}>Rating</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reviewFormLabel}>Comment (Optional)</Text>
              <TextInput
                style={styles.reviewCommentInput}
                multiline
                numberOfLines={4}
                placeholder="Share your experience..."
                value={comment}
                onChangeText={setComment}
                maxLength={1000}
              />
              {comment.length > 0 && <Text style={styles.charCount}>{comment.length} / 1000 characters</Text>}

              <TouchableOpacity
                style={[styles.submitReviewButton, submittingReview && styles.submitReviewButtonDisabled]}
                onPress={submitReview}
                disabled={submittingReview}
              >
                <Text style={styles.submitReviewButtonText}>
                  {submittingReview ? "Submitting..." : myReview ? "Update Review" : "Submit Review"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.cannotReviewContainer}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
          <Text style={styles.cannotReviewText}>{canReviewReason}</Text>
          {bookingEndDate && (
            <Text style={styles.bookingEndDateText}>
              Your booking ends on: {new Date(bookingEndDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Reviews List */}
      {reviewLoading ? (
        <ActivityIndicator size="small" color="#007BFF" style={{ marginVertical: 20 }} />
      ) : reviews && reviews.reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          {reviews.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUsername}>{review.tourist.username}</Text>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= review.rating ? "star" : "star-outline"}
                      size={14}
                      color="#FFD700"
                    />
                  ))}
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
      )}

      <TouchableOpacity style={styles.weatherBox}>
        <Ionicons name="cloud-outline" size={22} color="#007BFF" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.weatherTitle}>Weather & AI suggestions</Text>
          <Text style={styles.weatherSubtitle}>
            Check forecast and smart tips
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#000"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/tourist/guide_list",
          params: { 
            category: activity.category,
            activityId: activity.id,
            duration: activity.duration.toString()
          }
        })}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Find guides</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7FF",
    padding: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginLeft: 20,
  },

  mainImage: {
    width: Dimensions.get("window").width - 40,
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    marginLeft: 5,
    color: "#007BFF",
    fontFamily: "Nunito_400Regular",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    marginLeft: 5,
    fontFamily: "Nunito_400Regular",
  },

  sectionTitle: {
    fontSize: 20,
    marginBottom: 8,
    fontFamily: "Nunito_700Bold",
  },

  aboutText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 15,
    fontFamily: "Nunito_400Regular",
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  infoCard: {
    width: "48%",
    backgroundColor: "#E7F0FF",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 25,

    
  },

  cardTitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#777",
    fontFamily: "Nunito_400Regular",
  },

  weatherBox: {
    backgroundColor: "#E7F0FF",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    marginTop: 20,

  },

  weatherTitle: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },

  weatherSubtitle: {
    fontSize: 15,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },

  primaryButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  placeholderImage: {
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F7FF",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Nunito_700Bold",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  guideCard: {
    backgroundColor: "#E7F0FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  guideName: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginBottom: 5,
  },
  guideExpertise: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  photoGalleryContainer: {
    marginBottom: 10,
    position: "relative",
    width: Dimensions.get("window").width - 40,
  },
  photoItemContainer: {
    width: Dimensions.get("window").width - 40,
  },
  photoCounter: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  photoCounterText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
  reviewCountText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  reviewEligibilityContainer: {
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewEligibilityText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
    fontFamily: "Nunito_400Regular",
  },
  cannotReviewContainer: {
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD699",
  },
  cannotReviewText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  bookingEndDateText: {
    marginTop: 8,
    fontSize: 12,
    color: "#007BFF",
    fontFamily: "Nunito_700Bold",
  },
  reviewFormContainer: {
    backgroundColor: "#E7F0FF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  reviewFormToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewFormToggleText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#007BFF",
  },
  reviewForm: {
    marginTop: 15,
  },
  reviewFormLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginBottom: 8,
    color: "#333",
  },
  ratingSelector: {
    flexDirection: "row",
    marginBottom: 15,
  },
  starButton: {
    marginRight: 5,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: "#D0D6E0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    minHeight: 100,
    textAlignVertical: "top",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    marginBottom: 5,
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginBottom: 10,
    fontFamily: "Nunito_400Regular",
  },
  submitReviewButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  submitReviewButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewUsername: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: "#333",
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewComment: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: "Nunito_400Regular",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
    fontFamily: "Nunito_400Regular",
  },
  noReviewsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
    fontFamily: "Nunito_400Regular",
  },
  equipmentList: {
    marginBottom: 15,
  },
  equipmentItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  equipmentBullet: {
    fontSize: 16,
    color: "#007BFF",
    marginRight: 8,
    fontFamily: "Nunito_700Bold",
  },
  equipmentText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    fontFamily: "Nunito_400Regular",
  },
});
