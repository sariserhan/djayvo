#pragma once
#include "jamloom/remix.h"

// Offline only. Parsing never runs in the audio callback and grants no consent.
jamloom::RemixPlan import_plan(const std::string& json, const jamloom::AudioBuffer& source,
                             jamloom::Strategy strategy, std::uint32_t seed,
                             bool synthetic, bool consent);
std::string read_plan_document(const std::string& path);
