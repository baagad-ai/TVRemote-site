CREATE TABLE beta_requests (
  email TEXT PRIMARY KEY NOT NULL CHECK(length(email) BETWEEN 3 AND 254),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
CREATE INDEX beta_requests_created_at ON beta_requests(created_at);
