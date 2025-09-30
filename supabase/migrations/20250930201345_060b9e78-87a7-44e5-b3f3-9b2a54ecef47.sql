-- Add rastrosystem_id column to vehicles table to track unique vehicle from API
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rastrosystem_id TEXT;

-- Create unique index to prevent duplicate vehicles from Rastrosystem
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_rastrosystem_id 
ON vehicles(user_id, rastrosystem_id) 
WHERE rastrosystem_id IS NOT NULL;