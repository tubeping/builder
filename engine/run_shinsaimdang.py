"""신사임당 채널 추천 실행 스크립트"""
import sys
from pathlib import Path

# engine 디렉토리를 path에 추가
sys.path.insert(0, str(Path(__file__).parent))

try:
    from dotenv import load_dotenv
    # 상위 디렉토리의 .env (c:/tubeping-sourcing/.env)
    load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")
except ImportError:
    pass

from analyzer.scorer import ProductScorer
from analyzer.recommend_scorer import RecommendScorer


def main():
    # 채널 로드
    scorer = ProductScorer()
    all_channels = scorer.get_all_channels()
    channel = next((ch for ch in all_channels if ch.get("name") == "신사임당"), None)

    if not channel:
        print("[오류] 신사임당 채널을 channels.yaml에서 찾을 수 없습니다.")
        print(f"등록된 채널: {[ch.get('name') for ch in all_channels]}")
        sys.exit(1)

    print("=" * 70)
    print(f"  채널: {channel['name']} (구독자 {channel.get('subscriber', 0):,}명)")
    print("=" * 70)
    print(f"  연령: {channel.get('age')}")
    print(f"  성별: {channel.get('gender')}")
    print(f"  관심사: {channel.get('interests')}")
    print(f"  카테고리: {channel.get('categories')}")
    print()

    # 추천 스코어링 실행
    recommender = RecommendScorer()

    # 신사임당 시청자 특성 기반 힌트
    video_titles = [
        "50대 은퇴 후 월 500 버는 법",
        "부동산 폭락 시작됐다",
        "주식 투자 30년 한 투자자 인터뷰",
        "연금 100% 활용법",
        "노후 대비 건강관리의 중요성",
    ]
    purchase_signals = [
        "추천 부탁드립니다", "어디서 사나요", "구매 링크",
        "가격이 얼마인가요", "좋아 보이네요",
    ]
    trend_keywords = ["재테크", "건강", "은퇴", "노후", "선물"]

    # 전체 카테고리 스캔 (도서·여가·면세점 제외 — 블랙리스트에서 자동 필터)
    all_category_ids = [
        "50000000",  # 패션의류
        "50000001",  # 패션잡화
        "50000002",  # 화장품/미용
        "50000003",  # 디지털/가전
        "50000004",  # 가구/인테리어
        "50000005",  # 출산/육아
        "50000006",  # 식품
        "50000007",  # 스포츠/레저
        "50000008",  # 생활/건강
    ]

    try:
        results = recommender.score_by_category(
            channel_config=channel,
            video_titles=video_titles,
            purchase_signals=purchase_signals,
            trend_keywords=trend_keywords,
            category_ids=all_category_ids,
            top_n_per_category=8,
        )
    except Exception as e:
        print(f"[오류] 스코어링 실행 실패: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if not results:
        print("[경고] 추천 결과 없음 - API 호출 실패 또는 데이터 부족")
        return

    # 결과를 파일로 저장 (cp949 문제 회피)
    output_path = Path(__file__).parent / "shinsaimdang_result.txt"
    CATEGORY_EMOJI = {
        "패션의류": "[패션]", "패션잡화": "[잡화]", "화장품/미용": "[뷰티]",
        "디지털/가전": "[가전]", "가구/인테리어": "[가구]", "출산/육아": "[육아]",
        "식품": "[식품]", "스포츠/레저": "[스포츠]", "생활/건강": "[건강]",
        "여가/생활편의": "[여가]", "도서": "[도서]", "면세점": "[면세]",
    }
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write(f"  신사임당 채널 맞춤 추천 상품\n")
        f.write(f"  구독자: {channel.get('subscriber', 0):,}명\n")
        f.write(f"  연령(실측): 40대 9.6% / 50대 26.1% / 55-64세 33.9% / 65+ 26.2%\n")
        f.write(f"  성별: 남성 75.9% / 여성 24.0%\n")
        f.write("=" * 70 + "\n")

        for cat_name, df in results.items():
            tag = CATEGORY_EMOJI.get(cat_name, "[기타]")
            f.write(f"\n{tag} {cat_name} (TOP {len(df)})\n")
            f.write("-" * 70 + "\n")
            f.write(f"{'순위':>4}  {'별점':<6} {'점수':>6}  {'키워드':<20} {'검색량':>10} {'클릭':>8} {'CTR':>5}\n")

            for i, (_, row) in enumerate(df.iterrows(), 1):
                kw = str(row.get("keyword", ""))[:19]
                stars = row.get("stars_display", "") or ""
                score = row.get("recommend_score", 0)
                vol = int(row.get("search_volume_1m", row.get("monthly_total", 0)) or 0)
                clicks = int(row.get("monthly_total_clicks", 0) or 0)
                ctr = row.get("click_rate", 0) or 0
                f.write(f"{i:>4}  {stars:<6} {score:>6.1f}  {kw:<20} {vol:>10,} {clicks:>8,} {ctr:>5.1f}\n")

        f.write("\n" + "=" * 70 + "\n")
        f.write(f"  카테고리 {len(results)}개 · 총 키워드 {sum(len(df) for df in results.values())}개\n")
        f.write("=" * 70 + "\n")

    print(f"\n[완료] 결과 저장: {output_path}")
    print(f"  카테고리 {len(results)}개 · 총 키워드 {sum(len(df) for df in results.values())}개")


if __name__ == "__main__":
    main()
