"""
Baseline Predictor for Yield Forecasting (Phase AI-5).
Implements hierarchical historical median estimation (Crop+State+Season -> Crop+State -> Crop -> Overall).
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

from .config import TYPICAL_YIELD_BENCHMARKS, DEFAULT_GENERIC_BENCHMARK


class AgronomicMedianBaseline:
    """
    Computes hierarchical historical median yield benchmarks.
    Used as an explainable non-ML baseline to benchmark ML models against.
    """

    def __init__(self):
        self.crop_state_season_medians: Dict[tuple, float] = {}
        self.crop_state_medians: Dict[tuple, float] = {}
        self.crop_medians: Dict[str, float] = {}
        self.overall_median: float = 2.0

    def fit(self, df: pd.DataFrame, target_col: str = "Yield"):
        self.overall_median = float(df[target_col].median())

        # Crop medians
        self.crop_medians = df.groupby("Crop")[target_col].median().to_dict()

        # Crop + State medians
        self.crop_state_medians = df.groupby(["Crop", "State"])[target_col].median().to_dict()

        # Crop + State + Season medians
        self.crop_state_season_medians = df.groupby(["Crop", "State", "Season"])[target_col].median().to_dict()

        return self

    def predict_one(self, crop: str, state: str, season: str) -> float:
        # Hierarchy 1: Crop + State + Season
        key_css = (crop, state, season)
        if key_css in self.crop_state_season_medians:
            return float(self.crop_state_season_medians[key_css])

        # Hierarchy 2: Crop + State
        key_cs = (crop, state)
        if key_cs in self.crop_state_medians:
            return float(self.crop_state_medians[key_cs])

        # Hierarchy 3: Crop
        if crop in self.crop_medians:
            return float(self.crop_medians[crop])

        # Hierarchy 4: Agronomic Reference Benchmark
        bench = TYPICAL_YIELD_BENCHMARKS.get(crop, DEFAULT_GENERIC_BENCHMARK)
        return float(bench["median"])

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        preds = []
        for _, row in df.iterrows():
            c = str(row["Crop"])
            s = str(row["State"])
            se = str(row["Season"])
            preds.append(self.predict_one(c, s, se))
        return np.array(preds, dtype=float)
