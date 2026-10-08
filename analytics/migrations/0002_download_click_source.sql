-- Additive only: adds the allow-listed source tag in a new table. The beta.8 table,
-- its primary key and its trigger stay exactly as 0001 created them, so a rolled-back
-- deployment keeps writing to download_click_daily with its old ON CONFLICT target.
-- Both triggers draw on the same metrics_daily_budget row, so the shared daily cap holds.
CREATE TABLE download_click_daily_v2 (
  day TEXT NOT NULL CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event = 'apk_download_click'),
  release TEXT NOT NULL CHECK (length(release) BETWEEN 1 AND 64 AND release NOT GLOB '*[^A-Za-z0-9._-]*'),
  button TEXT NOT NULL CHECK (button IN ('nav', 'hero', 'footer', 'guide', 'download')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'windows', 'macos', 'linux', 'other')),
  source TEXT NOT NULL CHECK (source IN ('linkedin', 'x', 'instagram', 'none')),
  clicks INTEGER NOT NULL CHECK (clicks BETWEEN 1 AND 5000),
  PRIMARY KEY (day, event, release, button, platform, source)
) WITHOUT ROWID;

CREATE TRIGGER download_click_v2_budget BEFORE INSERT ON download_click_daily_v2
BEGIN
  INSERT INTO metrics_daily_budget (day, accepted) VALUES (NEW.day, 1)
  ON CONFLICT (day) DO UPDATE SET accepted = accepted + 1 WHERE accepted < 5000;
  SELECT RAISE(IGNORE) WHERE changes() = 0;
END;
