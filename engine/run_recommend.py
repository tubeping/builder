"""
채널별 추천 엔진 실행 + JSON 출력

추천 결과를 tubeping_builder/public/recommendations/{채널}.json 으로 저장.
프론트(ProductRecommend.tsx)가 이 JSON을 fetch해서 표시.

사용법:
    python engine/run_recommend.py 신사임당
    python engine/run_recommend.py 신사임당 뉴스엔진
    python engine/run_recommend.py --all
"""
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

# .env 수동 파서 (dotenv 파싱 실패 시 대비)
import os
def _load_env():
    env_path = Path(__file__).parent.parent.parent / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            try:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
            except ValueError:
                continue
_load_env()

from analyzer.scorer import ProductScorer
from analyzer.recommend_scorer import RecommendScorer
from fetchers.youtube import YouTubeFetcher

# 댓글/설명에서 구매 시그널 추출할 때 쓰는 마커 (포괄적 패턴)
PURCHASE_SIGNAL_MARKERS = [
    "추천", "구매", "어디서", "링크", "가격", "얼마", "사고 싶", "사려고",
    "사야겠", "부탁", "주문", "정보", "어떻게 사", "파나요", "팔아",
    "공구", "공동구매", "싸게", "할인", "세일",
]


def _extract_purchase_signals(comments: list[dict], top_n: int = 30) -> list[str]:
    """
    댓글에서 구매 시그널 추출.
    - 마커 키워드 포함 & likes 많은 상위 댓글 선별
    - 너무 긴 댓글은 마커 주변 50자만 추출
    """
    if not comments:
        return []

    signals = []
    for c in comments:
        text = (c.get("text") or "").strip()
        if not text or len(text) < 5:
            continue
        lower = text.lower()
        # 마커 히트 카운트 (많을수록 강한 시그널)
        hits = sum(1 for m in PURCHASE_SIGNAL_MARKERS if m in lower)
        if hits == 0:
            continue
        likes = int(c.get("like_count", 0) or 0)
        signals.append({
            "text": text[:100] if len(text) > 100 else text,
            "score": hits * 10 + likes,
        })

    # 상위 정렬 후 텍스트만 추출 (중복 제거)
    signals.sort(key=lambda x: -x["score"])
    seen = set()
    result = []
    for s in signals:
        key = s["text"][:30]  # 짧은 prefix로 dedup
        if key in seen:
            continue
        seen.add(key)
        result.append(s["text"])
        if len(result) >= top_n:
            break
    return result


def _collect_youtube_data(channel_name: str, video_count: int = 20) -> dict:
    """
    채널명으로 YouTube API 조회 → video_titles + purchase_signals 추출.
    API 키 없거나 실패 시 빈 dict 반환.
    """
    api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not api_key:
        print(f"  [youtube] YOUTUBE_API_KEY 없음 — 하드코딩 힌트 사용")
        return {}

    try:
        yt = YouTubeFetcher(api_key=api_key)
        print(f"  [youtube] '{channel_name}' 실시간 수집 중...")
        result = yt.analyze_channel(
            channel_name,
            video_count=video_count,
            comments_per_video=30,
        )
        if not result:
            print(f"  [youtube] 채널 조회 실패 — 폴백")
            return {}

        videos = result.get("videos", [])
        comments = result.get("comments", [])
        channel = result.get("channel", {})
        stats = result.get("stats", {})

        # 영상 제목 추출 (최신 N개)
        video_titles = [v["title"] for v in videos if v.get("title")][:video_count]

        # 구매 시그널 추출
        purchase_signals = _extract_purchase_signals(comments, top_n=30)

        # 트렌드 키워드: 영상 태그에서 상위 빈도
        tag_counter: dict[str, int] = {}
        for v in videos:
            for tag in v.get("tags", []) or []:
                tag_counter[tag] = tag_counter.get(tag, 0) + 1
        trend_keywords = [t for t, _ in sorted(tag_counter.items(), key=lambda x: -x[1])[:15]]

        print(
            f"  [youtube] 영상 {len(video_titles)}개, 댓글 {len(comments)}개, "
            f"구매시그널 {len(purchase_signals)}개, 태그 {len(trend_keywords)}개 수집"
        )

        return {
            "video_titles": video_titles,
            "purchase_signals": purchase_signals,
            "trend_keywords": trend_keywords,
            "channel_info": {
                "channel_id": channel.get("channel_id", ""),
                "subscriber": channel.get("subscriber", 0),
                "avg_views": stats.get("avg_views", 0),
                "engagement_rate": stats.get("engagement_rate", 0),
                "top_video_title": (stats.get("top_video") or {}).get("title", ""),
            },
        }
    except Exception as e:
        print(f"  [youtube] 수집 실패: {type(e).__name__}: {e}")
        return {}

ROOT = Path(__file__).parent.parent
OUTPUT_DIR = ROOT / "public" / "recommendations"

# 카테고리별 이모지 (UI용)
CATEGORY_EMOJI = {
    "패션의류": "👗", "패션잡화": "👜", "화장품/미용": "💄",
    "디지털/가전": "📱", "가구/인테리어": "🛋️", "출산/육아": "👶",
    "식품": "🍎", "스포츠/레저": "⚽", "생활/건강": "💊",
}

# 모든 1차 카테고리 (블랙리스트 제외)
ALL_CATEGORY_IDS = [
    "50000000", "50000001", "50000002", "50000003", "50000004",
    "50000005", "50000006", "50000007", "50000008",
]


def _estimate_shopping_insights(channel_config: dict, recommendations: dict) -> dict:
    """쇼핑 관점 추가 분석: 예상 성과, 카테고리 적합도, 페르소나 한 줄 요약"""
    age = channel_config.get("age", {}) or {}
    gender = channel_config.get("gender", {}) or {}
    device = channel_config.get("device", {}) or {}
    interests = channel_config.get("interests", []) or []
    subs = channel_config.get("subscriber", 0) or 0

    # ── 연령 세그먼트 비율 ──
    def _age_bucket_sum(keys):
        return sum(float(v) for k, v in age.items() if any(kk in str(k) for kk in keys))
    senior_pct = _age_bucket_sum(["50", "55", "60", "65"])
    middle_pct = _age_bucket_sum(["30", "40"])
    young_pct = _age_bucket_sum(["10", "20"])
    male_pct = float(gender.get("남성", 50))
    female_pct = float(gender.get("여성", 50))
    tv_pct = float(device.get("TV", 0))
    mobile_pct = float(device.get("모바일", 0))

    # ── 1. 영상당 예상 공구 성과 ──
    avg_views_est = channel_config.get("avg_views") or int(subs * 0.05)  # 기본 구독자의 5%

    # 전환율 대역 (연령·기기 기반 0.4~2.0%)
    conv_low = 0.005
    conv_high = 0.015
    if senior_pct >= 50:
        conv_high = 0.018  # 시니어는 구매결정 확실
    if tv_pct >= 10:
        conv_low += 0.001  # TV 시청자는 신뢰도 높음

    # 객단가 대역 (연령·성별)
    if senior_pct >= 50:
        aov_low, aov_high = 30000, 80000
    elif middle_pct >= 50:
        aov_low, aov_high = 25000, 60000
    else:
        aov_low, aov_high = 15000, 40000
    # 남성 우세 채널은 고단가 상품 수용도 ↑ (자산·기기·프리미엄)
    if male_pct >= 70:
        aov_high = int(aov_high * 1.3)

    rev_low = int(avg_views_est * conv_low * aov_low)
    rev_high = int(avg_views_est * conv_high * aov_high)

    expected_performance = {
        "avgViewsEst": avg_views_est,
        "avgViewsSource": "실측" if channel_config.get("avg_views") else "구독자 기반 추정(5%)",
        "conversionLow": conv_low,
        "conversionHigh": conv_high,
        "aovLow": aov_low,
        "aovHigh": aov_high,
        "revenueLow": rev_low,
        "revenueHigh": rev_high,
    }

    # ── 2. 카테고리 적합도 점수 (recommend_score 평균 → 0~100 정규화) ──
    category_fit = {}
    for cat_name, block in recommendations.items():
        items = block.get("items", [])
        if not items:
            category_fit[cat_name] = 0
            continue
        avg_score = sum(it.get("score", 0) for it in items) / len(items)
        # recommend_score는 보통 25-55 범위 → 약 ×1.8 스케일로 100점 환산 (cap)
        fit = min(100, max(0, round(avg_score * 1.8, 1)))
        category_fit[cat_name] = fit

    # ── 3. 쇼핑 페르소나 한 줄 요약 (룰베이스) ──
    # 연령
    if senior_pct >= 60:
        age_desc = "45-65세+"
    elif senior_pct >= 40:
        age_desc = "40-60대"
    elif middle_pct >= 50:
        age_desc = "30-50대"
    elif young_pct >= 50:
        age_desc = "20-30대"
    else:
        age_desc = "다연령"
    # 성별
    if male_pct >= 65:
        gender_desc = "남성"
    elif female_pct >= 65:
        gender_desc = "여성"
    else:
        gender_desc = "남녀 고루"
    # 기기
    if tv_pct >= 10:
        device_desc = "TV 병행 시청"
    elif mobile_pct >= 80:
        device_desc = "모바일 중심"
    else:
        device_desc = ""
    # 객단가 레이블
    aov_desc = f"객단가 {aov_low//10000}-{aov_high//10000}만원대"
    # 관심사
    interest_desc = "·".join(interests[:3]) + " 관심" if interests else ""

    parts = [f"{age_desc} {gender_desc}"]
    if interest_desc:
        parts.append(interest_desc)
    if device_desc:
        parts.append(device_desc)
    parts.append(aov_desc)
    # 프리미엄 수용도 태그
    if male_pct >= 70 and senior_pct >= 40:
        parts.append("검증된 프리미엄 선호")
    persona_summary = ", ".join(parts)

    return {
        "expectedPerformance": expected_performance,
        "categoryFitScores": category_fit,
        "personaSummary": persona_summary,
    }


def build_recommendations(channel_config: dict) -> dict:
    """채널 config 받아서 추천 결과 JSON 구조 생성"""
    recommender = RecommendScorer()

    # 채널 힌트 (영상 제목, 구매 시그널, 트렌드 키워드)
    video_titles = channel_config.get("video_titles", [])
    purchase_signals = channel_config.get("purchase_signals", [])
    trend_keywords = channel_config.get("trend_keywords", [])

    results = recommender.score_by_category(
        channel_config=channel_config,
        video_titles=video_titles,
        purchase_signals=purchase_signals,
        trend_keywords=trend_keywords,
        category_ids=ALL_CATEGORY_IDS,
        top_n_per_category=15,
    )

    # JSON 직렬화 가능한 구조로 변환
    recommendations = {}
    for cat_name, df in results.items():
        items = []
        for i, (_, row) in enumerate(df.iterrows(), 1):
            items.append({
                "rank": i,
                "keyword": str(row.get("keyword", "")),
                "stars": float(row.get("stars", 0) or 0),
                "starsDisplay": str(row.get("stars_display", "")),
                "score": float(row.get("recommend_score", 0) or 0),
                "searchVolume": int(row.get("search_volume_1m", row.get("monthly_total", 0)) or 0),
                "clicks": int(row.get("monthly_total_clicks", 0) or 0),
                "ctr": float(row.get("click_rate", 0) or 0),
                "isShopping": str(row.get("is_shopping", "")).upper() == "O",
                "contentScore": float(row.get("content_score", 0) or 0),
                "purchaseScore": float(row.get("purchase_score", 0) or 0),
                "demandScore": float(row.get("demand_score", 0) or 0),
                "trendScore": float(row.get("trend_score", 0) or 0),
                "audienceScore": float(row.get("audience_score", 0) or 0),
                "cafe24Score": float(row.get("cafe24_score", 0) or 0),
            })
        recommendations[cat_name] = {
            "emoji": CATEGORY_EMOJI.get(cat_name, "📦"),
            "items": items,
        }

    # 페르소나 요약
    age = channel_config.get("age", {})
    gender = channel_config.get("gender", {})

    # core demo 추출 (최다 연령)
    sorted_age = sorted(age.items(), key=lambda x: -x[1]) if age else []
    core_age = sorted_age[0][0] if sorted_age else ""
    core_gender = "남성" if gender.get("남성", 0) >= gender.get("여성", 0) else "여성"

    # tier 결정
    subs = channel_config.get("subscriber", 0)
    if subs >= 1_000_000:
        tier = "메가"
    elif subs >= 100_000:
        tier = "매크로"
    elif subs >= 10_000:
        tier = "마이크로"
    else:
        tier = "나노"

    shopping_insights = _estimate_shopping_insights(channel_config, recommendations)

    # Cafe24 과거 공구 실적 (사전 판매 예측용)
    cafe24_stats = {}
    try:
        cafe24_stats = recommender.get_cafe24_stats() or {}
        # 집합형(buyers set)을 JSON 직렬화 가능하게 정제
        for cat, s in cafe24_stats.items():
            if "buyers" in s:
                s.pop("buyers", None)
    except Exception:
        pass

    yt_meta = channel_config.get("_youtube_meta", {}) or {}

    return {
        "channel": channel_config.get("name", ""),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "persona": {
            "subscribers": subs,
            "tier": tier,
            "coreDemo": f"{core_age} {core_gender}" if core_age else "",
            "age": [{"label": k, "pct": float(v)} for k, v in age.items()],
            "gender": {
                "female": float(gender.get("여성", 0)),
                "male": float(gender.get("남성", 0)),
            },
            "device": channel_config.get("device", {}),
            "interests": channel_config.get("interests", []),
            "categories": channel_config.get("categories", []),
        },
        "youtubeMeta": {
            "channelId": yt_meta.get("channel_id", ""),
            "subscriber": yt_meta.get("subscriber", 0),
            "avgViews": yt_meta.get("avg_views", 0),
            "engagementRate": yt_meta.get("engagement_rate", 0),
            "topVideoTitle": yt_meta.get("top_video_title", ""),
            "videoTitlesSampled": channel_config.get("video_titles", [])[:5],
            "signalsCollected": len(channel_config.get("purchase_signals", [])),
            "trendTagsCollected": len(channel_config.get("trend_keywords", [])),
        },
        "shoppingInsights": shopping_insights,
        "cafe24Performance": cafe24_stats,
        "recommendations": recommendations,
        "weights": RecommendScorer.WEIGHTS,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("channels", nargs="*", help="채널 이름 (예: 신사임당 뉴스엔진)")
    parser.add_argument("--all", action="store_true", help="channels.yaml의 모든 채널 실행")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    scorer = ProductScorer()
    all_channels = scorer.get_all_channels()

    if args.all:
        targets = all_channels
    elif args.channels:
        targets = [ch for ch in all_channels if ch.get("name") in args.channels]
        if not targets:
            print(f"[오류] 채널 없음: {args.channels}")
            print(f"등록된 채널: {[c.get('name') for c in all_channels]}")
            sys.exit(1)
    else:
        print("사용법: python run_recommend.py <채널명> [채널명...]  또는  --all")
        sys.exit(1)

    for ch in targets:
        name = ch.get("name")
        print(f"\n[{name}] 추천 생성 중...")

        # ① 유튜브 실시간 수집 (영상제목/댓글/태그) — 성공 시 하드코딩 덮어씀
        yt_data = _collect_youtube_data(name, video_count=20)
        if yt_data:
            ch["video_titles"] = yt_data.get("video_titles", [])
            ch["purchase_signals"] = yt_data.get("purchase_signals", [])
            # trend_keywords는 YouTube 태그 + 채널별 힌트 병합
            yt_trends = yt_data.get("trend_keywords", [])
            ch["trend_keywords"] = yt_trends
            ch["_youtube_meta"] = yt_data.get("channel_info", {})

        # ② 폴백: YouTube 실패하거나 결과 없으면 하드코딩된 힌트 사용
        if not ch.get("video_titles"):
            if name == "신사임당":
                ch["video_titles"] = [
                    "50대 은퇴 후 월 500 버는 법", "부동산 폭락 시작됐다",
                    "주식 투자 30년 한 투자자 인터뷰", "연금 100% 활용법",
                    "노후 대비 건강관리의 중요성",
                ]
                ch["purchase_signals"] = [
                    "추천 부탁드립니다", "어디서 사나요", "구매 링크",
                    "가격이 얼마인가요", "좋아 보이네요",
                ]
                ch["trend_keywords"] = ["재테크", "건강", "은퇴", "노후", "선물"]
            elif name == "뉴스엔진":
                ch["video_titles"] = ["오늘의 뉴스", "정치 이슈 분석"]
                ch["purchase_signals"] = ["추천해 주세요", "어디서 구매"]
                ch["trend_keywords"] = ["시사", "건강", "트로트"]

        try:
            result = build_recommendations(ch)
        except Exception as e:
            print(f"  [실패] {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            continue

        # JSON 저장 (파일명은 채널명)
        out_path = OUTPUT_DIR / f"{name}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        total_kw = sum(len(cat["items"]) for cat in result["recommendations"].values())
        print(f"  [완료] {out_path}")
        print(f"  카테고리 {len(result['recommendations'])}개 / 키워드 {total_kw}개")


if __name__ == "__main__":
    main()
