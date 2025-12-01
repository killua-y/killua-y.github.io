import sys
import os
import pandas as pd
import json
from datetime import datetime

# Add the JobSpy directory to the python path
current_dir = os.path.dirname(os.path.abspath(__file__))
jobspy_path = os.path.join(current_dir, 'JobSpy')
if jobspy_path not in sys.path:
    sys.path.append(jobspy_path)

# Import scrape logic from scrape_jobs.py
sys.path.append(current_dir)
from scrape_jobs import scrape

# Import processing logic
from process_jobs import filter_and_summarize_jobs, generate_markdown, load_jobs

def test_full_flow_reuse_logic():
    print("🚀 Starting FULL local test (Reusing scrape_jobs.py logic)...")
    
    # 1. Run Scrape (Using the exact logic from scrape_jobs.py)
    # This function saves the result to data/raw_jobs.json
    print("\n--- Step 1: Running scrape_jobs.py ---")
    scrape()
    
    # 2. AI Filter & Markdown Generation
    # We can verify the output by checking the generated file
    raw_jobs_path = os.path.join(current_dir, 'data', 'raw_jobs.json')
    
    if not os.path.exists(raw_jobs_path):
        print("❌ Error: data/raw_jobs.json was not created.")
        return

    # Load the jobs that were just scraped
    jobs = load_jobs(raw_jobs_path)
    print(f"\n✅ Scrape finished. Loaded {len(jobs)} jobs from {raw_jobs_path}")
    
    if len(jobs) == 0:
        print("No jobs found to process.")
        return

    print(f"\n--- Step 2: AI Filtering (sending {len(jobs)} jobs to OpenAI) ---")
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ Error: OPENAI_API_KEY not set in environment variables.")
        print("Please export OPENAI_API_KEY='sk-...' in your terminal before running.")
        return

    filtered_jobs = filter_and_summarize_jobs(jobs)
    
    # Apply post-processing filtering logic (Top 20, Score >= 70)
    high_score_jobs = [j for j in filtered_jobs if j.get("relevance_score", 0) >= 70]
    high_score_jobs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    final_jobs = high_score_jobs[:20]
    
    print(f"✅ AI returned {len(filtered_jobs)} jobs.")
    print(f"✅ After filtering (Score >= 70): {len(high_score_jobs)} jobs.")
    print(f"✅ Final list (Top 20): {len(final_jobs)} jobs.")

    if not final_jobs:
        print("No relevant jobs found after AI filtering.")
        return

    # 3. Generate Markdown
    output_filename = f"TEST_FULL_REUSE_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.md"
    output_path = os.path.join(current_dir, output_filename)
    
    print(f"\n--- Step 3: Generating Markdown ---")
    generate_markdown(final_jobs, output_path)
    
    print(f"\n🎉 Success! Markdown file generated at:")
    print(f"👉 {output_path}")

if __name__ == "__main__":
    test_full_flow_reuse_logic()
