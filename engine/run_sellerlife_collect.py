"""셀러라이프 상품 데이터 수집 — 신사임당 채널 기반"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# .env 수동 파서 (dotenv가 특정 라인에서 실패하면 나머지 키도 누락되는 문제 회피)
def _load_env_manual():
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

_load_env_manual()

from fetchers.sellerlife import SellerLifeFetcher


def main():
    username = os.getenv("SELLERLIFE_ID")
    password = os.getenv("SELLERLIFE_PW")
    cookies = os.getenv("SELLERLIFE_COOKIES")

    print("=" * 70)
    print("  셀러라이프 상품 수집")
    print("=" * 70)
    print(f"  ID 설정: {'O' if username else 'X'}")
    print(f"  PW 설정: {'O' if password else 'X'}")
    print(f"  쿠키 설정: {'O' if cookies else 'X'}")

    fetcher = SellerLifeFetcher(
        username=username,
        password=password,
        cookies=cookies,
    )

    if not fetcher.logged_in:
        print("\n[실패] 셀러라이프 로그인 실패 — 계정/쿠키 확인 필요")
        sys.exit(1)

    print("\n[성공] 셀러라이프 세션 활성\n")

    # 신사임당 채널 타깃 키워드 (구체 상품명 위주)
    keywords = [
        # 건강/시니어
        "오메가3", "루테인", "홍삼스틱", "유산균", "관절영양제",
        "안마의자", "무릎보호대", "정수기", "치약",
        # 가전/리빙 (45-65+ 남성)
        "무선청소기", "로봇청소기", "공기청정기", "전동칫솔",
        # 식품 (선물 포함)
        "닭가슴살", "올리브오일", "견과류", "한우선물세트",
        # 패션 (중년 남성)
        "남자청바지", "가죽자켓", "경량패딩",
    ]

    print(f"수집 키워드 {len(keywords)}개: {keywords}\n")

    df = fetcher.fetch_by_channel(
        channel_id="shinsaimdang",
        keywords=keywords,
        price_range=(3000, 500000),
        max_pages=2,
    )

    if df.empty:
        print("\n[경고] 수집된 상품 없음 — 파서 구조 확인 필요")
        return

    # 요약 리포트 (인코딩 안전하게 파일로)
    report_path = Path(__file__).parent / "sellerlife_report.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write(f"  셀러라이프 수집 결과 (신사임당)\n")
        f.write("=" * 70 + "\n")
        f.write(f"총 상품: {len(df)}개\n")
        f.write(f"수집 키워드: {len(keywords)}개\n\n")

        f.write("컬럼: " + ", ".join(df.columns.tolist()) + "\n\n")

        # 키워드별 집계
        if "search_keyword" in df.columns:
            f.write("[키워드별 상품 수]\n")
            f.write("-" * 40 + "\n")
            counts = df.groupby("search_keyword").size().sort_values(ascending=False)
            for kw, n in counts.items():
                f.write(f"  {kw:<20} {n:>4}개\n")
            f.write("\n")

        # 마진율 상위
        if "margin_rate" in df.columns:
            f.write("[마진율 TOP 20]\n")
            f.write("-" * 70 + "\n")
            top = df.nlargest(20, "margin_rate")[
                ["name", "wholesale_price", "retail_price", "margin_rate", "search_keyword"]
            ]
            for _, row in top.iterrows():
                name = str(row.get("name", ""))[:35]
                wp = int(row.get("wholesale_price", 0) or 0)
                rp = int(row.get("retail_price", 0) or 0)
                mr = row.get("margin_rate", 0) or 0
                kw = row.get("search_keyword", "")
                f.write(f"  {name:<36} 도매{wp:>7,} 소매{rp:>7,} 마진{mr:>5.1f}% [{kw}]\n")

    print(f"\n[완료] 리포트 저장: {report_path}")
    print(f"  총 {len(df)}개 상품")


if __name__ == "__main__":
    main()
