-- Apply ONLY to the new private analytics database, never the beta signup database.
CREATE TABLE metrics_daily_budget (
  day TEXT PRIMARY KEY CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  accepted INTEGER NOT NULL CHECK (accepted BETWEEN 0 AND 5000)
) WITHOUT ROWID;

CREATE TABLE download_click_daily (
  day TEXT NOT NULL CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event = 'apk_download_click'),
  release TEXT NOT NULL CHECK (length(release) BETWEEN 1 AND 64 AND release NOT GLOB '*[^A-Za-z0-9._-]*'),
  button TEXT NOT NULL CHECK (button IN ('nav', 'hero', 'footer', 'guide', 'download')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'windows', 'macos', 'linux', 'other')),
  clicks INTEGER NOT NULL CHECK (clicks BETWEEN 1 AND 5000),
  PRIMARY KEY (day, event, release, button, platform)
) WITHOUT ROWID;

CREATE TRIGGER download_click_budget BEFORE INSERT ON download_click_daily
BEGIN
  INSERT INTO metrics_daily_budget (day, accepted) VALUES (NEW.day, 1)
  ON CONFLICT (day) DO UPDATE SET accepted = accepted + 1 WHERE accepted < 5000;
  SELECT CASE WHEN changes() = 0 THEN RAISE(IGNORE) END;
END;
