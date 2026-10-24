ALTER TABLE credit_lots DROP CONSTRAINT credit_lots_provider_check;
ALTER TABLE credit_lots ADD CONSTRAINT credit_lots_provider_check
 CHECK(provider IN ('stripe_test','stripe_live','apple_sandbox','apple_live'));
