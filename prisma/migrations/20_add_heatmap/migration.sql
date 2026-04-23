-- CreateTable
CREATE TABLE "heatmap_data" (
    "heatmap_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "url_path" VARCHAR(500) NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "event_type" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heatmap_data_pkey" PRIMARY KEY ("heatmap_id")
);

-- CreateIndex
CREATE INDEX "heatmap_data_website_id_idx" ON "heatmap_data"("website_id");
CREATE INDEX "heatmap_data_website_id_url_path_idx" ON "heatmap_data"("website_id", "url_path");
CREATE INDEX "heatmap_data_website_id_created_at_idx" ON "heatmap_data"("website_id", "created_at");
CREATE INDEX "heatmap_data_website_id_url_path_created_at_idx" ON "heatmap_data"("website_id", "url_path", "created_at");
