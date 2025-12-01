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
    # You can customize these lists
    site_names = ["linkedin", "indeed", "glassdoor", "google"]
    
    # List of search terms
    search_terms = ["Software Engineer", "SDE", "Machine Learning Engineer"]
    
    location = "United States" # or specific city
    results_wanted = 70 # Adjust as needed
    hours_old = 24 # Only last 24 hours
    
    all_jobs = []

    for term in search_terms:
        print(f"Scraping for: {term} (Internship)")
        try:
            jobs = scrape_jobs(
                site_name=site_names,
                search_term=term,
                location=location,
                results_wanted=results_wanted,
                hours_old=hours_old,
                country_indeed='USA',
                job_type='internship', # Filter for internships
            )
            print(f"Found {len(jobs)} jobs for {term}")
            all_jobs.append(jobs)
        except Exception as e:
            print(f"Error scraping for {term}: {e}")
    
    if not all_jobs:
        print("No jobs found.")
        return

    # Combine all results
    combined_jobs = pd.concat(all_jobs, ignore_index=True)
    
    # Remove duplicates based on job_url (or description/title if url differs)
    # Using job_url is safest if available, but sometimes urls differ slightly. 
    # Let's drop duplicates by 'id' if it exists or 'job_url' or subset of fields
    if 'job_url' in combined_jobs.columns:
        combined_jobs = combined_jobs.drop_duplicates(subset=['job_url'])
    else:
        # Fallback to title + company as uniqueness check
        combined_jobs = combined_jobs.drop_duplicates(subset=['title', 'company'])
        
    print(f"Total unique jobs found: {len(combined_jobs)}")
    
    # Ensure the output directory exists
    output_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as JSON for the AI step
    # Convert date objects to string for JSON serialization
    jobs_dict = combined_jobs.to_dict(orient='records')
    
    # Helper to handle non-serializable objects (like dates)
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
