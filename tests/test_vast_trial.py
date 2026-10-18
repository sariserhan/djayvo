"""Price-boundary regressions; no network requests or rentals."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("vast_trial", Path(__file__).resolve().parents[1] / "scripts/vast_trial.py")
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


class PriceBounds(unittest.TestCase):
    def setUp(self):
        self.offer = dict(dph_total=.2, storage_cost=.2, inet_down_cost=.01,
                          inet_up_cost=.01, num_gpus=1, gpu_ram=24576)

    def test_includes_storage_and_both_transfer_directions(self):
        quote = trial.quote(self.offer)
        self.assertAlmostEqual(quote["reserved_90min_plus_transfer"], .325 + 1.2)

    def test_rejects_missing_nonfinite_and_negative_costs(self):
        for key in ("dph_total", "storage_cost", "inet_down_cost", "inet_up_cost"):
            for value in (float("nan"), float("inf"), -1):
                with self.assertRaises(ValueError):
                    trial.quote({**self.offer, key: value})
            missing = self.offer.copy()
            del missing[key]
            with self.assertRaises(ValueError):
                trial.quote(missing)

    def test_rejects_expensive_transfer_or_compute_and_multiple_gpus(self):
        for changes in ({"inet_down_cost": 1}, {"dph_total": 1}, {"storage_cost": 30},
                        {"num_gpus": 2}, {"gpu_ram": 16000}):
            with self.assertRaises(ValueError):
                trial.quote({**self.offer, **changes})

    def test_unknown_instance_response_fails_closed(self):
        with patch.object(trial, "api", return_value={"success": True}):
            with self.assertRaises(RuntimeError):
                trial.instances()

    def test_cleanup_refuses_other_label(self):
        with patch.object(trial, "instances", return_value=[{"id": 42, "label": "other"}]), patch.object(trial, "api") as api:
            with self.assertRaises(RuntimeError):
                trial.destroy({"id": 42})
            api.assert_not_called()

    def test_lost_create_response_reconciles_only_trial_label(self):
        with patch.object(trial, "instances", return_value=[{"id": 42, "label": trial.LABEL}, {"id": 99, "label": "other"}]), patch.object(trial, "api") as api, patch.object(trial, "write_state"):
            trial.destroy({})
            api.assert_called_once_with("v0/instances/42", "DELETE")


if __name__ == "__main__":
    unittest.main()
