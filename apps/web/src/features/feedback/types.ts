export type FeedbackItem = {
  id: string;
  userId: string;
  message: string;
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type FeedbackListResponse = {
  items: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
