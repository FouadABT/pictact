export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
};

export type IncrementResponse = {
  type: "increment";
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: "decrement";
  postId: string;
  count: number;
};

// Simple test types for image upload and event creation
export type CreateEventRequest = {
  title: string;
  description: string;
};

export type CreateEventResponse = {
  type: "event_created";
  eventId: string;
  success: boolean;
};

export type UploadImageResponse = {
  type: "image_uploaded";
  imageUrl: string;
  success: boolean;
};

export type LoadDataResponse = {
  type: "data_loaded";
  events: Array<{id: string, title: string, description: string, createdAt: string, createdBy: string}>;
  images: Array<{id: string, url: string, uploadedAt: string, uploadedBy: string, redditCommentId?: string}>;
  success: boolean;
};
