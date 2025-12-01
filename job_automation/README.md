# Job Automation Setup

This directory contains the scripts to scrape jobs, filter them with AI (OpenAI), and post them to your website.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configure Environment**:
    - Create a `.env` file in this directory (or set environment variables).
    - Add your OpenAI API Key:
      ```
      OPENAI_API_KEY=sk-...
      ```

3.  **Customize Search**:
    - Edit `scrape_jobs.py` to change keywords, location, and sites.
    - Edit `process_jobs.py` to update `USER_PROFILE` with your specific background and preferences.

## Usage

1.  **Scrape Jobs**:
    ```bash
    python scrape_jobs.py
    ```
    This saves jobs to `data/raw_jobs.json`.

2.  **Process with AI**:
    ```bash
    python process_jobs.py
    ```
    This reads the JSON, calls OpenAI GPT-4o-mini, and outputs a Markdown file to `../_posts/`.

## GitHub Actions Automation

A workflow file has been created at `.github/workflows/daily_job_automation.yml`.

**Crucial Step:**
You must go to your GitHub Repository -> Settings -> Secrets and variables -> Actions, and create a new Repository Secret named `OPENAI_API_KEY` with your actual API key.

The workflow is scheduled to run every weekday at 8:00 AM UTC.
