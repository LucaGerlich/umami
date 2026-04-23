-- Create heatmap_data table
CREATE TABLE umami.heatmap_data
(
    heatmap_id UUID,
    website_id UUID,
    session_id UUID,
    url_path    String,
    x           Int32,
    y           Int32,
    event_type  Int8,
    created_at  DateTime64(6) DEFAULT now64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (website_id, url_path, created_at, heatmap_id)
SETTINGS index_granularity = 8192;
