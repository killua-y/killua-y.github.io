import json
import os
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# =========================
# Configuration
# =========================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found in environment variables.")

# 根据你现在的简历 & 求职偏好写的 Profile
USER_PROFILE = """
I am a Computer Science master's student with strong software engineering and machine learning experience.

Education:
- M.S. in Computer Science at USC (2025–2027)
- Previous M.S. in Computer Science at Northeastern University (2021–2025)

Experience:
- Machine Learning Engineer on a real-time bidding (RTB) engine: built high-throughput services with Flink/Kafka/Redis, online feature pipelines, CTR/CVR models, and reinforcement-learning-based bidding (PPO, DDPG, TD3, contextual bandits).
- Backend Software Engineer using Java/Spring Boot and MySQL: designed REST APIs, refactored services into controller/service/repository layers, implemented idempotent upserts, and improved reliability and performance.

Projects:
- Large-scale customer vectorization and segmentation engine using sequence models and contrastive learning, with real-time APIs for recommendations and analytics.
- Full-stack Q&A web app with React/Node/MongoDB, JWT auth, WebSockets, and OpenAI integration (semantic search, personalized recommendations using embeddings).

Skills:
- Languages: Python, Java, JavaScript/TypeScript, C/C++, SQL
- Backend & Systems: Spring Boot, Node.js/Express, REST APIs, Redis, Kafka, Flink, MongoDB, MySQL
- Machine Learning & AI: PyTorch, TensorFlow, recommender systems, embeddings, reinforcement learning
- DevOps & Cloud: Docker, Kubernetes, AWS, CI/CD

Job preferences:
- Roles: Machine Learning Engineer, ML Engineer, MLOps Engineer, Backend Engineer, or Full-Stack Engineer (backend-heavy).
- I prefer positions related to AI, recommender systems, data platforms, ads/RTB, or infrastructure for ML/AI products.
- I am early-career (about 0–3 years of full-time experience).
- I am currently in Irvine, CA and open to relocate or work remotely within the United States.

IMPORTANT:
- I am strictly looking for INTERNSHIP positions (Intern, Co-op, etc). 
- DO NOT show me full-time roles.
"""

# 你可以在这里改模型，比如改成 "gpt-5-mini"
OPENAI_MODEL = "gpt-4.1-mini"


# =========================
# Helpers
# =========================

def load_jobs(filepath: str):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def filter_and_summarize_jobs(jobs):
    """
    调用 OpenAI 模型：
    - 按你的 Profile 过滤岗位
    - 对保留岗位做摘要 + 打分 + 给出理由
    - 返回一个列表，每个元素是一个 job dict
    """
    if not OPENAI_API_KEY:
        print("No OPENAI_API_KEY, skip filtering.")
        return []

    client = OpenAI(api_key=OPENAI_API_KEY)

    # 准备简化后的 job 数据，减少 token 消耗
    jobs_data = []
    for job in jobs:
        jobs_data.append(
            {
                "job_url": job.get("job_url", ""),  # 用 URL 当作 ID
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                # 描述截断，避免太长，处理非字符串类型（如 NaN/float）
                "description": str(job.get("description") or "")[:1000],
                "job_type": job.get("job_type", "unknown") # 显式传递job_type
            }
        )

    prompt = f"""
You are a career assistant that filters and scores job postings for me.

I will give you:
- My profile
- A list of job postings (as JSON)

Your tasks:
1. Read my profile and understand my skills, experience, and preferences.
2. Go through each job and:
   - **CRITICAL**: Filter out ANY job that is NOT an internship or co-op. I am ONLY looking for INTERNSHIPS. If the title or description doesn't explicitly mention "intern", "internship", or "co-op", DISCARD IT.
   - Filter out jobs that are clearly irrelevant to my profile or require much more senior experience than I have.
   - For relevant jobs, produce:
     - A short 1–3 sentence summary focusing on responsibilities and tech stack.
     - A relevance_score between 0 and 100 (higher means better fit).
     - A brief reason explaining why you gave this score (mention skills, experience, location, seniority, etc.).
3. Be strict about JSON format. Do NOT include any explanation outside of JSON.

Important instructions:
- **STRICTLY INTERNSHIPS ONLY**: If the job title does not contain "Intern", "Internship", or "Co-op", score it 0 and exclude it from the final list.
- Consider my experience level (early-career / about 0–3 years of full-time experience).
- Prefer roles that match my skills (backend, large-scale systems, ML/AI) and my interests (AI, recommender systems, ads/RTB, data platforms, etc.).
- If a job is clearly for very senior staff (e.g., 8+ years experience, principal, staff, director), give it a very low score or simply exclude it.
- If the job is somewhat related but not ideal, you can still include it with a medium score (e.g., 50–70) and explain why.

My Profile:
{USER_PROFILE}

Job List (JSON array):
{json.dumps(jobs_data, ensure_ascii=False)}

Output format:
Return a single JSON object with exactly one key "jobs" whose value is a list of job objects.

Each job object should look like this:
{{
  "job_url": "string",
  "title": "string",
  "company": "string",
  "location": "string",
  "summary": "string",
  "relevance_score": 0,
  "reason": "string"
}}

Rules:
- Only include relevant or somewhat relevant jobs in the "jobs" list.
- Do NOT include jobs that are completely irrelevant.
- **ABSOLUTELY NO FULL-TIME ROLES**.
- Do NOT add any extra keys outside the ones specified.
- Do NOT write any text outside the JSON object.
"""

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful career assistant that filters job listings and outputs JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            # 强制返回 JSON 对象
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        # 解析 JSON
        data = json.loads(content)

        if not isinstance(data, dict):
            print("Unexpected JSON format (not an object).")
            return []

        jobs_list = data.get("jobs", [])
        if not isinstance(jobs_list, list):
            print("Unexpected JSON format: 'jobs' is not a list.")
            return []

        return jobs_list

    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return []


def generate_markdown(filtered_jobs, output_path: str):
    """
    把过滤后的岗位写成 Markdown，
    按 relevance_score 从高到低排序。
    """
    filtered_jobs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"# Daily Job Picks - {datetime.now().strftime('%Y-%m-%d')}\n\n")

        if not filtered_jobs:
            f.write("No relevant jobs found today.\n")
            return

        for job in filtered_jobs:
            title = job.get("title", "Unknown Title")
            url = job.get("job_url", "#")
            company = job.get("company", "Unknown")
            location = job.get("location", "Unknown Location")
            score = job.get("relevance_score", 0)
            reason = job.get("reason", "No reason provided")
            summary = job.get("summary", "No summary provided")

            f.write(f"## [{title}]({url})\n")
            f.write(
                f"**Company:** {company} | **Location:** {location} | **Score:** {score}/100\n\n"
            )
            f.write(f"**Reason:** {reason}\n\n")
            f.write(f"**Summary:** {summary}\n\n")
            f.write("---\n\n")

    print(f"Markdown generated at {output_path}")


def main():
    # raw_jobs.json 路径（爬虫的输出）
    raw_jobs_path = os.path.join(
        os.path.dirname(__file__), "data", "raw_jobs.json"
    )

    # 输出到 Jekyll 标准 _posts 目录
    output_md_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "_posts",
        f"{datetime.now().strftime('%Y-%m-%d')}-daily-jobs.md",
    )

    # 确保 _posts 目录存在
    os.makedirs(os.path.dirname(output_md_path), exist_ok=True)

    if not os.path.exists(raw_jobs_path):
        print("No raw jobs found. Run scrape_jobs.py first.")
        return

    jobs = load_jobs(raw_jobs_path)
    print(f"Loaded {len(jobs)} raw jobs.")

    # 处理全部岗位
    filtered_jobs = filter_and_summarize_jobs(jobs)

    # 按分数排序，只保留前 20 个
    filtered_jobs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    filtered_jobs = filtered_jobs[:20]

    if filtered_jobs:
        print(f"Got {len(filtered_jobs)} filtered jobs.")
        generate_markdown(filtered_jobs, output_md_path)
    else:
        print("No filtered jobs returned.")


if __name__ == "__main__":
    main()
