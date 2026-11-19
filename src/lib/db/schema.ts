import {
  bigserial,
  bigint,
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const artistApplications = pgTable("artist_applications", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  stageName: text("stage_name").notNull(),
  fullName: text("full_name").notNull(),
  municipality: text("municipality").notNull(),
  genre: text("genre").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  bio: text("bio").notNull(),
  link: text("link").notNull(),
  photoUrl: text("photo_url").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  reviewedAt: timestamptz("reviewed_at"),
  requirements: text("requirements").notNull(),
  deadline: timestamptz("deadline"),
  decisionNote: text("decision_note").notNull(),
  reviewedBy: text("reviewed_by"),
  updatedAt: timestamptz("updated_at").notNull(),
});

export const artistAccounts = pgTable("artist_accounts", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
}, (table) => ({
  applicationUnique: uniqueIndex("artist_accounts_application_id_key").on(table.applicationId),
}));

export const artistMedia = pgTable("artist_media", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  kind: text("kind").notNull(),
  genre: text("genre").notNull(),
  mediaUrl: text("media_url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  downloadAllowed: boolean("download_allowed").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  reviewedAt: timestamptz("reviewed_at"),
});

export const artistSessions = pgTable("artist_sessions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  tokenHashUnique: uniqueIndex("artist_sessions_token_hash_key").on(table.tokenHash),
  expiryIdx: index("artist_sessions_expiry_idx").on(table.expiresAt),
}));

export const platformAdmins = pgTable("platform_admins", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  permissions: text("permissions").array().notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
  createdBy: text("created_by"),
}, (table) => ({
  emailUnique: uniqueIndex("platform_admins_email_key").on(table.email),
}));

export const platformAdminSessions = pgTable("platform_admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  adminId: text("admin_id").notNull(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  expiryIdx: index("idx_platform_admin_sessions_expiry").on(table.expiresAt),
}));

export const publishedContent = pgTable("published_content", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  genre: text("genre").notNull(),
  description: text("description").notNull(),
  link: text("link").notNull(),
  audioUrl: text("audio_url").notNull(),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  typeCreatedIdx: index("published_content_type_created_idx").on(table.type, table.createdAt.desc()),
}));

export const communityFollows = pgTable("community_follows", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  followerId: text("follower_id").notNull(),
  followedId: text("followed_id").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  pairUnique: uniqueIndex("community_follows_follower_id_followed_id_key").on(table.followerId, table.followedId),
  followedIdx: index("idx_community_follows_followed").on(table.followedId),
}));

export const communityMessages = pgTable("community_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  conversationId: text("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  readAt: timestamptz("read_at"),
}, (table) => ({
  conversationCreatedIdx: index("idx_community_messages_conversation").on(table.conversationId, table.createdAt.desc()),
}));

export const communityEvents = pgTable("community_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  municipality: text("municipality").notNull(),
  venue: text("venue").notNull(),
  startsAt: timestamptz("starts_at"),
  endsAt: timestamptz("ends_at"),
  organizer: text("organizer").notNull(),
  description: text("description").notNull(),
  registrationUrl: text("registration_url").notNull(),
  sourceUrl: text("source_url").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  reviewedBy: text("reviewed_by"),
  decisionNote: text("decision_note").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
}, (table) => ({
  statusDateIdx: index("community_events_status_date_idx").on(table.status, table.startsAt),
}));

export const culturalOpportunities = pgTable("cultural_opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  deadline: timestamptz("deadline"),
  eligibility: text("eligibility").notNull(),
  description: text("description").notNull(),
  applicationUrl: text("application_url").notNull(),
  sourceUrl: text("source_url").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  statusDeadlineIdx: index("cultural_opportunities_status_deadline_idx").on(table.status, table.deadline),
}));

export const platformAuditLog = pgTable("platform_audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorAdminId: text("actor_admin_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  createdIdx: index("idx_platform_audit_created").on(table.createdAt.desc()),
}));

export const platformFinanceEntries = pgTable("platform_finance_entries", {
  id: text("id").primaryKey(),
  entryType: text("entry_type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  reference: text("reference").notNull(),
  occurredAt: date("occurred_at").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  occurredDateIdx: index("idx_finance_entries_date").on(table.occurredAt.desc()),
}));


export const platformPublications = pgTable("platform_publications", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  externalUrl: text("external_url").notNull(),
  mediaUrl: text("media_url").notNull(),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").notNull(),
  status: text("status").notNull(),
  scheduledAt: timestamptz("scheduled_at"),
  eventStartsAt: timestamptz("event_starts_at"),
  location: text("location").notNull().default(""),
  organizer: text("organizer").notNull().default(""),
  ticketPrice: text("ticket_price").notNull().default(""),
  ticketUrl: text("ticket_url").notNull().default(""),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
}, (table) => ({
  statusCreatedIdx: index("platform_publications_status_created_idx").on(table.status, table.createdAt.desc()),
}));

export const platformAdminLoginAttempts = pgTable("platform_admin_login_attempts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ipHash: text("ip_hash").notNull(),
  attemptedAt: timestamptz("attempted_at").notNull(),
}, (table) => ({
  ipTimeIdx: index("platform_admin_login_attempts_ip_time_idx").on(table.ipHash, table.attemptedAt.desc()),
}));

export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull().default(""),
  contentType: text("content_type").notNull().default("general"),
  body: text("body").notNull(),
  location: text("location").notNull().default(""),
  organizer: text("organizer").notNull().default(""),
  eventStartsAt: timestamptz("event_starts_at"),
  ticketPrice: text("ticket_price").notNull().default(""),
  ticketUrl: text("ticket_url").notNull().default(""),
  scheduledAt: timestamptz("scheduled_at"),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull(),
  visibility: text("visibility").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
}, (table) => ({
  statusCreatedIdx: index("community_posts_status_created_idx").on(table.status, table.createdAt.desc()),
  authorCreatedIdx: index("community_posts_author_created_idx").on(table.authorId, table.createdAt.desc()),
}));

export const communityConversations = pgTable("community_conversations", {
  id: text("id").primaryKey(),
  participantA: text("participant_a").notNull(),
  participantB: text("participant_b").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
}, (table) => ({
  participantPairUnique: uniqueIndex("community_conversations_pair_key").on(table.participantA, table.participantB),
  participantAIdx: index("community_conversations_participant_a_idx").on(table.participantA, table.updatedAt.desc()),
  participantBIdx: index("community_conversations_participant_b_idx").on(table.participantB, table.updatedAt.desc()),
}));

export const communityPostViews = pgTable("community_post_views", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  postId: text("post_id").notNull(),
  visitorHash: text("visitor_hash").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  postVisitorUnique: uniqueIndex("community_post_views_visitor_key").on(table.postId, table.visitorHash),
  postCreatedIdx: index("community_post_views_post_created_idx").on(table.postId, table.createdAt.desc()),
}));

export const communityComments = pgTable("community_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  postCreatedIdx: index("community_comments_post_created_idx").on(table.postId, table.createdAt),
}));

export const communityReactions = pgTable("community_reactions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: text("actor_id").notNull(),
  contentId: text("content_id").notNull(),
  reaction: text("reaction").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  actorContentUnique: uniqueIndex("community_reactions_actor_id_content_id_key").on(table.actorId, table.contentId),
  contentIdx: index("idx_community_reactions_content").on(table.contentId),
}));

export const communityBlocks = pgTable("community_blocks", {
  blockerId: text("blocker_id").notNull(),
  blockedId: text("blocked_id").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  pairUnique: uniqueIndex("community_blocks_pkey").on(table.blockerId, table.blockedId),
}));

export const communityReports = pgTable("community_reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  reporterId: text("reporter_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
}, (table) => ({
  statusCreatedIdx: index("idx_community_reports_status").on(table.status, table.createdAt.desc()),
}));
