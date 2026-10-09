-- Allows the 'qr' source tag. SQLite cannot alter a CHECK constraint, so this rebuilds
-- download_click_daily_v2 with the same columns, primary key and budget trigger as 0002.
-- Only the source allow-list gains 'qr'. Rows are copied before the trigger is recreated,
-- so the copy does not count against metrics_daily_budget. The table is WITHOUT ROWID with
-- its primary key as the only index, so there are no other indexes to recreate.
-- download_click_daily (0001), its trigger and metrics_daily_budget are not touched.
-- Dropping the old table also drops its trigger, which is recreated below under the same name.
CREATE TABLE download_click_daily_v2_new (
  day TEXT NOT NULL CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event = 'apk_download_click'),
  release TEXT NOT NULL CHECK (length(release) BETWEEN 1 AND 64 AND release NOT GLOB '*[^A-Za-z0-9._-]*'),
  button TEXT NOT NULL CHECK (button IN ('nav', 'hero', 'footer', 'guide', 'download')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'windows', 'macos', 'linux', 'other')),
  source TEXT NOT NULL CHECK (source IN ('linkedin', 'x', 'instagram', 'qr', 'none')),
  clicks INTEGER NOT NULL CHECK (clicks BETWEEN 1 AND 5000),
  PRIMARY KEY (day, event, release, button, platform, source)
) WITHOUT ROWID;

INSERT INTO download_click_daily_v2_new (day, event, release, button, platform, source, clicks)
SELECT day, event, release, button, platform, source, clicks FROM download_click_daily_v2;

DROP TABLE download_click_daily_v2;

ALTER TABLE download_click_daily_v2_new RENAME TO download_click_daily_v2;

CREATE TRIGGER download_click_v2_budget BEFORE INSERT ON download_click_daily_v2
BEGIN
  INSERT INTO metrics_daily_budget (day, accepted) VALUES (NEW.day, 1)
  ON CONFLICT (day) DO UPDATE SET accepted = accepted + 1 WHERE accepted < 5000;
  SELECT RAISE(IGNORE) WHERE changes() = 0;
END;
