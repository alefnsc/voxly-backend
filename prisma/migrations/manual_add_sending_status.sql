-- Manual migration: Add SENDING value to EmailSendStatus enum
-- This should be run on production before deploying the new email endpoint

-- PostgreSQL allows adding new values to existing enums
-- This is safe and non-destructive

DO $$
BEGIN
    -- Check if the SENDING value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'SENDING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EmailSendStatus')
    ) THEN
        -- Add SENDING after PENDING
        ALTER TYPE "EmailSendStatus" ADD VALUE 'SENDING' AFTER 'PENDING';
        RAISE NOTICE 'Added SENDING to EmailSendStatus enum';
    ELSE
        RAISE NOTICE 'SENDING already exists in EmailSendStatus enum';
    END IF;
END $$;
