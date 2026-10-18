#pragma once
#include "djayvo/remix.h"

// Offline only. Parsing never runs in the audio callback and grants no consent.
djayvo::RemixPlan import_plan(const std::string& json, const djayvo::AudioBuffer& source,
                             djayvo::Strategy strategy, std::uint32_t seed,
                             bool synthetic, bool consent);
std::string read_plan_document(const std::string& path);
