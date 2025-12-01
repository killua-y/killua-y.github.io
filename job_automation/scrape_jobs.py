import sys
import os
import csv
import json
from datetime import datetime, date

# Add the JobSpy directory to the python path so we can import it
# Use absolute path to be safe
current_dir = os.path.dirname(os.path.abspath(__file__))
jobspy_path = os.path.join(current_dir, 'JobSpy')
if jobspy_path not in sys.path:
    sys.path.append(jobspy_path)

print(f"Added {jobspy_path} to sys.path")

try:
    from jobspy import scrape_jobs
except ImportError as e:
    print(f"Error importing jobspy: {e}")
    print(f"Current sys.path: {sys.path}")
    print(f"Contents of {jobspy_path}:")
    try:
        print(os.listdir(jobspy_path))
    except Exception as list_err:
        print(f"Could not list dir: {list_err}")
    raise e

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
    
    output_file = os.path.join(output_dir, 'raw_jobs.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(jobs_dict, f, default=json_serial, indent=2, ensure_ascii=False)
        
    print(f"Saved jobs to {output_file}")

if __name__ == "__main__":
    scrape()
