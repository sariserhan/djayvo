"""Price-boundary regressions; no network requests or rentals."""
import importlib.util
import io
import contextlib
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("vast_trial", Path(__file__).resolve().parents[1] / "scripts/vast_trial.py")
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


class PriceBounds(unittest.TestCase):
    def test_musician_profile_isolated_and_bounded(self):
        names = ('ROOT', 'WORK', 'STATE', 'LABEL', 'LEASE_SECONDS', 'HOURLY_CEILING')
        previous = {name: getattr(trial, name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as directory, patch.object(trial, 'ROOT', Path(directory)), patch.object(
                    trial.sys, 'argv', ['vast_trial.py', 'status', '--musician-training']), patch.object(
                    trial, 'api', return_value={'credit': 10}), patch.object(trial, 'instances', return_value=[]), contextlib.redirect_stdout(io.StringIO()):
                trial.main()
                self.assertEqual(trial.STATE, Path(directory) / 'build-musician-training-20261021/trial-state.json')
                self.assertEqual(trial.LABEL, 'jamloom-musician-training-20261021')
                self.assertEqual((trial.LEASE_SECONDS, trial.HOURLY_CEILING), (7200, .5))
        finally:
            for name, value in previous.items():
                setattr(trial, name, value)

    def test_blood_profile_has_isolated_state_and_two_hour_limit(self):
        names = ('ROOT', 'WORK', 'STATE', 'LABEL', 'LEASE_SECONDS', 'HOURLY_CEILING')
        previous = {name: getattr(trial, name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as directory, patch.object(trial, 'ROOT', Path(directory)), patch.object(
                    trial.sys, 'argv', ['vast_trial.py', 'status', '--blood-training']), patch.object(
                    trial, 'api', return_value={'credit': 10}), patch.object(trial, 'instances', return_value=[]), contextlib.redirect_stdout(io.StringIO()):
                trial.main()
                self.assertEqual(trial.STATE, Path(directory) / 'build-blood-training-20261019/trial-state.json')
                self.assertEqual(trial.LABEL, 'djayvo-blood-training-20261019')
                self.assertEqual((trial.LEASE_SECONDS, trial.HOURLY_CEILING), (7200, .5))
        finally:
            for name, value in previous.items():
                setattr(trial, name, value)

    def setUp(self):
        self.offer = dict(dph_total=.2, storage_cost=.2, inet_down_cost=.01,
                          inet_up_cost=.01, num_gpus=1, gpu_ram=24576)

    def test_includes_storage_and_both_transfer_directions(self):
        quote = trial.quote(self.offer)
        self.assertAlmostEqual(quote["reserved_lease_plus_transfer"], .325 + 1.2)

    def test_account_key_list_response(self):
        with patch.dict(trial.os.environ, {"VASTAI_KEY": "test-only"}), patch.object(
                trial.urllib.request, "urlopen", return_value=io.StringIO('[{"id": 123}]')):
            self.assertEqual(trial.api('v0/ssh'), [{"id": 123}])

    def test_retry_keeps_original_budget_anchor_and_requires_cleanup(self):
        previous = {"starting_credit": 9.9, "destroy_requested_at": 123}
        self.assertEqual(trial.retry_credit({"credit": 9.8}, previous), 9.9)
        for credit in (2.8, float("nan")):
            with self.assertRaises(RuntimeError):
                trial.retry_credit({"credit": credit}, previous)
        with self.assertRaises(RuntimeError):
            trial.retry_credit({"credit": 9.8}, {"starting_credit": 9.9})

    def test_inherited_key_is_not_attached_twice(self):
        with patch.object(trial, "api", return_value={"ssh_keys": '[{"public_key":"ssh-ed25519 abc account-comment"}]'}) as api:
            trial.attach_key(42, 'ssh-ed25519 abc local-comment')
            api.assert_called_once_with('v0/instances/42/ssh')

    def test_missing_key_is_attached_and_invalid_response_rejected(self):
        with patch.object(trial, "api", return_value={"ssh_keys": []}) as api:
            trial.attach_key(42, 'ssh-ed25519 abc')
            self.assertEqual(api.call_count, 2)
            api.assert_called_with('v0/instances/42/ssh', 'POST', {'ssh_key': 'ssh-ed25519 abc'})
        with patch.object(trial, "api", return_value={"ssh_keys": {}}):
            with self.assertRaises(RuntimeError):
                trial.attach_key(42, 'ssh-ed25519 abc')

    def test_training_lease_and_stricter_hourly_ceiling(self):
        with patch.object(trial, "LEASE_SECONDS", 7200), patch.object(trial, "HOURLY_CEILING", .5):
            self.assertAlmostEqual(trial.quote(self.offer)["reserved_lease_plus_transfer"], 2 * (.2 + 60 * .2 / 720) + 1.2)
            with self.assertRaises(ValueError):
                trial.quote({**self.offer, "dph_total": .49})

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
