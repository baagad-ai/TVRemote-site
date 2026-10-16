-- Additive only: cookie-free page analytics for POST /api/events. No existing table, trigger or row is touched.
-- page_event_budget is separate from metrics_daily_budget, so page events never consume the download-click budget.
-- Rows hold daily aggregate counters only. There is no IP, user agent, URL, visitor or session ID, or time finer than the UTC day.
-- '' means the event has no key or no bucket. The handler enforces EVENTS_DAILY_CAP and the trigger is a hard 50000 per day ceiling.
CREATE TABLE page_event_budget (
  day TEXT PRIMARY KEY CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  accepted INTEGER NOT NULL CHECK (accepted BETWEEN 0 AND 50000)
) WITHOUT ROWID;

CREATE TABLE page_event_daily (
  day TEXT NOT NULL CHECK (length(day) = 10 AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  event TEXT NOT NULL CHECK (event IN ('page_view', 'section_view', 'click', 'install_steps_open', 'loop_play', 'time_on_page', 'vital', 'js_error', 'broken_link')),
  key TEXT NOT NULL CHECK (key IN ('', 'hero', 'search', 'guests', 'trackpad', 'download', 'qr', 'faq', 'guide', 'article', 'header', 'pin', 'rooms_living', 'rooms_bedroom', 'rooms_kitchen', 'lcp', 'inp', 'cls')),
  bucket TEXT NOT NULL CHECK (bucket IN ('', 'lt5', '5_30', '30_120', 'gt120', 'good', 'ni', 'poor')),
  source TEXT NOT NULL CHECK (source IN ('x', 'threads', 'reddit', 'instagram', 'linkedin', 'qr', 'qr_site', 'guide', 'none')),
  ref TEXT NOT NULL CHECK (ref IN ('direct', 'other', 'google.com', 'bing.com', 'duckduckgo.com', 'reddit.com', 'x.com', 't.co', 'threads.net', 'instagram.com', 'linkedin.com', 'youtube.com', 'github.com', 'news.ycombinator.com', 'producthunt.com')),
  campaign TEXT NOT NULL CHECK (campaign IN ('release', 'launch', 'guide', 'none', 'other')),
  country TEXT NOT NULL CHECK (length(country) = 2 AND country NOT GLOB '*[^A-Z]*'),
  device TEXT NOT NULL CHECK (device IN ('phone', 'tablet', 'desktop')),
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 50000),
  CHECK (
    (event IN ('page_view', 'install_steps_open', 'js_error', 'broken_link') AND key = '' AND bucket = '')
    OR (event = 'section_view' AND key IN ('hero', 'search', 'guests', 'trackpad', 'download') AND bucket = '')
    OR (event = 'click' AND key IN ('download', 'qr', 'faq', 'guide', 'article', 'header') AND bucket = '')
    OR (event = 'loop_play' AND key IN ('hero', 'pin', 'rooms_living', 'rooms_bedroom', 'rooms_kitchen') AND bucket = '')
    OR (event = 'time_on_page' AND key = '' AND bucket IN ('lt5', '5_30', '30_120', 'gt120'))
    OR (event = 'vital' AND key IN ('lcp', 'inp', 'cls') AND bucket IN ('good', 'ni', 'poor'))
  ),
  PRIMARY KEY (day, event, key, bucket, source, ref, campaign, country, device)
) WITHOUT ROWID;

CREATE TRIGGER page_event_budget_guard BEFORE INSERT ON page_event_daily
BEGIN
  INSERT INTO page_event_budget (day, accepted) VALUES (NEW.day, 1)
  ON CONFLICT (day) DO UPDATE SET accepted = accepted + 1 WHERE accepted < 50000;
  SELECT RAISE(IGNORE) WHERE changes() = 0;
END;
