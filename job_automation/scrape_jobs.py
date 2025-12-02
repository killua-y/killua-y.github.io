import sys
import os
import csv
import json
import pandas as pd
from datetime import datetime

# Add the JobSpy directory to the python path so we can import it
sys.path.append(os.path.join(os.path.dirname(__file__), 'JobSpy'))

from jobspy import scrape_jobs

def scrape():
    print("Starting job scrape...")
    
    # Define your search criteria here
    site_names = ["indeed", "linkedin"]
    
    # Explicitly add "Intern" to search terms to improve result quality
    # Some sites rely on the keyword more than the filter
    search_terms = [
        "Software Engineer Intern", 
        "SDE Intern", 
        "Machine Learning Engineer Intern",
        "Software Engineer Internship",
        "Machine Learning Internship"
    ]
    
    location = "United States" # or specific city
    results_wanted = 150 
    hours_old = 24 
    
    all_jobs = []

    for term in search_terms:
        print(f"Scraping for: {term}")
        try:
            jobs = scrape_jobs(
                site_name=site_names,
                search_term=term,
                location=location,
                results_wanted=results_wanted,
                hours_old=hours_old,
                country_indeed='USA',
                job_type='internship', # Filter for internships
                linkedin_fetch_description=True # Get full description from LinkedIn (slower but necessary)
            )
            print(f"Found {len(jobs)} jobs for {term}")
            all_jobs.append(jobs)
        except Exception as e:
            print(f"Error scraping for {term}: {e}")
    
    if not all_jobs:
        print("No jobs found.")
        return

    # Combine all results
    if not all_jobs:
        print("No jobs found.")
        return

    combined_jobs = pd.concat(all_jobs, ignore_index=True)
    
    # --- MANUAL FILTERING ---
    # Filter out jobs that are likely not internships based on title keywords
    # This is necessary because some sites (like iHire) spam listings with "Senior" roles 
    # even when searching for "Intern"
    
    exclusion_keywords = ["Senior", "Sr.", "Staff", "Principal", "Lead", "Manager", "Director", "VP", "Head of", "Architect"]
    
    def is_excluded(title):
        if not isinstance(title, str):
            return False
        title_lower = title.lower()
        # Check if any exclusion keyword is in the title (case-insensitive)
        for kw in exclusion_keywords:
            # Check word boundaries to avoid false positives (e.g. "Leader" vs "Lead")
            # Simple check: is the keyword present?
            if kw.lower() in title_lower:
                # Double check it's not "Senior Intern" (rare but possible)
                if "intern" not in title_lower and "co-op" not in title_lower:
                     return True
        return False

    # Also enforce that "Intern" or "Co-op" MUST be in the title
    # This is the "Strict Mode" for scraping results
    def is_intern_role(title):
        if not isinstance(title, str):
            return False
        t = title.lower()
        return "intern" in t or "co-op" in t or "trainee" in t or "student" in t

    # Apply filters
    if 'title' in combined_jobs.columns:
        # 1. Filter out excluded seniority levels
        mask_excluded = combined_jobs['title'].apply(is_excluded)
        combined_jobs = combined_jobs[~mask_excluded]
        
        # 2. Enforce "Intern" keyword in title (Strict Mode)
        mask_intern = combined_jobs['title'].apply(is_intern_role)
        combined_jobs = combined_jobs[mask_intern]
        
    print(f"After strict keyword filtering: {len(combined_jobs)} jobs.")

    # Remove duplicates based on job_url
    if 'job_url' in combined_jobs.columns:
        combined_jobs = combined_jobs.drop_duplicates(subset=['job_url'])
    else:
        combined_jobs = combined_jobs.drop_duplicates(subset=['title', 'company'])
        
    print(f"Total unique jobs found: {len(combined_jobs)}")
    
    # Ensure the output directory exists
    output_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as JSON for the AI step
    jobs_dict = combined_jobs.to_dict(orient='records')
    
    def json_serial(obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return str(obj)

    from datetime import date
    
    output_file = os.path.join(output_dir, 'raw_jobs.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(jobs_dict, f, default=json_serial, indent=2, ensure_ascii=False)
        
    print(f"Saved jobs to {output_file}")

if __name__ == "__main__":
    scrape()
