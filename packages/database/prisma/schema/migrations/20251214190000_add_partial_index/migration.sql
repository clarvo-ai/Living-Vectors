-- Basic partial index:
CREATE INDEX IF NOT EXISTS idx_convmsg_user_unlearned_createdat
  ON "ConversationMessage" ("userId", "createdAt")
  WHERE "learnedFrom" = false;

