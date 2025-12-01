import json
import os
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found in environment variables.")

# User Profile - customize this!
USER_PROFILE = """
I am a Software Engineer with 3 years of experience in Python and React.
I am looking for full-stack or backend roles.
I prefer remote work or locations in the SF Bay Area.
I am interested in AI, Machine Learning, and Web Development.
"""

def load_jobs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def filter_and_summarize_jobs(jobs):
    if not OPENAI_API_KEY:
        return []

    client = OpenAI(api_key=OPENAI_API_KEY)

    # Prepare the jobs for the prompt (simplify to save tokens if needed)
    jobs_data = []
    for job in jobs:
        jobs_data.append({
            "id": job.get("job_url", ""), # Use URL as ID
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "description": job.get("description", "")[:1000] # Truncate description
        })

    prompt = f"""
    You are a career assistant. I will provide a list of job postings.
    Based on my profile, please:
    1. Filter out jobs that are completely irrelevant or require significantly more experience than I have.
    2. For the relevant jobs, provide a brief summary, a relevance score (0-100), and the reason for the score.
    3. Return the result as a JSON list.

    My Profile:
    {USER_PROFILE}

    Job List:
    {json.dumps(jobs_data)}

    Output Format (JSON list of objects):
    [
        {{
            "job_url": "...",
            "title": "...",
            "company": "...",
            "summary": "...",
            "relevance_score": 85,
            "reason": "..."
        }}
    ]
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful career assistant that filters job listings and outputs JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content
        
        # The response_format="json_object" usually ensures valid JSON, but we parse it safely
        # Note: With response_format={"type": "json_object"}, the model might wrap the list in a key like "jobs": [...]
        # We need to handle that or instruct it more clearly. 
        # Or we can just parse what we get.
        
        data = json.loads(content)
        
        # Handle if the model wrapped the list in a key
        if isinstance(data, dict):
            # Look for the first list value
            for key, value in data.items():
                if isinstance(value, list):
                    return value
            # If no list found, maybe it returned a single object? Return empty list as fallback
            return []
            
        return data
        
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return []

def generate_markdown(filtered_jobs, output_path):
    # Sort by relevance score
    filtered_jobs.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"# Daily Job Picks - {datetime.now().strftime('%Y-%m-%d')}\n\n")
        
        if not filtered_jobs:
            f.write("No relevant jobs found today.\n")
            return

        for job in filtered_jobs:
            f.write(f"## [{job.get('title', 'Unknown Title')}]({job.get('job_url', '#')})\n")
            f.write(f"**Company:** {job.get('company', 'Unknown')} | **Score:** {job.get('relevance_score', 0)}/100\n\n")
            f.write(f"**Reason:** {job.get('reason', 'No reason provided')}\n\n")
            f.write(f"**Summary:** {job.get('summary', 'No summary provided')}\n\n")
            f.write("---\n\n")

    print(f"Markdown generated at {output_path}")

def main():
    raw_jobs_path = os.path.join(os.path.dirname(__file__), 'data', 'raw_jobs.json')
    output_md_path = os.path.join(os.path.dirname(__file__), '..', '_posts', f"{datetime.now().strftime('%Y-%m-%d')}-daily-jobs.md")
    
    # Ensure _posts directory exists (Jekyll standard)
    os.makedirs(os.path.dirname(output_md_path), exist_ok=True)

    if not os.path.exists(raw_jobs_path):
        print("No raw jobs found. Run scrape_jobs.py first.")
        return

    jobs = load_jobs(raw_jobs_path)
    print(f"Loaded {len(jobs)} raw jobs.")

    # For testing, limit to first 20 to avoid huge prompts if many jobs
    filtered_jobs = filter_and_summarize_jobs(jobs[:20]) 
    
    if filtered_jobs:
        generate_markdown(filtered_jobs, output_md_path)
    else:
        print("No filtered jobs returned.")

if __name__ == "__main__":
    main()
