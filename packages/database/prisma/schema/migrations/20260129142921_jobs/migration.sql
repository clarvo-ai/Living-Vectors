-- CreateTable
CREATE TABLE "public"."Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_title" TEXT NOT NULL,
    "job_description" TEXT NOT NULL,
    "job_description_summary" TEXT,
    "job_is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_name" TEXT NOT NULL,
    "company_description" TEXT,
    "company_industry" TEXT,
    "company_size" TEXT,
    "company_revenue" TEXT,
    "company_culture" TEXT,
    "company_values" TEXT[],
    "published_date" TIMESTAMP(3),
    "last_day_to_apply" TIMESTAMP(3),
    "job_starting_date" TIMESTAMP(3),
    "country" TEXT NOT NULL,
    "city" TEXT,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "working_mode" TEXT,
    "role_industry" TEXT,
    "employment_type" TEXT,
    "contract_type" TEXT,
    "job_level" TEXT,
    "summer_job_internship" BOOLEAN NOT NULL DEFAULT false,
    "required_skills" TEXT[],
    "nice_to_have_skills" TEXT[],
    "required_languages" TEXT[],
    "nice_to_have_languages" TEXT[],
    "language_summary" TEXT,
    "required_education" TEXT[],
    "required_experience_months" INTEGER,
    "requirements" TEXT[],
    "salary" DOUBLE PRECISION,
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "bonus" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "guessed_salary" DOUBLE PRECISION,
    "guessed_salary_min" DOUBLE PRECISION,
    "guessed_salary_max" DOUBLE PRECISION,
    "guessed_bonus" DOUBLE PRECISION,
    "guessed_commission" DOUBLE PRECISION,
    "deprecated_perks" TEXT[],
    "work_hours" DOUBLE PRECISION,
    "work_hours_min" DOUBLE PRECISION,
    "work_hours_max" DOUBLE PRECISION,
    "work_hours_summary" TEXT,
    "source_url" TEXT NOT NULL,
    "apply_link" TEXT NOT NULL,
    "application_instructions" TEXT,
    "career_advancement_details" TEXT,
    "recruiter_name" TEXT,
    "recruiter_email" TEXT,
    "recruiter_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deprecated_keywords" TEXT[],
    "original_text" TEXT,
    "version" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "sub_source" TEXT,
    "external_id" TEXT,
    "job_embedding" vector(1536),
    "job_title_embedding" vector(1536),
    "titleId" UUID,
    "organizationId" UUID,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_source_url_key" ON "public"."Job"("source_url");

-- CreateIndex
CREATE INDEX "Job_published_date_idx" ON "public"."Job"("published_date");

-- CreateIndex
CREATE INDEX "Job_country_city_idx" ON "public"."Job"("country", "city");

-- CreateIndex
CREATE INDEX "Job_working_mode_idx" ON "public"."Job"("working_mode");

-- CreateIndex
CREATE INDEX "Job_employment_type_idx" ON "public"."Job"("employment_type");

-- CreateIndex
CREATE INDEX "Job_contract_type_idx" ON "public"."Job"("contract_type");

-- CreateIndex
CREATE INDEX "Job_job_level_idx" ON "public"."Job"("job_level");

-- CreateIndex
CREATE INDEX "Job_salary_idx" ON "public"."Job"("salary");

-- CreateIndex
CREATE INDEX "Job_salary_min_idx" ON "public"."Job"("salary_min");

-- CreateIndex
CREATE INDEX "Job_guessed_salary_idx" ON "public"."Job"("guessed_salary");

-- CreateIndex
CREATE UNIQUE INDEX "Job_source_external_id_key" ON "public"."Job"("source", "external_id");
