import sys
import os
import pandas as pd

# Add the JobSpy directory to the python path so we can import it
current_dir = os.path.dirname(os.path.abspath(__file__))
jobspy_path = os.path.join(current_dir, 'JobSpy')
if jobspy_path not in sys.path:
    sys.path.append(jobspy_path)

from jobspy import scrape_jobs

def test_local():
    print("🚀 Starting local test scrape...")
    
    # 1. Configuration
    # We test with one search term to keep it fast, but check all sites
    site_names = ["linkedin", "indeed", "glassdoor", "google"]
    search_term = "Software Engineer Intern"
    location = "United States" 
    results_wanted = 20 # Small number for quick testing
    hours_old = 72 # 3 days window to ensure we get results if sites are working
    
    print(f"Target Sites: {site_names}")
    print(f"Search: '{search_term}' in '{location}'")
    print(f"Max Results per site: {results_wanted}")
    
    # 2. Run Scrape
    try:
        jobs = scrape_jobs(
            site_name=site_names,
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            hours_old=hours_old,
            country_indeed='USA',
            job_type='internship'
        )
        
        # 3. Analyze Results
        print(f"\n✅ Scrape complete. Found {len(jobs)} jobs.")
        
        if len(jobs) > 0:
            print("\n📊 Site Distribution (Count per website):")
            print(jobs['site'].value_counts())
            
            print("\n👀 First 5 Jobs found:")
            # Set pandas display options to show full content
            pd.set_option('display.max_columns', None)
            pd.set_option('display.width', 1000)
            pd.set_option('display.max_colwidth', 50)
            print(jobs[['site', 'title', 'company', 'job_url']].head(5))
        else:
            print("❌ No jobs found. This might be due to rate limiting (especially LinkedIn) or strict filtering.")
            
    except Exception as e:
        print(f"❌ Error during scraping: {e}")

if __name__ == "__main__":
    test_local()

