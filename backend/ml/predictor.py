"""
DeltaCash – Ensemble ML Predictor (Glass-Box)
Uses a real trained Gradient Boosting + Random Forest ensemble.
Trains on synthetic SME payment data at startup and exposes feature importances.
"""
from __future__ import annotations

import os
import pickle
import json
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np

# Try real sklearn; fall back to deterministic simulation if not installed
try:
    from sklearn.ensemble import (
        GradientBoostingRegressor,
        RandomForestRegressor,
        VotingRegressor,
    )
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from models.schemas import Receivable

# ─── Feature names (for glass-box transparency) ─────────────────────────────
FEATURE_NAMES = [
    "historical_delay_days",
    "amount_bucket",          # 0=<50k, 1=50-200k, 2=>200k
    "days_until_due",
    "on_time_rate",
    "penalty_severity",       # penalty_rate scaled
    "month_of_year",          # seasonal factor
    "day_of_week",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ensemble_model.pkl")

# ─── Vendor profiles (same as before, extended) ──────────────────────────────
VENDOR_PROFILES: Dict[str, Dict] = {
    "Acme Corp":         {"avg_delay": 5, "on_time_rate": 0.65, "std": 2},
    "Global Tech":       {"avg_delay": 2, "on_time_rate": 0.85, "std": 1},
    "XYZ Distributors":  {"avg_delay": 12, "on_time_rate": 0.40, "std": 5},
    "Prime Supplies":    {"avg_delay": 0, "on_time_rate": 0.95, "std": 0},
    "City Logistics":    {"avg_delay": 7, "on_time_rate": 0.55, "std": 3},
    "TechFlow SME":      {"avg_delay": 3, "on_time_rate": 0.78, "std": 2},
    "Innovate Solutions":{"avg_delay": 8, "on_time_rate": 0.60, "std": 4},
    "NextGen Retail":    {"avg_delay": 1, "on_time_rate": 0.92, "std": 1},
    "Market Builders":   {"avg_delay": 6, "on_time_rate": 0.58, "std": 3},
}
DEFAULT_PROFILE = {"avg_delay": 4, "on_time_rate": 0.72, "std": 2}


def _generate_training_data(n_samples: int = 2000) -> Tuple[np.ndarray, np.ndarray]:
    """Generate synthetic SME payment data for training."""
    rng = np.random.default_rng(42)
    X, y = [], []
    vendors = list(VENDOR_PROFILES.keys())
    
    for _ in range(n_samples):
        profile = VENDOR_PROFILES.get(
            vendors[rng.integers(0, len(vendors))], DEFAULT_PROFILE
        )
        hist_delay = max(0, rng.normal(profile["avg_delay"], profile["std"]))
        amount_bucket = rng.integers(0, 3)
        days_until_due = rng.integers(1, 30)
        on_time_rate = profile["on_time_rate"] + rng.normal(0, 0.05)
        on_time_rate = np.clip(on_time_rate, 0.1, 0.99)
        penalty_severity = rng.uniform(0.005, 0.05)
        month = rng.integers(1, 13)
        dow = rng.integers(0, 7)
        
        actual_delay = max(0, (
            0.45 * hist_delay
            + 0.20 * (amount_bucket * 2.5)
            + 0.15 * max(0, 10 - days_until_due) * 0.5
            + 0.12 * (1 - on_time_rate) * 15
            + 0.04 * (1 if month in [3, 3, 12] else 0) * 3  # tax season
            + 0.04 * (1 if dow >= 5 else 0)                  # weekend effect
            + rng.normal(0, 1.5)
        ))
        
        features = [hist_delay, amount_bucket, days_until_due, on_time_rate,
                    penalty_severity, month, dow]
        X.append(features)
        y.append(actual_delay)
    
    return np.array(X), np.array(y)


def _train_or_load_model():
    """Train ensemble model or load cached version."""
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass
    
    if not SKLEARN_AVAILABLE:
        return None
    
    X, y = _generate_training_data(3000)
    
    rf = RandomForestRegressor(
        n_estimators=150, max_depth=8, min_samples_leaf=5,
        random_state=42, n_jobs=-1
    )
    gb = GradientBoostingRegressor(
        n_estimators=150, max_depth=4, learning_rate=0.05,
        subsample=0.8, random_state=42
    )
    
    ensemble = VotingRegressor(
        estimators=[("rf", rf), ("gb", gb)],
        weights=[0.4, 0.6]
    )
    ensemble.fit(X, y)
    
    # Extract feature importances from both
    rf.fit(X, y)
    gb.fit(X, y)
    
    model_data = {
        "ensemble": ensemble,
        "rf": rf,
        "gb": gb,
        "feature_names": FEATURE_NAMES,
        "rf_importances": rf.feature_importances_.tolist(),
        "gb_importances": gb.feature_importances_.tolist(),
        "sklearn_available": True,
    }
    
    try:
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(model_data, f)
    except Exception:
        pass
    
    return model_data


# ─── Initialize model at module load time ────────────────────────────────────
_model_data = _train_or_load_model()


class EnsemblePredictor:
    """
    Glass-Box Ensemble Predictor.
    Returns predictions WITH full feature importance and reasoning chain.
    """

    def __init__(self):
        self.model_data = _model_data
        self.today = date.today()

    def _build_features(self, receivable: Receivable) -> Tuple[List[float], Dict]:
        profile = VENDOR_PROFILES.get(receivable.payer, DEFAULT_PROFILE)
        hist_delay = receivable.historical_delay_factor or profile["avg_delay"]
        days_until_due = max(0, (receivable.expected_date - self.today).days)
        amount_bucket = 0 if receivable.amount < 50_000 else (1 if receivable.amount < 200_000 else 2)
        on_time_rate = profile["on_time_rate"]
        penalty_severity = 0.02  # default
        month = self.today.month
        dow = self.today.weekday()
        
        features = [hist_delay, amount_bucket, days_until_due, on_time_rate,
                    penalty_severity, month, dow]
        feature_dict = dict(zip(FEATURE_NAMES, features))
        return features, feature_dict

    def predict(self, receivable: Receivable) -> Dict:
        features, feature_dict = self._build_features(receivable)
        profile = VENDOR_PROFILES.get(receivable.payer, DEFAULT_PROFILE)

        if self.model_data and self.model_data.get("sklearn_available"):
            # Real ML prediction
            X = np.array([features])
            predicted_delay = max(0, self.model_data["ensemble"].predict(X)[0])
            rf_delay = max(0, self.model_data["rf"].predict(X)[0])
            gb_delay = max(0, self.model_data["gb"].predict(X)[0])
            rf_importances = self.model_data["rf_importances"]
            gb_importances = self.model_data["gb_importances"]
            # Weighted ensemble importances
            importances = [(0.4 * rf + 0.6 * gb) for rf, gb in zip(rf_importances, gb_importances)]
            method = "sklearn_ensemble"
        else:
            # Deterministic fallback
            predicted_delay = (
                0.45 * feature_dict["historical_delay_days"]
                + 0.20 * (feature_dict["amount_bucket"] * 2.5)
                + 0.15 * max(0, 10 - feature_dict["days_until_due"]) * 0.5
                + 0.12 * (1 - feature_dict["on_time_rate"]) * 15
            )
            rf_delay = predicted_delay * 0.95
            gb_delay = predicted_delay * 1.05
            importances = [0.45, 0.20, 0.15, 0.12, 0.04, 0.02, 0.02]
            method = "deterministic_fallback"
        
        predicted_delay_int = max(0, round(predicted_delay))
        
        # Confidence adjustment
        base_conf = receivable.confidence
        conf_adj = (profile["on_time_rate"] - 0.7) * 0.2  # ±0.06 range
        adjusted_confidence = max(0.05, min(0.99, base_conf + conf_adj))
        
        # Glass-box reasoning chain
        fi_pairs = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
        reasoning_chain = []
        for feat, imp in fi_pairs[:4]:
            val = feature_dict.get(feat, 0)
            reasoning_chain.append({
                "feature": feat,
                "value": round(val, 3),
                "importance": round(imp, 3),
                "impact": "high" if imp > 0.3 else "medium" if imp > 0.15 else "low",
                "explanation": _explain_feature(feat, val, imp)
            })
        
        return {
            "receivable_id": receivable.id,
            "payer": receivable.payer,
            "original_date": receivable.expected_date.isoformat(),
            "predicted_date": (receivable.expected_date + timedelta(days=predicted_delay_int)).isoformat(),
            "predicted_delay_days": predicted_delay_int,
            "adjusted_confidence": round(adjusted_confidence, 3),
            "rf_prediction": round(rf_delay, 1),
            "gb_prediction": round(gb_delay, 1),
            "ensemble_prediction": round(predicted_delay, 1),
            "method": method,
            "feature_values": {k: round(v, 3) for k, v in feature_dict.items()},
            "feature_importances": {name: round(imp, 3) for name, imp in zip(FEATURE_NAMES, importances)},
            "reasoning_chain": reasoning_chain,
            "risk_level": "high" if predicted_delay_int > 7 else "medium" if predicted_delay_int > 3 else "low",
        }

    def predict_all(self, receivables: List[Receivable]) -> List[Dict]:
        return [self.predict(r) for r in receivables]

    def get_portfolio_summary(self, receivables: List[Receivable]) -> Dict:
        predictions = self.predict_all(receivables)
        total = sum(r.amount for r in receivables)
        at_risk = sum(
            r.amount for r, p in zip(receivables, predictions)
            if p["predicted_delay_days"] > 5
        )
        avg_delay = sum(p["predicted_delay_days"] for p in predictions) / len(predictions) if predictions else 0
        return {
            "total_receivables": round(total, 2),
            "at_risk_amount": round(at_risk, 2),
            "at_risk_pct": round((at_risk / total * 100) if total else 0, 1),
            "avg_predicted_delay_days": round(avg_delay, 1),
            "predictions": predictions,
            "model_method": predictions[0]["method"] if predictions else "none",
            "feature_importances": predictions[0]["feature_importances"] if predictions else {},
        }


def _explain_feature(feature: str, value: float, importance: float) -> str:
    explanations = {
        "historical_delay_days": f"Vendor historically delays by ~{value:.0f} days",
        "amount_bucket": f"Invoice size category {int(value)} (larger = riskier)",
        "days_until_due": f"Payment due in {value:.0f} days",
        "on_time_rate": f"Vendor pays on time {value*100:.0f}% of the time",
        "penalty_severity": f"Late penalty rate: {value*100:.1f}%/day",
        "month_of_year": f"Month {int(value)} — seasonal payment pressure factor",
        "day_of_week": f"Day {int(value)} of week — timing factor",
    }
    return explanations.get(feature, f"Feature value: {value:.3f}")


# Singleton
_predictor = EnsemblePredictor()

def get_predictor() -> EnsemblePredictor:
    return _predictor
