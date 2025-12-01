import sys
import os
import csv
import json
from datetime import datetime

# Add the JobSpy directory to the python path so we can import it
sys.path.append(os.path.join(os.path.dirname(__file__), 'JobSpy'))

from jobspy import scrape_jobs

def scrape():
    print("Starting job scrape...")
    
    # Define your search criteria here
    # You can customize these lists
    site_names = ["linkedin", "indeed", "glassdoor", "google"]
    search_term = "Software Engineer"
    location = "United States" # or specific city
    results_wanted = 20 # Adjust as needed (user mentioned 100-200 initially, keeping low for test)
    hours_old = 24 # Only last 24 hours
    
    jobs = scrape_jobs(
        site_name=site_names,
        search_term=search_term,
        location=location,
        results_wanted=results_wanted,
        hours_old=hours_old,
        country_indeed='USA',
        
        # Optional: filtering
        # is_remote=True,
        # job_type='fulltime',
    )
    
    print(f"Found {len(jobs)} jobs")
    
    # Ensure the output directory exists
    output_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as JSON for the AI step
    # Convert date objects to string for JSON serialization
    jobs_dict = jobs.to_dict(orient='records')
    
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

