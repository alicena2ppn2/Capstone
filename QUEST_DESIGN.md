# 퀘스트 설계 근거와 반영 예시

MOCHI의 퀘스트를 "그럴듯한 할 일"이 아니라 **검증된 심리학 개입 방법을 게임으로 옮긴 것**으로 설계하기 위한 문서.
작성: 2026-10-08 · 앱 전체 근거(활동량·고립과 우울)는 [APP_INTRO.md](APP_INTRO.md)

> 아래 연구는 퀘스트를 설계하는 **근거**이며, MOCHI 자체의 효과를 증명하지는 않습니다. MOCHI는 진단·치료 앱이 아닙니다.

---

## 1. 퀘스트 전체 틀

| 근거 | 내용 | MOCHI에 쓰는 방법 |
|---|---|---|
| **행동 활성화** (Behavioral Activation) — Ekers 외 2014, *PLoS ONE* · 무작위 대조 시험 26편, 1,524명 | 우울할 때 **즐거움·성취감을 주는 작은 활동을 계획해 실행**하게 하는 치료. 대조군보다 우울 증상을 크게 줄임(효과 크기 0.74), 약물보다도 나음 | 퀘스트의 기본 원리. **작은 활동 고르기 → 하기 → 기분 기록**. 쉬운 것부터 어려운 것으로 올리는 "단계적 과제"가 핵심 |
| **웰빙을 위한 5가지 행동** (Five Ways to Wellbeing) — 영국 정부 Foresight 프로젝트, New Economics Foundation 2008 | 근거 기반 5가지 행동: **연결하기 · 움직이기 · 주의 기울이기 · 배우기 · 베풀기**. 영국 NHS 등에서 사용 | **퀘스트 분류**를 이 5가지로 → "공인된 틀을 따랐다"고 설명 가능 |
| **히키코모리 지원 단계** — 일본 후생노동성 지침 2010 | 지원을 **가족 지원 → 개인 지원 → 집단 활동 → 사회 참여** 순서로 | **단계 사다리**: 혼자 → 한 명 → 여럿 → 지역 사회 |

## 2. 개별 퀘스트를 뒷받침하는 근거

| 퀘스트 종류 | 근거 | 결과 |
|---|---|---|
| 짧은 인사, 가게 직원과 한마디 | Sandstrom·Dunn 2014, *Personality and Social Psychology Bulletin* | 친한 사람뿐 아니라 **얼굴만 아는 사람(약한 연결)과의 짧은 교류가 많은 날** 더 행복하고 소속감이 큼 |
| 낯선 사람에게 말 걸기 | Epley·Schroeder 2014, *Journal of Experimental Psychology: General* | 사람들은 말 걸기가 불편할 거라 예상했지만 **실제로 말을 건 쪽이 더 즐거웠음** (지하철·버스 실험) |
| 고마움 전하기, 작은 친절 | Curry 외 2018, *Journal of Experimental Social Psychology* · 27개 연구, 4,045명 | **친절한 행동을 하면 하는 사람의 행복감이 높아짐** (작은~중간 효과), 나이·성별과 무관 |
| "언제·어디서 할지" 정하기 | Gollwitzer·Sheeran 2006, *Advances in Experimental Social Psychology* · 94개 연구, 8,000여 명 | "**~하면, ~하겠다**"처럼 미리 계획하면 목표 달성이 크게 늘어남 (효과 크기 0.65) |
| 외로움 줄이기 | Masi 외 2011, *Personality and Social Psychology Review* · 외로움 개입 메타분석 | 네 가지 방법(사회 기술·지지·만남 기회·생각 바꾸기) 중 무작위 연구에서 **"남들이 나를 싫어할 거야" 같은 생각을 다루는 개입이 가장 효과적** |
| 걷기·밖에 나가기 | Pearce 2022, Bizzozero-Peroni 2024, White 2019 (→ APP_INTRO) | 거의 안 움직이던 사람의 작은 증가가 가장 효과적, 하루 1,000보만 늘어도 효과, 자연에서 주 120분 |

## 3. 반영 방법 5가지

### ① 분류를 "웰빙 5가지 행동"으로

| 분류 | 의미 | 퀘스트 예시 | 확인 방법 |
|---|---|---|---|
| **연결하기** | 사람과 이어지기 | 이웃 방 놀러 가기, 방명록 남기기, 짧은 인사, 안부 보내기 | 방문·방명록 기록, (가벼운 것은) 스스로 체크 |
| **움직이기** | 몸을 움직이고 밖에 나가기 | 문밖 한 걸음, 내 만큼 걷기(1·5·10분), 평소보다 1,000보 더 | 걸음 수 |
| **주의 기울이기** | 지금 여기를 알아차리기 | 오늘 하늘 찍기, 계절 풍경 찾기, 창밖 풍경, 하루 기록 한 줄 | 오늘 찍은 사진, 일기 |
| **배우기** | 새로운 것 해 보기 | 동네 맛집·전시 찾아보기, 안 가 본 길 걷기, 새 레시피 해 보기 | 직접 찾아 적기, 사진 |
| **베풀기** | 누군가에게 작은 도움 | 고마움 전하기, 이웃 글에 응원 남기기, 가족에게 작은 도움 | 방명록·응원 기록, 스스로 체크 |

지금 앱의 3분류와 대응: 준비 → 주의 기울이기·배우기 · 외출 → 움직이기 · 교류 → 연결하기·베풀기

### ② 행동 활성화처럼 "하고 나서 기분 한 줄"

```text
퀘스트 완료 → "해 보니 어땠어?"  😣 1  2  3  4  5 😊   (건너뛰기 가능)
```

- 사용자: "움직이면 조금 나아진다"를 스스로 느낌 (행동 활성화의 핵심)
- 우리: 퀘스트별 효과 데이터 → 어떤 퀘스트가 실제로 기분을 올리는지 알 수 있음
- 진단 점수처럼 보이지 않게, 이모지 하나로 가볍게

### ③ "언제 할지" 고르게 하기 (실행 의도)

```text
퀘스트 고를 때:  "언제 해 볼까?"  [ 아침에 ]  [ 점심 먹고 ]  [ 저녁 전에 ]
→ 그 시간에 캐릭터가 "점심 먹었으면 잠깐 나가 볼까?" 알림
```

- "~하면 ~하겠다" 계획이 실행률을 높인다는 근거(Gollwitzer·Sheeran 2006)를 그대로 적용
- 알림은 하루 한 번 이내, 끌 수 있게

### ④ 단계 사다리 (혼자 → 한 명 → 여럿 → 지역)

| 단계 | 연결하기 | 움직이기 |
|---|---|---|
| 1. 혼자 | 이웃 방 구경, 방명록 읽기 | 문밖 한 걸음, 창문 열기 |
| 2. 한 명 | 방명록 남기기, 눈인사·짧은 인사 | 집 앞 5분, 편의점 다녀오기 |
| 3. 여럿 | 관심사 질문 남기기, 받은 글에 답하기 | 공원·도서관·카페 가 보기 |
| 4. 지역 | 원데이 클래스·도서관 프로그램 찾아 신청, 지역 청년센터 프로그램 | 새로운 장소, 정기 모임 참여 |

- 아래 단계 퀘스트를 몇 번 해내면 다음 단계가 열림. **내려가는 일은 없음** (벌점 없음)
- 4단계는 공공 지원(서울청년기지개센터 등)으로 이어지는 다리 역할

### ⑤ "예상보다 괜찮았어" 기록 (생각 바꾸기)

```text
인사·대화 퀘스트 전:  "얼마나 어색할 것 같아?"  1 ─── 5
퀘스트 후:            "실제로는?"                1 ─── 5
→ 쌓이면: "지난 3번, 생각보다 덜 어색했어요" 캐릭터가 알려 줌
```

- 말 걸기는 예상보다 즐겁다는 연구(Epley·Schroeder 2014)를 사용자가 직접 경험하게 함
- 외로움 개입에서 가장 효과적이었던 **"생각 바꾸기"**(Masi 외 2011)를 게임 안에서 자연스럽게

### ⑥ 주간 미션: 자연 속 산책 (서버 구현됨)

```text
이번 주 자연 속 산책 2번   ●○  1/2
  공원·산책로·하천 사진을 서로 다른 날 2번 → 100코인 · 200XP
```

- 근거: 자연에서 **일주일 120분** 이상이면 건강·행복감이 좋고, **짧게 여러 번이어도** 효과 (White 2019)
- 하루 한 번만 셈, 오늘 찍은 사진만 인정. 매일 미션보다 보상을 크게 (확인되는 행동 + 한 주 노력)

## 4. 보상 원칙

| 퀘스트 | 보상 | 이유 |
|---|---|---|
| **밖에 나가는 미션** (사진·걸음) | 가장 크게 — **50코인** (서버 반영) | 외출을 이끄는 게 앱의 목적 |
| 확인되는 행동 (직접 찾아 적기·방문·방명록) | 크게 (30코인) | 실제 행동을 이끌기 위해 |
| 스스로 체크하는 가벼운 행동 (눈인사·물 한 모금) | 작게 (예: XP만) | 부담 없는 첫걸음은 남기되, 누르기만 해도 쌓이지 않게 |
| 단계가 높은 퀘스트 | 더 크게 | 어려운 단계에 도전할 동기 |
| 실패·미완료 | 없음 (벌점 없음) | 다시 시작하기 쉽게 |

## 5. 확인이 더 필요한 것

- 일본 후생노동성 지침의 4단계는 검색 결과로 확인했고 **원문은 아직 확인하지 못함**
- Gollwitzer·Sheeran 2006은 학술 데이터베이스에 초록이 없어 **연구 소개 자료로 확인**함
- 발표 자료에 쓰기 전 두 가지는 원문 확인 필요

## 참고 문헌

- Ekers D, Webster L, Van Straten A, Cuijpers P, Richards D, Gilbody S. Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis. *PLoS One*. 2014;9(6):e100100. [doi:10.1371/journal.pone.0100100](https://doi.org/10.1371/journal.pone.0100100)
- Aked J, Marks N, Cordon C, Thompson S. *Five Ways to Wellbeing*. New Economics Foundation; 2008. [neweconomics.org](https://neweconomics.org/2008/10/five-ways-to-wellbeing)
- Eilertsen M, et al. Wellbeing, mastery and work participation: Effects of the Five Ways to Wellbeing course — a randomized controlled trial. *Scand J Public Health*. 2026. [doi:10.1177/14034948261479465](https://doi.org/10.1177/14034948261479465)
- 厚生労働省. ひきこもりの評価・支援に関するガイドライン. 2010. — 참고: [三重県 ひきこもり相談支援マニュアル](https://www.pref.mie.lg.jp/common/content/001034521.pdf)
- Sandstrom GM, Dunn EW. Social Interactions and Well-Being: The Surprising Power of Weak Ties. *Pers Soc Psychol Bull*. 2014;40(7):910-922. [doi:10.1177/0146167214529799](https://doi.org/10.1177/0146167214529799)
- Epley N, Schroeder J. Mistakenly seeking solitude. *J Exp Psychol Gen*. 2014;143(5):1980-1999. [doi:10.1037/a0037323](https://doi.org/10.1037/a0037323)
- Curry OS, Rowland LA, Van Lissa CJ, Zlotowitz S, McAlaney J, Whitehouse H. Happy to help? A systematic review and meta-analysis of the effects of performing acts of kindness on the well-being of the actor. *J Exp Soc Psychol*. 2018;76:320-329. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0022103117303451)
- Gollwitzer PM, Sheeran P. Implementation intentions and goal achievement: A meta-analysis of effects and processes. *Adv Exp Soc Psychol*. 2006;38:69-119. [KOPS](https://kops.uni-konstanz.de/handle/123456789/10973)
- Masi CM, Chen HY, Hawkley LC, Cacioppo JT. A meta-analysis of interventions to reduce loneliness. *Pers Soc Psychol Rev*. 2011;15(3):219-266. [doi:10.1177/1088868310377394](https://doi.org/10.1177/1088868310377394)
