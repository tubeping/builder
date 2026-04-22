"""
Cafe24 공구 판매 실적 피드백 (사전 판매 예측용)

Supabase orders 테이블에서 과거 공구 성과 데이터를 집계해
카테고리별·가격대별 전환율, 반복구매율, 평균 리뷰를 산출.

사용법:
    from fetchers.cafe24_performance import Cafe24Performance
    perf = Cafe24Performance()
    stats = perf.get_category_stats(days=90)

환경변수:
    NEXT_PUBLIC_SUPABASE_URL    - Supabase 프로젝트 URL
    SUPABASE_SERVICE_ROLE_KEY   - Service role key (READ ONLY 권장)
"""

import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


# 카테고리 매핑 (Cafe24 카테고리 번호 → 표준 카테고리명)
# 42=식품, 46=건강식품, 47=패션/뷰티, 51=디지털/가전, 52=캠핑/여행, 53=생활
CAFE24_CATEGORY_MAP = {
    42: "식품",
    46: "생활/건강",  # 건강식품은 기존 스코어러의 '생활/건강'과 병합
    47: "화장품/미용",
    51: "디지털/가전",
    52: "스포츠/레저",
    53: "가구/인테리어",  # 생활은 편의상 여기로
}


class Cafe24Performance:
    """과거 공구 실적 데이터 집계기 (Supabase READ ONLY)"""

    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        self.url = supabase_url or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        self.key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.client: Optional[Client] = None
        if SUPABASE_AVAILABLE and self.url and self.key:
            self.client = create_client(self.url, self.key)

    @property
    def is_available(self) -> bool:
        return self.client is not None

    # ── 카테고리별 통계 ────────────────────────────────────────────

    def get_category_stats(self, days: int = 90) -> dict:
        """
        최근 N일 주문을 카테고리별로 집계.

        Returns:
            {
              "식품": {
                "order_count": 342,
                "unique_buyers": 298,
                "total_gmv": 12450000,
                "avg_order_value": 36403,
                "repeat_rate": 0.14,
                "product_count": 18,
                "top_products": [...],
              },
              ...
            }
        """
        if not self.is_available:
            return {}

        since = (datetime.now() - timedelta(days=days)).isoformat()

        # admin 소유 orders 테이블 READ ONLY 조회
        # 조인: orders → products (category 정보)
        resp = (
            self.client.table("orders")
            .select("id, cafe24_product_no, product_id, order_amount, quantity, buyer_email, order_date, product_name")
            .gte("order_date", since)
            .not_.is_("product_id", "null")
            .execute()
        )
        orders = resp.data or []
        if not orders:
            return {}

        # 카테고리 정보는 products 테이블에서 조회
        product_ids = list({o["product_id"] for o in orders if o.get("product_id")})
        products_resp = (
            self.client.table("products")
            .select("id, category, product_name, price")
            .in_("id", product_ids)
            .execute()
        )
        products_map = {p["id"]: p for p in (products_resp.data or [])}

        # 카테고리별 집계
        stats: dict = {}
        for o in orders:
            pid = o.get("product_id")
            p = products_map.get(pid, {})
            cat = (p.get("category") or "기타").strip() or "기타"

            if cat not in stats:
                stats[cat] = {
                    "order_count": 0,
                    "total_gmv": 0,
                    "buyers": set(),
                    "products": {},  # product_id → {name, count, gmv}
                }
            s = stats[cat]
            s["order_count"] += 1
            s["total_gmv"] += float(o.get("order_amount") or 0)
            if o.get("buyer_email"):
                s["buyers"].add(o["buyer_email"])

            pn = p.get("product_name") or o.get("product_name") or "기타"
            if pid not in s["products"]:
                s["products"][pid] = {"name": pn, "count": 0, "gmv": 0}
            s["products"][pid]["count"] += int(o.get("quantity") or 0)
            s["products"][pid]["gmv"] += float(o.get("order_amount") or 0)

        # 최종 정리
        result = {}
        for cat, s in stats.items():
            # 반복구매율: 주문수/유니크구매자수 > 1이면 재구매 발생
            unique_buyers = len(s["buyers"])
            repeat_rate = (
                (s["order_count"] - unique_buyers) / s["order_count"]
                if s["order_count"] > 0 else 0
            )
            top_products = sorted(
                s["products"].values(), key=lambda x: -x["gmv"]
            )[:5]

            result[cat] = {
                "order_count": s["order_count"],
                "unique_buyers": unique_buyers,
                "total_gmv": int(s["total_gmv"]),
                "avg_order_value": int(s["total_gmv"] / s["order_count"]) if s["order_count"] else 0,
                "repeat_rate": round(repeat_rate, 3),
                "product_count": len(s["products"]),
                "top_products": top_products,
            }

        return result

    # ── 카테고리 성과 점수 (0-100) ─────────────────────────────────

    def compute_performance_score(self, category: str, days: int = 90) -> float:
        """
        카테고리의 과거 공구 성과를 0-100으로 정규화.

        공식:
          total_gmv (50%)        — 매출 규모 (로그 정규화)
          repeat_rate (30%)      — 재구매율
          order_count (20%)      — 거래 횟수

        Returns:
            float: 0~100 점수 (데이터 없으면 50 중립값)
        """
        stats = self.get_category_stats(days=days)
        s = stats.get(category)
        if not s:
            return 50.0  # 중립

        import math

        # GMV: 로그 스케일 (1억 = 만점)
        gmv_score = min(100, math.log10(max(s["total_gmv"], 1)) / 8 * 100)

        # 재구매율: 0.2 = 만점
        repeat_score = min(100, s["repeat_rate"] / 0.2 * 100)

        # 거래 횟수: 500 = 만점
        order_score = min(100, s["order_count"] / 500 * 100)

        final = gmv_score * 0.5 + repeat_score * 0.3 + order_score * 0.2
        return round(final, 2)

    # ── 가격대별 전환율 ────────────────────────────────────────────

    def get_price_bucket_stats(self, days: int = 90) -> dict:
        """
        가격대별 주문 건수·GMV 집계.

        Returns:
            {
              "0-10000": {count: 43, gmv: 322000},
              "10000-30000": {count: 298, gmv: 5960000},
              ...
            }
        """
        stats = self.get_category_stats(days=days)
        buckets = {
            "0-10000": {"count": 0, "gmv": 0},
            "10000-30000": {"count": 0, "gmv": 0},
            "30000-50000": {"count": 0, "gmv": 0},
            "50000-100000": {"count": 0, "gmv": 0},
            "100000+": {"count": 0, "gmv": 0},
        }
        for cat_stats in stats.values():
            for p in cat_stats.get("top_products", []):
                unit_price = p["gmv"] / p["count"] if p["count"] > 0 else 0
                bucket = self._price_bucket(unit_price)
                buckets[bucket]["count"] += p["count"]
                buckets[bucket]["gmv"] += p["gmv"]
        return buckets

    @staticmethod
    def _price_bucket(price: float) -> str:
        if price < 10000:
            return "0-10000"
        if price < 30000:
            return "10000-30000"
        if price < 50000:
            return "30000-50000"
        if price < 100000:
            return "50000-100000"
        return "100000+"


# ── 스탠드얼론 실행 (디버깅용) ───────────────────────────────────

if __name__ == "__main__":
    import json
    perf = Cafe24Performance()
    if not perf.is_available:
        print("Supabase 연결 불가 — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인")
        exit(1)
    stats = perf.get_category_stats(days=90)
    print(json.dumps(stats, ensure_ascii=False, indent=2, default=list))
    print("\n카테고리별 성과 점수 (0~100):")
    for cat in stats:
        print(f"  {cat}: {perf.compute_performance_score(cat)}")
