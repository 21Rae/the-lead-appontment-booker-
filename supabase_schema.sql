-- ==============================================================================
-- DATABASE SCHEMA: visitors & consultations
-- ==============================================================================

-- 1. Visitors Table
CREATE TABLE IF NOT EXISTS visitors (
    email TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    primary_goal TEXT,
    goal_details TEXT,
    financial_situation TEXT,
    time_horizon TEXT,
    investment_experience TEXT,
    risk_concerns TEXT,
    existing_portfolio_focus TEXT,
    investment_amount TEXT,
    summary_confirmation TEXT,
    adviser_conversion_choice TEXT,
    booking_slot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Consultations Table (Records all booked consultation forms)
CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    selected_time_slot TEXT NOT NULL,
    consultant_name TEXT DEFAULT 'Marcus Sterling, CFP®',
    consultation_type TEXT DEFAULT '20-minute video discovery call',
    status TEXT DEFAULT 'confirmed',
    conversation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);

-- Enable RLS & Public Access
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to visitors" ON visitors;
CREATE POLICY "Public access to visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to consultations" ON consultations;
CREATE POLICY "Public access to consultations" ON consultations FOR ALL USING (true) WITH CHECK (true);
